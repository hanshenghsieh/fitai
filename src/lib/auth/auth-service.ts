'use client'

import { App } from '@capacitor/app'
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

interface GoogleAuthPlugin {
  getConfiguration(): Promise<{
    platform: string
    bundleId: string
    iosClientIdPresent: boolean
    iosClientIdSuffix: string
    serverClientIdPresent: boolean
    serverClientIdSuffix: string
    reversedSchemePresent: boolean
  }>
  signIn(options: {
    nonce: string
  }): Promise<{
    identityToken?: string
    email?: string
    name?: string
  }>
  signOut(): Promise<void>
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
const GoogleAuth = registerPlugin<GoogleAuthPlugin>('GoogleAuth')
const callbackPromises = new Map<string, Promise<AuthCompletion>>()

function createOidcNonce(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

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

async function startWebOAuth(provider: OAuthProvider): Promise<null> {
  if (isCapacitorNative()) {
    throw new Error(`${provider} 原生登入不可使用網頁 OAuth。`)
  }
  const supabase = createClient()
  const redirectTo = `${window.location.origin}/auth/callback`
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  })
  if (error) throw error
  if (!data.url) throw new Error('登入服務未提供授權網址。')
  return null
}

export async function signInWithGoogle(): Promise<AuthCompletion | null> {
  const platform = Capacitor.getPlatform()
  const native = isCapacitorNative()
  const pluginAvailable = Capacitor.isPluginAvailable('GoogleAuth')
  console.info('[GOOGLE_AUTH_PLATFORM]', { platform, native })
  console.info('[GOOGLE_NATIVE_PLUGIN_AVAILABLE]', { available: pluginAvailable })

  if (!native) {
    console.info('[GOOGLE_AUTH_PATH]', { path: 'web-supabase-oauth' })
    return startWebOAuth('google')
  }

  console.info('[GOOGLE_AUTH_PATH]', { path: 'native-google-signin-bridge' })
  if (!pluginAvailable) {
    throw new Error('此版本未安裝 Google 原生登入模組，請更新 App 後再試。')
  }

  try {
    const runtimeConfig = await GoogleAuth.getConfiguration()
    console.info('[GOOGLE_CONFIG_RUNTIME]', runtimeConfig)
    if (
      runtimeConfig.platform !== 'ios' ||
      runtimeConfig.bundleId !== 'app.fitai.betterbit' ||
      !runtimeConfig.iosClientIdPresent ||
      !runtimeConfig.serverClientIdPresent ||
      !runtimeConfig.reversedSchemePresent
    ) {
      throw new Error('Google iOS 登入設定不完整，請重新安裝最新版本後再試。')
    }
    const nonce = createOidcNonce()
    const credential = await GoogleAuth.signIn({ nonce })
    if (!credential.identityToken) {
      throw new Error('Google 未回傳有效的 ID token。')
    }
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential.identityToken,
      nonce,
    })
    if (error) throw error
    return verifyAndComplete(data.session, credential.name)
  } catch (error) {
    if (isCancellation(error)) throw new AuthCancelledError()
    throw error
  }
}

export async function signInWithApple(): Promise<AuthCompletion | null> {
  if (!isCapacitorNative()) return startWebOAuth('apple')
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
    return await operation
  } finally {
    callbackPromises.delete(url)
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
  if (isCapacitorNative() && Capacitor.isPluginAvailable('GoogleAuth')) {
    await GoogleAuth.signOut().catch(error => {
      console.error('[AUTH] Google native logout failed', error)
    })
  }
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
