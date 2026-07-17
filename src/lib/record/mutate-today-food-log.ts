import type { FoodLogEntry } from '@/lib/banks/types'
import { resolveFoodLogsFromSession, writeFoodLogsSessionCache } from '@/lib/food-log-session-cache'
import { readTodayOfflineSnapshot } from '@/lib/today-offline-cache'
import { getNutritionDayKey, isLocalDateKey } from '@/lib/timezone'
import {
  type UserMemoryMeta,
} from '@/lib/checkin-utils'
import { createClient } from '@/lib/supabase/client'
import {
  enqueueCheckinMutation,
  readPendingCheckinMutation,
  readPendingFoodLogs,
  requestOfflineMutationReplay,
  type CheckinUserMemoryPatch,
} from '@/lib/offline-mutation-queue'
import {
  filterFoodLogsForNutritionDay,
  foodLogNutritionDayKey,
} from '@/lib/nutrition-day-food-logs'
import { traceRecordDate } from '@/lib/record-date-trace'

export function mergeCapturedFoodLogsForDate(
  existing: FoodLogEntry[],
  captured: FoodLogEntry[],
  targetDate: string
): FoodLogEntry[] {
  const byId = new Map(existing.map(log => [log.id, log]))
  for (const log of filterFoodLogsForNutritionDay(captured, targetDate)) {
    byId.set(log.id, log)
  }
  return [...byId.values()].sort((a, b) => a.logged_at.localeCompare(b.logged_at))
}

export async function patchFoodLogsForDate(
  date: string,
  updater: (logs: FoodLogEntry[], memory: UserMemoryMeta | undefined) => FoodLogEntry[],
  weeklyPlanId: string | null
): Promise<FoodLogEntry[]> {
  if (!isLocalDateKey(date)) throw new Error('Invalid targetDate')
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user.id
  if (!userId) throw new Error('登入狀態失效，無法安全儲存')

  const pendingEntry = readPendingCheckinMutation(userId, date)
  const pendingMemory = pendingEntry?.payload.notes_patch?.user_memory
  const prevLogs =
    readPendingFoodLogs(userId, date) ?? resolveFoodLogsFromSession([], date)
  const nextLogs = updater(prevLogs, pendingMemory as UserMemoryMeta | undefined)
  const mismatched = nextLogs.find(log => foodLogNutritionDayKey(log) !== date)
  if (mismatched) {
    traceRecordDate('mutation-rejected', {
      targetDate: date,
      nutritionDate: date,
      loggedAt: mismatched.logged_at,
      loggedAtLocalDate: foodLogNutritionDayKey(mismatched),
      mealSlot: mismatched.slot,
      foodLogId: mismatched.id,
      reason: 'logged-at-date-mismatch',
    })
    throw new Error('餐點日期與所選日期不一致，已停止儲存')
  }
  const nextMemory: CheckinUserMemoryPatch = {
    ...(pendingMemory ?? {}),
    food_logs_today: nextLogs,
  }

  const lastLog = nextLogs.at(-1)
  traceRecordDate('enqueue-checkin-input', {
    targetDate: date,
    nutritionDate: date,
    loggedAt: lastLog?.logged_at,
    loggedAtLocalDate: lastLog ? foodLogNutritionDayKey(lastLog) : null,
    mealSlot: lastLog?.slot,
    foodLogId: lastLog?.id,
  })
  const queued = enqueueCheckinMutation({
    userId,
    nutritionDate: date,
    payload: {
      weekly_plan_id: weeklyPlanId,
      notes_patch: { user_memory: nextMemory },
    },
  })
  if (!queued.durable) {
    throw new Error('無法安全儲存在此裝置')
  }
  traceRecordDate('enqueue-checkin-durable', {
    targetDate: date,
    nutritionDate: date,
    loggedAt: lastLog?.logged_at,
    loggedAtLocalDate: lastLog ? foodLogNutritionDayKey(lastLog) : null,
    mealSlot: lastLog?.slot,
    foodLogId: lastLog?.id,
    persisted: false,
  })

  const snapshot = readTodayOfflineSnapshot(date)
  writeFoodLogsSessionCache(nextLogs, date, {
    calorie_target: snapshot?.calorie_target,
    protein_target: snapshot?.protein_target,
    water_ml: snapshot?.water_ml,
  })
  requestOfflineMutationReplay(userId)

  return nextLogs
}

export async function patchTodayFoodLogs(
  updater: (logs: FoodLogEntry[], memory: UserMemoryMeta | undefined) => FoodLogEntry[],
  weeklyPlanId: string | null
): Promise<FoodLogEntry[]> {
  return patchFoodLogsForDate(getNutritionDayKey(), updater, weeklyPlanId)
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
