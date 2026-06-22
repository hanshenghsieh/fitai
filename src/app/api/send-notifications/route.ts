import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFirebaseMessaging } from '@/lib/firebase-admin'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import { absoluteUrl } from '@/lib/app-url'

interface PushNotification {
  title: string
  body: string
}

type NotificationType = 'breakfast' | 'lunch' | 'dinner' | 'workout' | 'reminder' | 'daily_summary'

function getNotificationContent(type: NotificationType, data?: Record<string, unknown>): PushNotification {
  const mealName = (data?.meal_name as string) || ''
  const workoutType = (data?.workout_type as string) || ''
  const progress = (data?.progress as number) || 0
  const completed = data?.completed as boolean

  switch (type) {
    case 'breakfast': {
      const line = pickZaiJianLine('breakfast')
      return {
        title: line.text,
        body: mealName ? `${line.subtext ?? ''} ${mealName}`.trim() : (line.subtext ?? '不要靠空氣減肥。'),
      }
    }
    case 'lunch': {
      const line = pickZaiJianLine('lunch')
      return {
        title: line.text,
        body: line.subtext ?? '交給我。',
      }
    }
    case 'dinner': {
      const line = pickZaiJianLine('dinner')
      return {
        title: line.text,
        body: mealName ? `${line.subtext ?? ''} ${mealName}`.trim() : (line.subtext ?? '別把宵夜當第四餐。'),
      }
    }
    case 'workout': {
      const line = pickZaiJianLine('workout')
      return {
        title: line.text,
        body: workoutType ? `${workoutType}。${line.subtext ?? ''}` : (line.subtext ?? '做完就可以躺。'),
      }
    }
    case 'reminder': {
      const line = pickZaiJianLine('late_night')
      return {
        title: line.text,
        body: progress > 0 ? `今天 ${progress}%。${line.subtext ?? ''}` : (line.subtext ?? '差不多了。'),
      }
    }
    case 'daily_summary': {
      const line = pickZaiJianLine(completed ? 'success' : 'cheat_recovery')
      return {
        title: line.text,
        body: line.subtext ?? '明天再健一點。',
      }
    }
    default:
      return { title: '再健', body: '照著做就好。' }
  }
}

async function sendNotificationToUser(
  token: string,
  type: NotificationType,
  data?: Record<string, unknown>
): Promise<boolean> {
  const messaging = getFirebaseMessaging()
  if (!messaging) return false

  const content = getNotificationContent(type, data)

  try {
    await messaging.sendEachForMulticast({
      notification: { title: content.title, body: content.body },
      webpush: {
        fcmOptions: {
          link: absoluteUrl(`/dashboard?notification=${type}`),
        },
        notification: {
          title: content.title,
          body: content.body,
        },
      },
      tokens: [token],
    })
    return true
  } catch (err) {
    console.error(`Failed to send notification to token ${token}:`, err)
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const { type, userId, mealName, workoutType, progress, completed } = await req.json()

    if (!type) {
      return NextResponse.json({ error: 'Missing notification type' }, { status: 400 })
    }

    const supabase = await createClient()
    const payload = { meal_name: mealName, workout_type: workoutType, progress, completed }

    if (userId) {
      const { data: pushTokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)

      if (pushTokens && pushTokens.length > 0) {
        const results = await Promise.all(
          pushTokens.map(({ token }) =>
            sendNotificationToUser(token, type as NotificationType, payload)
          )
        )
        const successCount = results.filter(Boolean).length
        return NextResponse.json({ success: true, sent: successCount })
      }
      return NextResponse.json({ success: false, sent: 0 }, { status: 404 })
    }

    const { data: allTokens } = await supabase.from('push_tokens').select('user_id, token')
    if (!allTokens?.length) return NextResponse.json({ success: true, sent: 0 })

    const results = await Promise.all(
      allTokens.map(({ token }) => sendNotificationToUser(token, type as NotificationType))
    )
    return NextResponse.json({ success: true, sent: results.filter(Boolean).length })
  } catch (err) {
    console.error('Error sending notification:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
