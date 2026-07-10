import type { DailyCheckin } from '@/types'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  buildCheckinPayload,
  initDietItems,
  mealModesFromCheckin,
  parseCheckinMeta,
  type UserMemoryMeta,
} from '@/lib/checkin-utils'

async function fetchTodayCheckin(): Promise<DailyCheckin | null> {
  const res = await fetch('/api/checkin', { credentials: 'include' })
  if (!res.ok) throw new Error('無法載入今日紀錄')
  const json = (await res.json()) as { checkin: DailyCheckin | null }
  return json.checkin
}

export async function patchTodayFoodLogs(
  updater: (logs: FoodLogEntry[], memory: UserMemoryMeta | undefined) => FoodLogEntry[],
  weeklyPlanId: string | null
): Promise<FoodLogEntry[]> {
  const checkin = await fetchTodayCheckin()
  const meta = parseCheckinMeta(checkin)
  const prevLogs = meta.user_memory?.food_logs_today ?? []
  const nextLogs = updater(prevLogs, meta.user_memory)
  const nextMemory: UserMemoryMeta = { ...meta.user_memory, food_logs_today: nextLogs }

  const payload = buildCheckinPayload(
    {
      dietItems: initDietItems(checkin),
      workoutItems: checkin?.workout_items ?? [],
      waterMl: checkin?.water_ml ?? 0,
      mealModes: mealModesFromCheckin(checkin),
      customEatOut: meta.custom_eat_out,
      dailyRolls: meta.daily_rolls,
      mealSuggest: meta.meal_suggest,
      userMemory: nextMemory,
    },
    weeklyPlanId,
    checkin
  )

  const res = await fetch('/api/checkin', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || '儲存失敗')
  }

  return nextLogs
}

export async function deleteTodayFoodLog(logId: string, weeklyPlanId: string | null): Promise<void> {
  await patchTodayFoodLogs(logs => logs.filter(l => l.id !== logId), weeklyPlanId)
}

export async function copyLogToToday(log: FoodLogEntry, weeklyPlanId: string | null): Promise<void> {
  const copy: FoodLogEntry = {
    ...log,
    id: `copy-${log.id}-${Date.now()}`,
    logged_at: new Date().toISOString(),
    user_declared: true,
  }
  await patchTodayFoodLogs(logs => [...logs, copy], weeklyPlanId)
}
