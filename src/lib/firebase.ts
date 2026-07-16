import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { apiFetch } from '@/lib/api/client'

export interface FirebasePublicConfig {
  apiKey?: string
  authDomain?: string
  projectId?: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
  vapidKey?: string
}

const firebaseConfig: FirebasePublicConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
}

let app: ReturnType<typeof initializeApp> | null = null
let messaging: ReturnType<typeof getMessaging> | null = null

export function isFirebasePublicConfigValid(
  config: FirebasePublicConfig = firebaseConfig
): boolean {
  return (
    /^AIza[0-9A-Za-z_-]{30,}$/.test(config.apiKey ?? '') &&
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(config.authDomain ?? '') &&
    /^[a-z0-9-]{4,}$/i.test(config.projectId ?? '') &&
    /^[a-z0-9.-]+\.(?:appspot\.com|firebasestorage\.app)$/i.test(
      config.storageBucket ?? ''
    ) &&
    /^\d{6,}$/.test(config.messagingSenderId ?? '') &&
    /^1:\d+:(?:web|ios|android):[a-z0-9]+$/i.test(config.appId ?? '') &&
    /^[A-Za-z0-9_-]{40,}$/.test(config.vapidKey ?? '')
  )
}

export function isFirebaseConfigured(): boolean {
  return isFirebasePublicConfigValid()
}

export function initializeFirebase() {
  if (app) return app
  if (typeof window === 'undefined') return null
  if (!isFirebaseConfigured()) return null

  try {
    app = initializeApp(firebaseConfig)
    messaging = getMessaging(app)
    return app
  } catch {
    console.warn('[notifications] Firebase messaging is unavailable')
    return null
  }
}

export async function requestNotificationPermission(userId: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  if (!isFirebaseConfigured()) return null

  try {
    // 先請求瀏覽器權限
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied:', permission)
      return null
    }

    // 註冊 Service Worker
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      } catch (err) {
        console.warn('Service Worker registration failed:', err)
      }
    }

    const app = initializeFirebase()
    if (!app) return null

    const msg = getMessaging(app)
    const token = await getToken(msg, {
      vapidKey: firebaseConfig.vapidKey,
    })

    if (token && userId) {
      await apiFetch('/api/save-push-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token }),
      })
    }

    return token
  } catch {
    console.warn('[notifications] Push token could not be created')
    return null
  }
}

export function listenForPushMessages() {
  if (typeof window === 'undefined') return
  if (!isFirebaseConfigured()) return

  try {
    const app = initializeFirebase()
    if (!app) return

    const msg = getMessaging(app)
    onMessage(msg, (payload) => {
      console.log('📲 Message received:', payload)
      if (payload.notification) {
        new Notification(payload.notification.title || 'Betterbit', {
          body: payload.notification.body,
          icon: payload.notification.icon,
          tag: 'fitai-notification',
        })
      }
    })
  } catch {
    console.warn('[notifications] Push listener could not be started')
  }
}
