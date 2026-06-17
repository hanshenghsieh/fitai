import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: ReturnType<typeof initializeApp> | null = null
let messaging: ReturnType<typeof getMessaging> | null = null

export function initializeFirebase() {
  if (app) return app
  if (typeof window === 'undefined') return null

  try {
    app = initializeApp(firebaseConfig)
    messaging = getMessaging(app)
    return app
  } catch (err) {
    console.error('Firebase init error:', err)
    return null
  }
}

export async function requestNotificationPermission(userId: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null

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
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })

    if (token && userId) {
      await fetch('/api/save-push-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token }),
      })
    }

    return token
  } catch (err) {
    console.error('Error requesting notification permission:', err)
    return null
  }
}

export function listenForPushMessages() {
  if (typeof window === 'undefined') return

  try {
    const app = initializeFirebase()
    if (!app) return

    const msg = getMessaging(app)
    onMessage(msg, (payload) => {
      console.log('📲 Message received:', payload)
      if (payload.notification) {
        new Notification(payload.notification.title || 'FitAI', {
          body: payload.notification.body,
          icon: payload.notification.icon,
          tag: 'fitai-notification',
        })
      }
    })
  } catch (err) {
    console.error('Error setting up message listener:', err)
  }
}
