import type { FoodLogEntry } from '@/lib/banks/types'
import { resolveFoodLogsFromSession, writeFoodLogsSessionCache } from '@/lib/food-log-session-cache'
import { readTodayOfflineSnapshot } from '@/lib/today-offline-cache'
import { getNutritionDayKey } from '@/lib/timezone'
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

export async function patchTodayFoodLogs(
  updater: (logs: FoodLogEntry[], memory: UserMemoryMeta | undefined) => FoodLogEntry[],
  weeklyPlanId: string | null
): Promise<FoodLogEntry[]> {
  const date = getNutritionDayKey()
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
  const nextMemory: CheckinUserMemoryPatch = {
    ...(pendingMemory ?? {}),
    food_logs_today: nextLogs,
  }

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

  const snapshot = readTodayOfflineSnapshot(date)
  writeFoodLogsSessionCache(nextLogs, date, {
    calorie_target: snapshot?.calorie_target,
    protein_target: snapshot?.protein_target,
    water_ml: snapshot?.water_ml,
  })
  requestOfflineMutationReplay(userId)

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
