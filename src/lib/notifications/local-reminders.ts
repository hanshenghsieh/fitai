import { Capacitor } from '@capacitor/core'
import {
  LocalNotifications,
  type LocalNotificationSchema,
  type PermissionStatus,
  type Weekday,
} from '@capacitor/local-notifications'
import type { NotificationSettings } from '@/lib/settings/user-settings-types'

export type LocalNotificationPermission = PermissionStatus['display'] | 'unsupported'

const MEAL_IDS = {
  breakfast: 1101,
  lunch: 1102,
  dinner: 1103,
  snack: 1104,
} as const
const WATER_ID_START = 1200
const WEIGHT_ID_START = 1300
const WEEKLY_REVIEW_ID = 1401
export const TEST_NOTIFICATION_ID = 1901

function isNativeRuntime(): boolean {
  return Capacitor.isNativePlatform()
}

function parseTime(value: string | undefined, fallback: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? '')
  if (!match) return parseTime(fallback, '08:00')
  return {
    hour: Math.min(23, Math.max(0, Number(match[1]))),
    minute: Math.min(59, Math.max(0, Number(match[2]))),
  }
}

function daily(
  id: number,
  title: string,
  body: string,
  time: string,
  kind: string
): LocalNotificationSchema {
  const { hour, minute } = parseTime(time, '08:00')
  return {
    id,
    title,
    body,
    schedule: { on: { hour, minute }, repeats: true },
    extra: { kind },
  }
}

function allowedWaterHours(settings: NotificationSettings): number[] {
  const interval = Math.max(1, Math.floor(settings.water_interval_hours || 0))
  if (!settings.water_enabled || !settings.water_interval_hours) return []
  const start = parseTime(settings.quiet_hours_end, '08:00').hour
  const quietStart = parseTime(settings.quiet_hours_start, '22:30').hour
  const hours: number[] = []
  for (let offset = 0; offset < 24; offset += interval) {
    const hour = (start + offset) % 24
    const allowed = start < quietStart
      ? hour >= start && hour < quietStart
      : hour >= start || hour < quietStart
    if (settings.quiet_hours_enabled !== false && !allowed) continue
    if (!hours.includes(hour)) hours.push(hour)
  }
  return hours.slice(0, 24)
}

export function buildLocalReminderSchedule(
  settings: NotificationSettings
): LocalNotificationSchema[] {
  const notifications: LocalNotificationSchema[] = []

  if (settings.breakfast_enabled) {
    notifications.push(daily(MEAL_IDS.breakfast, '早餐提醒', '記得為今天補充第一份能量。', settings.breakfast_time, 'breakfast'))
  }
  if (settings.lunch_enabled) {
    notifications.push(daily(MEAL_IDS.lunch, '午餐提醒', '吃飯前看一下今天還需要什麼。', settings.lunch_time, 'lunch'))
  }
  if (settings.dinner_enabled) {
    notifications.push(daily(MEAL_IDS.dinner, '晚餐提醒', '留一點時間，好好記錄今天的晚餐。', settings.dinner_time, 'dinner'))
  }
  if (settings.snack_enabled) {
    notifications.push(daily(MEAL_IDS.snack, '點心提醒', '想吃點心時，先看看今天的剩餘目標。', settings.snack_time, 'snack'))
  }

  allowedWaterHours(settings).forEach((hour, index) => {
    notifications.push({
      id: WATER_ID_START + index,
      title: '喝水提醒',
      body: '喝幾口水，讓身體休息一下。',
      schedule: { on: { hour, minute: 0 }, repeats: true },
      extra: { kind: 'water' },
    })
  })

  if (settings.weight_log_enabled && settings.weight_log_per_week > 0) {
    const weekdays =
      settings.weight_log_per_week >= 7
        ? [1, 2, 3, 4, 5, 6, 7]
        : settings.weight_log_per_week >= 2
          ? [2, 5]
          : [2]
    weekdays.forEach((weekday, index) => {
      notifications.push({
        id: WEIGHT_ID_START + index,
        title: '體重紀錄提醒',
        body: '在相近的時間量體重，趨勢會更有參考價值。',
        schedule: { on: { weekday: weekday as Weekday, hour: 8, minute: 0 }, repeats: true },
        extra: { kind: 'weight' },
      })
    })
  }

  if (settings.weekly_review_enabled) {
    const { hour, minute } = parseTime(settings.weekly_review_time, '20:00')
    notifications.push({
      id: WEEKLY_REVIEW_ID,
      title: '每週回顧',
      body: '花一分鐘看看這週的飲食與體重趨勢。',
      schedule: {
        on: {
          weekday: (Math.min(6, Math.max(0, settings.weekly_review_day)) + 1) as Weekday,
          hour,
          minute,
        },
        repeats: true,
      },
      extra: { kind: 'weekly_review' },
    })
  }

  return notifications
}

function isManagedId(id: number): boolean {
  return (id >= 1100 && id < 1500) || id === TEST_NOTIFICATION_ID
}

export async function getLocalNotificationPermission(): Promise<LocalNotificationPermission> {
  if (!isNativeRuntime()) return 'unsupported'
  return (await LocalNotifications.checkPermissions()).display
}

export async function ensureLocalNotificationPermission(): Promise<LocalNotificationPermission> {
  if (!isNativeRuntime()) return 'unsupported'
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return 'granted'
  if (current.display === 'denied') return 'denied'
  return (await LocalNotifications.requestPermissions()).display
}

export async function cancelManagedLocalReminders(): Promise<void> {
  if (!isNativeRuntime()) return
  const pending = await LocalNotifications.getPending()
  const notifications = pending.notifications
    .filter(notification => isManagedId(notification.id))
    .map(notification => ({ id: notification.id }))
  if (notifications.length) await LocalNotifications.cancel({ notifications })
}

export async function reconcileLocalReminders(
  settings: NotificationSettings,
  options: { requestPermission?: boolean } = {}
): Promise<LocalNotificationPermission> {
  if (!isNativeRuntime()) return 'unsupported'
  const permission = options.requestPermission
    ? await ensureLocalNotificationPermission()
    : await getLocalNotificationPermission()

  if (permission !== 'granted') {
    if (permission === 'denied') await cancelManagedLocalReminders()
    return permission
  }

  await cancelManagedLocalReminders()
  const notifications = buildLocalReminderSchedule(settings)
  if (notifications.length) await LocalNotifications.schedule({ notifications })
  return permission
}

export async function scheduleLocalReminderTest(delaySeconds = 90): Promise<LocalNotificationPermission> {
  const permission = await ensureLocalNotificationPermission()
  if (permission !== 'granted') return permission
  await LocalNotifications.cancel({ notifications: [{ id: TEST_NOTIFICATION_ID }] })
  await LocalNotifications.schedule({
    notifications: [{
      id: TEST_NOTIFICATION_ID,
      title: 'Betterbit 測試提醒',
      body: '本地通知排程正常。',
      schedule: { at: new Date(Date.now() + Math.max(60, delaySeconds) * 1000) },
      extra: { kind: 'test' },
    }],
  })
  return permission
}

export function openIosNotificationSettings(): void {
  if (typeof window !== 'undefined') window.location.href = 'app-settings:'
}
