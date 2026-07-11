import { getFirebaseMessaging } from '@/lib/firebase-admin'
import { absoluteUrl } from '@/lib/app-url'
import type { NotificationPayload } from './notification-types'

export function isFirebasePushAvailable(): boolean {
  return getFirebaseMessaging() != null
}

export async function sendCoachNotificationToToken(
  token: string,
  payload: NotificationPayload
): Promise<boolean> {
  const messaging = getFirebaseMessaging()
  if (!messaging) return false

  try {
    await messaging.sendEachForMulticast({
      notification: { title: payload.title, body: payload.body },
      data: {
        category: payload.category,
        trigger_reason: payload.trigger_reason,
        copy_id: payload.copy_id,
      },
      webpush: {
        fcmOptions: {
          link: absoluteUrl(`/dashboard?notification=${payload.category}`),
        },
        notification: {
          title: payload.title,
          body: payload.body,
        },
      },
      tokens: [token],
    })
    return true
  } catch (err) {
    console.error('Coach notification send failed:', err)
    return false
  }
}

export async function sendCoachNotificationsDryRun(
  payloads: NotificationPayload[]
): Promise<{ dryRun: true; payloads: NotificationPayload[] }> {
  return { dryRun: true, payloads }
}
