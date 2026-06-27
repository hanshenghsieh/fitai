'use client'

import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { isCapacitorNative } from '@/lib/capacitor-native'
import { installCapacitorIOSShell, remeasureCapacitorSafeAreas } from '@/lib/capacitor-ios-shell'

export default function CapacitorShell() {
  useEffect(() => {
    if (!isCapacitorNative()) return

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

    void App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        void App.exitApp()
      }
    }).then(handle => {
      removeBackListener = () => void handle.remove()
    })

    return () => {
      removeBackListener?.()
      removeIOSShell()
    }
  }, [])

  return null
}
