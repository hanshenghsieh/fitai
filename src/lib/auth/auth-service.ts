'use client'

import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import type { Session, User } from '@supabase/supabase-js'
import { configureAppleIap } from '@/lib/apple-iap-client'
import { clearUserLocalState } from '@/lib/clear-user-local-state'
import { createClient, isCapacitorNative } from '@/lib/supabase/client'

export const NATIVE_AUTH_CALLBACK_URL = 'betterbit://auth/callback'

type OAuthProvider = 'google' | 'apple'

interface AppleAuthPlugin {
  signIn(): Promise<{
    identityToken?: string
    rawNonce?: string
    userIdentifier?: string
    givenName?: string | null
    familyName?: string | null
  }>
  getCredentialState(options: {
    userIdentifier: string
  }): Promise<{ state: 'authorized' | 'revoked' | 'not_found' | 'transferred' | 'unknown' }>
  addListener(
    eventName: 'credentialRevoked',
    listener: () => void
  ): Promise<PluginListenerHandle>
}

export interface AuthCompletion {
  session: Session
  user: User
  onboardingCompleted: boolean
  nextPath: '/dashboard' | '/onboarding'
}

export class AuthCancelledError extends Error {
  constructor(message = '登入已取消') {
    super(message)
    this.name = 'AuthCancelledError'
  }
}

const AppleAuth = registerPlugin<AppleAuthPlugin>('AppleAuth')
const callbackPromises = new Map<string, Promise<AuthCompletion>>()

let pendingNativeOAuth:
  | {
      resolve: (completion: AuthCompletion) => void
      reject: (error: Error) => void
      removeBrowserListener?: () => Promise<void>
    }
  | undefined

function isCancellation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /cancel|canceled|cancelled|user_cancel|1001/i.test(message)
}

function displayNameFor(user: User, explicitName?: string): string {
  const metadata = user.user_metadata ?? {}
  const candidate =
    explicitName ||
    metadata.full_name ||
    metadata.name ||
    [metadata.given_name, metadata.family_name].filter(Boolean).join(' ')
  return typeof candidate === 'string' ? candidate.trim() : ''
}

async function configureRevenueCat(userId: string): Promise<void> {
  try {
    await configureAppleIap(userId)
  } catch (error) {
    // Authentication must remain usable if the optional purchase SDK is unavailable.
    console.error('[AUTH] RevenueCat configuration failed', error)
  }
}

export async function ensureUserProfile(
  user: User,
  explicitName?: string
): Promise<{ onboardingCompleted: boolean }> {
  const supabase = createClient()
  const { data: existing, error: selectError } = await supabase
    .from('user_profiles')
    .select('display_name, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) throw selectError

  const nonBlankName = displayNameFor(user, explicitName)
  if (!existing) {
    const { data: created, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        display_name: nonBlankName || null,
        onboarding_completed: false,
      })
      .select('onboarding_completed')
      .single()
    if (insertError) throw insertError
    return { onboardingCompleted: Boolean(created.onboarding_completed) }
  }

  if (!existing.display_name?.trim() && nonBlankName) {
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ display_name: nonBlankName })
      .eq('id', user.id)
    if (updateError) throw updateError
  }

  return { onboardingCompleted: Boolean(existing.onboarding_completed) }
}

async function verifyAndComplete(
  expectedSession?: Session | null,
  explicitName?: string
): Promise<AuthCompletion> {
  const supabase = createClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session || (expectedSession && session.user.id !== expectedSession.user.id)) {
    throw new Error('登入連線未建立，請再試一次。')
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user || user.id !== session.user.id) {
    throw new Error('無法驗證登入身分，請再試一次。')
  }

  clearUserLocalState()
  const { onboardingCompleted } = await ensureUserProfile(user, explicitName)
  await configureRevenueCat(user.id)

  return {
    session,
    user,
    onboardingCompleted,
    nextPath: onboardingCompleted ? '/dashboard' : '/onboarding',
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthCompletion> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return verifyAndComplete(data.session)
}

async function startOAuth(provider: OAuthProvider): Promise<AuthCompletion | null> {
  const supabase = createClient()
  const native = isCapacitorNative()
  const redirectTo = native
    ? NATIVE_AUTH_CALLBACK_URL
    : `${window.location.origin}/auth/callback`
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: native,
    },
  })
  if (error) throw error

  if (!native) return null
  if (!data.url) throw new Error('登入服務未提供授權網址。')
  if (pendingNativeOAuth) throw new Error('另一個登入流程仍在進行。')

  return new Promise<AuthCompletion>(async (resolve, reject) => {
    const browserListener = await Browser.addListener('browserFinished', () => {
      if (!pendingNativeOAuth) return
      pendingNativeOAuth = undefined
      reject(new AuthCancelledError())
    })
    pendingNativeOAuth = {
      resolve,
      reject,
      removeBrowserListener: () => browserListener.remove(),
    }
    try {
      await Browser.open({ url: data.url! })
    } catch (openError) {
      pendingNativeOAuth = undefined
      await browserListener.remove()
      reject(openError instanceof Error ? openError : new Error('無法開啟登入頁面。'))
    }
  })
}

