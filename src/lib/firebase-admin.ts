import { cert, initializeApp, getApps } from 'firebase-admin/app'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'

let messaging: Messaging | null = null
let initAttempted = false

export function getFirebaseMessaging(): Messaging | null {
  if (messaging) return messaging
  if (initAttempted) return null
  initAttempted = true

  const raw = process.env.FIREBASE_ADMIN_SDK
  if (!raw || raw === '{}') {
    console.warn('FIREBASE_ADMIN_SDK not configured — push notifications disabled')
    return null
  }

  try {
    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(raw)
      initializeApp({ credential: cert(serviceAccount) })
    }
    messaging = getMessaging()
    return messaging
  } catch (err) {
    console.error('Firebase Admin init error:', err)
    return null
  }
}
