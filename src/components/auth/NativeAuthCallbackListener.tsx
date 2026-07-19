'use client'

import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { toast } from 'sonner'
import {
  AuthCancelledError,
  completeOAuthCallback,
  getNativeLaunchUrl,
  listenForAppleCredentialRevocation,
  NATIVE_AUTH_CALLBACK_URL,
  signOut,
} from '@/lib/auth/auth-service'
import { isCapacitorNative } from '@/lib/supabase/client'

let handledCallbackUrl: string | null = null

function isAuthCallback(url: string): boolean {
  return url.startsWith(NATIVE_AUTH_CALLBACK_URL)
}

async function handleCallback(url: string): Promise<void> {
  if (!isAuthCallback(url) || handledCallbackUrl === url) return
  handledCallbackUrl = url
  try {
    const completion = await completeOAuthCallback(url)
    window.location.assign(`${completion.nextPath}?login=1`)
  } catch (error) {
    handledCallbackUrl = null
    if (error instanceof AuthCancelledError) return
    toast.error(error instanceof Error ? error.message : '登入失敗，請再試一次。')
  }
}

export default function NativeAuthCallbackListener() {
  useEffect(() => {
    if (!isCapacitorNative()) return

    let disposed = false
    const listenerPromise = App.addListener('appUrlOpen', event => {
      if (!disposed) void handleCallback(event.url)
    })
    const revocationListenerPromise = listenForAppleCredentialRevocation(() => {
      if (disposed) return
      void signOut().finally(() => {
        toast.error('Apple 登入憑證已失效，請重新登入。')
        window.location.replace('/login')
      })
    })

    void getNativeLaunchUrl().then(url => {
      if (!disposed && url) void handleCallback(url)
    })

    return () => {
      disposed = true
      void listenerPromise.then(listener => listener.remove())
      void revocationListenerPromise.then(listener => listener?.remove())
    }
  }, [])

  return null
}
