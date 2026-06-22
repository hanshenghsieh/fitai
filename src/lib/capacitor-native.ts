import { Capacitor } from '@capacitor/core'

export function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}

export function isNativeIOS(): boolean {
  return isCapacitorNative() && Capacitor.getPlatform() === 'ios'
}

/** Web Push (FCM + Service Worker) — not used in iOS Capacitor shell. */
export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (isNativeIOS()) return false
  return 'Notification' in window && 'serviceWorker' in navigator
}