export function signInWithGoogle(): Promise<AuthCompletion | null> {
  return startOAuth('google')
}

export async function signInWithApple(): Promise<AuthCompletion | null> {
  if (!isCapacitorNative()) return startOAuth('apple')
  if (!Capacitor.isPluginAvailable('AppleAuth')) {
    throw new Error('此版本未安裝 Apple 登入模組，請更新 App 後再試。')
  }

  try {
    const credential = await AppleAuth.signIn()
    if (!credential.identityToken || !credential.rawNonce) {
      throw new Error('Apple 未回傳完整登入憑證。')
    }
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: credential.rawNonce,
    })
    if (error) throw error
    if (credential.userIdentifier) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { apple_user_identifier: credential.userIdentifier },
      })
      if (metadataError) throw metadataError
    }
    const name = [credential.givenName, credential.familyName].filter(Boolean).join(' ')
    return verifyAndComplete(data.session, name)
  } catch (error) {
    if (isCancellation(error)) throw new AuthCancelledError()
    throw error
  }
}

export async function completeOAuthCallback(url: string): Promise<AuthCompletion> {
  const existing = callbackPromises.get(url)
  if (existing) return existing

  const operation = (async () => {
    const parsed = new URL(url)
    const oauthError =
      parsed.searchParams.get('error_description') || parsed.searchParams.get('error')
    if (oauthError) {
      if (isCancellation(oauthError)) throw new AuthCancelledError()
      throw new Error(oauthError)
    }

    const code = parsed.searchParams.get('code')
    if (!code) throw new Error('登入回呼缺少授權碼。')
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return verifyAndComplete(data.session)
  })()

  callbackPromises.set(url, operation)
  try {
    const completion = await operation
    if (pendingNativeOAuth) {
      const pending = pendingNativeOAuth
      pendingNativeOAuth = undefined
      await pending.removeBrowserListener?.()
      pending.resolve(completion)
    }
    return completion
  } catch (error) {
    if (pendingNativeOAuth) {
      const pending = pendingNativeOAuth
      pendingNativeOAuth = undefined
      await pending.removeBrowserListener?.()
      pending.reject(error instanceof Error ? error : new Error('登入失敗'))
    }
    throw error
  } finally {
    if (isCapacitorNative()) await Browser.close().catch(() => undefined)
  }
}

export async function restoreSession(): Promise<AuthCompletion | null> {
  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw error
  if (!session) return null
  const appleUserIdentifier = session.user.user_metadata?.apple_user_identifier
  const usesApple =
    session.user.app_metadata?.provider === 'apple' ||
    session.user.identities?.some(identity => identity.provider === 'apple')
  if (
    usesApple &&
    typeof appleUserIdentifier === 'string' &&
    appleUserIdentifier &&
    isCapacitorNative() &&
    Capacitor.isPluginAvailable('AppleAuth')
  ) {
    const { state } = await AppleAuth.getCredentialState({
      userIdentifier: appleUserIdentifier,
    })
    if (state === 'revoked' || state === 'not_found' || state === 'transferred') {
      await signOut()
      return null
    }
  }
  return verifyAndComplete(session)
}

export async function listenForAppleCredentialRevocation(
  listener: () => void
): Promise<PluginListenerHandle | null> {
  if (!isCapacitorNative() || !Capacitor.isPluginAvailable('AppleAuth')) return null
  return AppleAuth.addListener('credentialRevoked', listener)
}

export async function signOut(): Promise<void> {
  const supabase = createClient()
  clearUserLocalState()
  try {
    const { logOutAppleIap } = await import('@/lib/apple-iap-client')
    await logOutAppleIap()
  } catch (error) {
    // Supabase logout is the security boundary and must still complete.
    console.error('[AUTH] RevenueCat logout failed', error)
  }
  const { error } = await supabase.auth.signOut()
  clearUserLocalState()
  if (error) throw error
}

export async function getNativeLaunchUrl(): Promise<string | null> {
  if (!isCapacitorNative()) return null
  const launch = await App.getLaunchUrl()
  return launch?.url ?? null
}
