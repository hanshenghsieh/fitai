'use client'

import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { isCapacitorNative, isNativeIOS } from '@/lib/capacitor-native'
import { installCapacitorIOSShell, remeasureCapacitorSafeAreas } from '@/lib/capacitor-ios-shell'

const IOS_PLATFORM_COOKIE = 'bb_native_ios=1; path=/; max-age=31536000; SameSite=Lax'

function markNativeIosCookie() {
  if (!isNativeIOS()) return
  document.cookie = IOS_PLATFORM_COOKIE
}

function isWebViewLoadError(): boolean {
  if (typeof document === 'undefined') return false
  const text = document.body?.innerText ?? ''
  return /couldn't load/i.test(text) || /Reload to try again/i.test(text)
}

function recoverWebViewIfNeeded() {
  if (!isWebViewLoadError()) return
  window.location.replace(`${window.location.origin}/dashboard`)
}

export default function CapacitorShell() {
  useEffect(() => {
    if (!isCapacitorNative()) return

    markNativeIosCookie()
    const removeIOSShell = installCapacitorIOSShell()

    void (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true })
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: '#FFF9F2' })
      } catch {
        /* native plugin optional */
      }
      remeasureCapacitorSafeAreas()
    })()

    let removeBackListener: (() => void) | undefined
    let removeStateListener: (() => void) | undefined

    void App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        void App.exitApp()
      }
    }).then(handle => {
      removeBackListener = () => void handle.remove()
    })

    const onResume = () => {
      remeasureCapacitorSafeAreas()
      window.setTimeout(recoverWebViewIfNeeded, 250)
    }

    if (isNativeIOS()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) onResume()
      }).then(handle => {
        removeStateListener = () => void handle.remove()
      })
    }

    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('pageshow', onResume)

    return () => {
      removeBackListener?.()
      removeStateListener?.()
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('pageshow', onResume)
      removeIOSShell()
    }
  }, [])

  return null
}
