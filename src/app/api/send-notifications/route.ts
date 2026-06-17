import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

let messaging: any = null

function initializeFirebaseAdmin() {
  try {
    const admin = require('firebase-admin')
    if (!messaging && (!admin.apps || !admin.apps.length)) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK || '{}')
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      messaging = admin.messaging()
    }
  } catch (err) {
    console.error('Firebase Admin init error:', err)
  }
}

initializeFirebaseAdmin()

interface PushNotification {
  title: string
  body: string
  icon?: string
}

type NotificationType = 'breakfast' | 'lunch' | 'dinner' | 'workout' | 'reminder' | 'daily_summary'

function getNotificationContent(type: NotificationType, data?: any): PushNotification {
  const contents: Record<NotificationType, PushNotification> = {
    breakfast: {
      title: '早餐時間到！ 🌅',
      body: `開始你的一天吧！今天早餐：${data?.meal_name || '點擊查看計畫'}`,
      icon: '🥣',
    },
    lunch: {
      title: '午餐時間到！ 🍱',
      body: `補充能量的時候到了！今天午餐：${data?.meal_name || '點擊查看計畫'}`,
      icon: '🍜',
    },
    dinner: {
      title: '晚餐時間到！ 🍽️',
      body: `享用今天的晚餐：${data?.meal_name || '點擊查看計畫'}`,
      icon: '🍲',
    },
    workout: {
      title: '運動時間到！ 💪',
      body: `${data?.workout_type || '開始今天的訓練'}，堅持就是勝利！`,
      icon: '🏋️',
    },
    reminder: {
      title: '今日尚未達標',
      body: `已完成 ${data?.progress || 0}% 的計畫，加油！還有時間！`,
      icon: '⏰',
    },
    daily_summary: {
      title: '今日總結 📊',
      body: data?.completed ? '🎉 恭喜！今天達標了！' : '明天繼續加油！',
      icon: '📈',
    },
  }
  return contents[type]
}

async function sendNotificationToUser(
  token: string,
  type: NotificationType,
  data?: any
): Promise<boolean> {
  const content = getNotificationContent(type, data)

  try {
    const message = {
      notification: {
        title: content.title,
        body: content.body,
      },
      webpush: {
        fcmOptions: {
          link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?notification=${type}`,
        },
        notification: {
          title: content.title,
          body: content.body,
          icon: content.icon || undefined,
          badge: '/icon.png',
        },
      },
      tokens: [token],
    }

    await messaging.sendMulticast(message)
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

    // 如果指定了 userId，只發給該用戶
    if (userId) {
      const { data: pushTokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)

      if (pushTokens && pushTokens.length > 0) {
        const results = await Promise.all(
          pushTokens.map(({ token }) =>
            sendNotificationToUser(token, type as NotificationType, {
              meal_name: mealName,
              workout_type: workoutType,
              progress,
              completed,
            })
          )
        )

        const successCount = results.filter(Boolean).length
        console.log(`✅ Sent ${successCount}/${results.length} notifications to user ${userId}`)
        return NextResponse.json({ success: true, sent: successCount })
      }

      return NextResponse.json({ success: false, sent: 0 }, { status: 404 })
    }

    // 如果沒有 userId，發給所有用戶（用於定時任務）
    const { data: allTokens } = await supabase
      .from('push_tokens')
      .select('user_id, token')

    if (!allTokens || allTokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const results = await Promise.all(
      allTokens.map(({ token }) =>
        sendNotificationToUser(token, type as NotificationType)
      )
    )

    const successCount = results.filter(Boolean).length
    console.log(`✅ Sent ${successCount}/${allTokens.length} notifications to all users`)

    return NextResponse.json({ success: true, sent: successCount })
  } catch (err) {
    console.error('Error sending notification:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
