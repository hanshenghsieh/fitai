import { format, subDays, parseISO } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import {
  calorieFloorFromGender,
  syncCalorieBankRow,
} from '@/lib/engines/calorie-bank-engine'
import { getNutritionDayKey } from '@/lib/timezone'
import type { UserProfile } from '@/types'

function isMissingTableError(message: string) {
  return /could not find the table|schema cache/i.test(message)
}

function rowFromDb(data: Record<string, unknown>): CalorieBankRow {
  return {
    id: String(data.id),
    user_id: String(data.user_id),
    date: String(data.date).slice(0, 10),
    daily_target_kcal: Number(data.daily_target_kcal),
    internal_target_kcal: Number(data.internal_target_kcal),
    actual_kcal: Number(data.actual_kcal),
    delta_kcal: Number(data.delta_kcal),
    running_balance_kcal: Number(data.running_balance_kcal),
    recovery_balance_kcal: Number(data.recovery_balance_kcal),
    spread_days_remaining: Number(data.spread_days_remaining),
    daily_adjust_kcal: Number(data.daily_adjust_kcal),
    created_at: data.created_at as string | undefined,
    updated_at: data.updated_at as string | undefined,
    persisted: true,
  }
}

function withPersisted(row: CalorieBankRow, persisted: boolean): CalorieBankRow {
  return { ...row, persisted }
}

function logCalorieBankError(context: string, message: string, meta?: Record<string, unknown>) {
  console.error(`[calorie_bank] ${context}:`, message, meta ?? '')
}

export async function getCalorieBankRow(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<CalorieBankRow | null> {
  const { data, error } = await supabase
    .from('calorie_bank')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error.message)) {
      logCalorieBankError('getCalorieBankRow', error.message, { userId, date, missingTable: true })
      return null
    }
    throw new Error(error.message)
  }
  return data ? rowFromDb(data as Record<string, unknown>) : null
}

export async function getLatestActiveCalorieBank(
  supabase: SupabaseClient,
  userId: string
): Promise<CalorieBankRow | null> {
  const { data, error } = await supabase
    .from('calorie_bank')
    .select('*')
    .eq('user_id', userId)
    .gt('recovery_balance_kcal', 0)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error.message)) {
      logCalorieBankError('getLatestActiveCalorieBank', error.message, { userId, missingTable: true })
      return null
    }
    throw new Error(error.message)
  }
  return data ? rowFromDb(data as Record<string, unknown>) : null
}

export async function upsertCalorieBankRow(
  supabase: SupabaseClient,
  row: CalorieBankRow
): Promise<CalorieBankRow> {
  const payload = {
    user_id: row.user_id,
    date: row.date,
    daily_target_kcal: row.daily_target_kcal,
    internal_target_kcal: row.internal_target_kcal,
    actual_kcal: row.actual_kcal,
    delta_kcal: row.delta_kcal,
    running_balance_kcal: row.running_balance_kcal,
    recovery_balance_kcal: row.recovery_balance_kcal,
    spread_days_remaining: row.spread_days_remaining,
    daily_adjust_kcal: row.daily_adjust_kcal,
  }

  const { data, error } = await supabase
    .from('calorie_bank')
    .upsert(payload, { onConflict: 'user_id,date' })
    .select()
    .single()

  if (error) {
    logCalorieBankError('upsertCalorieBankRow', error.message, {
      user_id: row.user_id,
      date: row.date,
      missingTable: isMissingTableError(error.message),
    })
    return withPersisted(row, false)
  }

  if (!data) {
    logCalorieBankError('upsertCalorieBankRow', 'upsert returned no row', {
      user_id: row.user_id,
      date: row.date,
    })
    return withPersisted(row, false)
  }

  return rowFromDb(data as Record<string, unknown>)
}

export async function syncCalorieBankForUser(params: {
  supabase: SupabaseClient
  userId: string
  date: string
  normalTargetKcal: number
  actualKcal: number
  profile?: UserProfile | null
}): Promise<CalorieBankRow | null> {
  const { supabase, userId, date, normalTargetKcal, actualKcal, profile } = params
  const floor = calorieFloorFromGender(profile?.gender)

  const prevDate = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')
  const [previousRow, existingToday] = await Promise.all([
    getCalorieBankRow(supabase, userId, prevDate),
    getCalorieBankRow(supabase, userId, date),
  ])

  const row = syncCalorieBankRow({
    userId,
    date,
    normalTargetKcal,
    calorieFloor: floor,
    actualKcal,
    previousRow,
    existingToday,
  })

  return upsertCalorieBankRow(supabase, row)
}

export function sumFoodLogCalories(
  logs: { calories?: number }[] | null | undefined
): number {
  return (logs ?? []).reduce((s, l) => s + (l.calories ?? 0), 0)
}

/** Called after food logs persist (checkin PATCH). */
export async function syncBankFromFoodLogs(params: {
  supabase: SupabaseClient
  userId: string
  normalTargetKcal: number
  foodLogs: { calories?: number }[] | null | undefined
  profile?: UserProfile | null
}): Promise<CalorieBankRow | null> {
  return syncCalorieBankForUser({
    supabase: params.supabase,
    userId: params.userId,
    date: getNutritionDayKey(),
    normalTargetKcal: params.normalTargetKcal,
    actualKcal: sumFoodLogCalories(params.foodLogs),
    profile: params.profile,
  })
}
