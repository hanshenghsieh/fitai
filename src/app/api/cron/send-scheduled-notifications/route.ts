import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek } from 'date-fns'

// 定時通知時間配置 (24小時制)
const NOTIFICATION_SCHEDULE = {
  breakfast: { hour: 7, minute: 0 },      // 早上 7 點
  lunch: { hour: 12, minute: 0 },         // 中午 12 點
  dinner: { hour: 18, minute: 30 },       // 晚上 6:30
  workout: { hour: 19, minute: 0 },       // 晚上 7 點
  evening_reminder: { hour: 21, minute: 0 }, // 晚上 9 點（未達標提醒）
}

function isTimeToNotify(targetHour: number, targetMin: number, tolerance: number = 5): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMin = now.getMinutes()

  // 检查是否在目标时间的容差范围内
  return currentHour === targetHour && Math.abs(currentMin - targetMin) <= tolerance
}

async function getActivePlanForToday(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStartStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('weekly_plans')
    .select('plan_data')
    .eq('user_id', userId)
    .eq('week_start', weekStartStr)
    .single()

  if (!data?.plan_data?.days) return null

  const dayIndex = Math.max(0, new Date(today).getDay() === 0 ? 6 : new Date(today).getDay() - 1)
  return data.plan_data.days[dayIndex] || null
}

async function sendScheduledNotifications() {
  const supabase = await createClient()

  // 早上 7 點：發早餐提醒
  if (isTimeToNotify(NOTIFICATION_SCHEDULE.breakfast.hour, NOTIFICATION_SCHEDULE.breakfast.minute)) {
    console.log('📢 Sending breakfast notifications...')

    const { data: users } = await supabase
      .from('push_tokens')
      .select('user_id')
      .gt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 活躍用戶

    if (users) {
      for (const { user_id } of users) {
        const plan = await getActivePlanForToday(supabase, user_id)
        const mealName = plan?.convenience_meals?.[0]?.items?.[0]?.name
          || plan?.meals?.[0]?.items?.[0]?.name_zh
          || '查看計畫'

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'breakfast',
            userId: user_id,
            mealName,
          }),
        })
      }
    }
  }

  // 中午 12 點：發午餐提醒
  if (isTimeToNotify(NOTIFICATION_SCHEDULE.lunch.hour, NOTIFICATION_SCHEDULE.lunch.minute)) {
    console.log('📢 Sending lunch notifications...')

    const { data: users } = await supabase
      .from('push_tokens')
      .select('user_id')
      .gt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (users) {
      for (const { user_id } of users) {
        const plan = await getActivePlanForToday(supabase, user_id)
        const mealName = plan?.convenience_meals?.[1]?.items?.[0]?.name
          || plan?.meals?.[1]?.items?.[0]?.name_zh
          || '查看計畫'

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'lunch',
            userId: user_id,
            mealName,
          }),
        })
      }
    }
  }

  // 下午 6:30：發晚餐提醒
  if (isTimeToNotify(NOTIFICATION_SCHEDULE.dinner.hour, NOTIFICATION_SCHEDULE.dinner.minute)) {
    console.log('📢 Sending dinner notifications...')

    const { data: users } = await supabase
      .from('push_tokens')
      .select('user_id')
      .gt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (users) {
      for (const { user_id } of users) {
        const plan = await getActivePlanForToday(supabase, user_id)
        const mealName = plan?.convenience_meals?.[2]?.items?.[0]?.name
          || plan?.meals?.[2]?.items?.[0]?.name_zh
          || '查看計畫'

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'dinner',
            userId: user_id,
            mealName,
          }),
        })
      }
    }
  }

  // 晚上 7 點：發運動提醒
  if (isTimeToNotify(NOTIFICATION_SCHEDULE.workout.hour, NOTIFICATION_SCHEDULE.workout.minute)) {
    console.log('📢 Sending workout notifications...')

    const { data: users } = await supabase
      .from('push_tokens')
      .select('user_id')
      .gt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (users) {
      for (const { user_id } of users) {
        const plan = await getActivePlanForToday(supabase, user_id)
        const workoutType = plan?.workout?.type_zh || '查看計畫'

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'workout',
            userId: user_id,
            workoutType,
          }),
        })
      }
    }
  }

  // 晚上 9 點：發未達標提醒
  if (isTimeToNotify(NOTIFICATION_SCHEDULE.evening_reminder.hour, NOTIFICATION_SCHEDULE.evening_reminder.minute)) {
    console.log('📢 Sending evening reminders...')

    const { data: users } = await supabase
      .from('push_tokens')
      .select('user_id')
      .gt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (users) {
      const today = format(new Date(), 'yyyy-MM-dd')

      for (const { user_id } of users) {
        const { data: checkin } = await supabase
          .from('daily_checkins')
          .select('diet_items, workout_items, water_ml')
          .eq('user_id', user_id)
          .eq('checkin_date', today)
          .single()

        const diet = checkin?.diet_items ?? []
        const workout = checkin?.workout_items ?? []
        const dietDone = diet.filter((i: { completed: boolean }) => i.completed).length
        const workoutDone = workout.filter((i: { completed: boolean }) => i.completed).length
        const total = diet.length + workout.length
        const done = dietDone + workoutDone
        const progress = total > 0 ? Math.round((done / total) * 100) : 0
        const qualified = total > 0 && dietDone >= diet.length && workoutDone >= workout.length

        if (!qualified) {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'reminder',
              userId: user_id,
              progress,
            }),
          })
        }
      }
    }
  }

  return { success: true }
}

export async function GET(req: NextRequest) {
  // 驗證 cron secret
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendScheduledNotifications()
    return NextResponse.json(result)
  } catch (err) {
    console.error('Error in scheduled notifications:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

// 用於手動測試
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendScheduledNotifications()
    return NextResponse.json(result)
  } catch (err) {
    console.error('Error in scheduled notifications:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
