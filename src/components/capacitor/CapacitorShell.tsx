'use client'

import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { isCapacitorNative } from '@/lib/capacitor-native'
import { installCapacitorIOSShell } from '@/lib/capacitor-ios-shell'

export default function CapacitorShell() {
  useEffect(() => {
    if (!isCapacitorNative()) return

    const removeIOSShell = installCapacitorIOSShell()

    void StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
    void StatusBar.setBackgroundColor({ color: '#F4F2EE' }).catch(() => {})

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
