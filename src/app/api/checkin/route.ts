import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { getNutritionDayKey } from '@/lib/timezone'
import { mergePersistedCheckinNotes, parseCheckinMeta } from '@/lib/checkin-utils'
import { syncBankFromFoodLogs } from '@/lib/banks/calorie-bank-store'
import { differenceInDays, format, parseISO, startOfWeek } from 'date-fns'
import type { DailyCheckin, WeeklyPlanData, UserProfile } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { captureError } from '@/lib/observability/capture-error'

class CheckinRequestError extends Error {}

interface MutationContract {
  nutritionDate: string
  idempotencyKey: string
  entryRevision: number
}

export function mergeCheckinNotesPatch(
  existingNotes: string | null | undefined,
  notesPatch: Record<string, unknown>
): string {
  let existingMeta: Record<string, unknown> = {}
  if (typeof existingNotes === 'string') {
    try {
      existingMeta = JSON.parse(existingNotes) as Record<string, unknown>
    } catch {
      existingMeta = {}
    }
  }
  const nextMeta = { ...existingMeta, ...notesPatch }
  if (
    notesPatch.user_memory &&
    typeof notesPatch.user_memory === 'object' &&
    !Array.isArray(notesPatch.user_memory)
  ) {
    const existingMemory =
      existingMeta.user_memory &&
      typeof existingMeta.user_memory === 'object' &&
      !Array.isArray(existingMeta.user_memory)
        ? (existingMeta.user_memory as Record<string, unknown>)
        : {}
    nextMeta.user_memory = {
      ...existingMemory,
      ...(notesPatch.user_memory as Record<string, unknown>),
    }
  }
  return mergePersistedCheckinNotes(
    JSON.stringify(nextMeta),
    { notes: existingNotes ?? null } as Pick<DailyCheckin, 'notes'>
  )
}

async function resolveDailyTargets(
  supabase: SupabaseClient,
  userId: string,
  nutritionDate: string
): Promise<{ calories: number; protein_g: number; fat_g: number; carbs_g: number } | null> {
  const date = parseISO(nutritionDate)
  const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const dayIndex = differenceInDays(date, parseISO(weekStart))

  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('plan_data')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()

  const planData = plan?.plan_data as WeeklyPlanData | null
  const days = planData?.days
  if (!days?.length) return null

  const safeIndex = Math.min(Math.max(0, dayIndex), days.length - 1)
  const targets = days[safeIndex]?.daily_targets
  if (!targets?.calories) return null

  return {
    calories: targets.calories,
    protein_g: targets.protein_g ?? 0,
    fat_g: targets.fat_g ?? 0,
    carbs_g: targets.carbs_g ?? 0,
  }
}

async function maybeSyncCalorieBank(
  supabase: SupabaseClient,
  userId: string,
  checkin: { notes?: string | null },
  profile: UserProfile | null
) {
  const meta = parseCheckinMeta(checkin)
  const logs = meta.user_memory?.food_logs_today ?? []
  const today = getNutritionDayKey()
  const dailyTargets = await resolveDailyTargets(supabase, userId, today)
  if (!dailyTargets) return null

  return syncBankFromFoodLogs({
    supabase,
    userId,
    dailyTargets,
    foodLogs: logs,
    profile,
  })
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const today = getNutritionDayKey()
  const { data } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('checkin_date', today)
    .single()

  return jsonWithCors({ checkin: data ?? null }, request)
}

async function mergeCheckinBodyWithExistingNotes(
  supabase: SupabaseClient,
  userId: string,
  checkinDate: string,
  body: Record<string, unknown>,
  notesPatch?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (typeof body.notes !== 'string' && !notesPatch) return body

  const { data: existing } = await supabase
    .from('daily_checkins')
    .select('notes')
    .eq('user_id', userId)
    .eq('checkin_date', checkinDate)
    .maybeSingle()

  if (notesPatch) {
    return {
      ...body,
      notes: mergeCheckinNotesPatch(existing?.notes, notesPatch),
    }
  }

  return {
    ...body,
    notes: mergePersistedCheckinNotes(body.notes as string, existing),
  }
}

export function isValidNutritionDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function parsePatchRequest(
  request: NextRequest,
  raw: Record<string, unknown>
): {
  body: Record<string, unknown>
  notesPatch?: Record<string, unknown>
  contract?: MutationContract
} {
  const {
    nutrition_date: nutritionDateValue,
    idempotency_key: idempotencyKeyValue,
    entry_revision: entryRevisionValue,
    notes_patch: notesPatchValue,
    ...body
  } = raw
  const hasContract =
    nutritionDateValue != null ||
    idempotencyKeyValue != null ||
    entryRevisionValue != null ||
    notesPatchValue != null
  if (!hasContract) return { body }

  if (
    typeof nutritionDateValue !== 'string' ||
    !isValidNutritionDate(nutritionDateValue)
  ) {
    throw new CheckinRequestError('Invalid nutrition_date')
  }
  if (
    typeof idempotencyKeyValue !== 'string' ||
    idempotencyKeyValue.length < 1 ||
    idempotencyKeyValue.length > 200
  ) {
    throw new CheckinRequestError('Invalid idempotency_key')
  }
  const headerKey = request.headers.get('idempotency-key')
  if (headerKey && headerKey !== idempotencyKeyValue) {
    throw new CheckinRequestError('Idempotency key mismatch')
  }
  if (
    typeof entryRevisionValue !== 'number' ||
    !Number.isInteger(entryRevisionValue) ||
    entryRevisionValue < 1
  ) {
    throw new CheckinRequestError('Invalid entry_revision')
  }
  if (
    notesPatchValue != null &&
    (typeof notesPatchValue !== 'object' || Array.isArray(notesPatchValue))
  ) {
    throw new CheckinRequestError('Invalid notes_patch')
  }
  if (notesPatchValue != null && typeof body.notes === 'string') {
    throw new CheckinRequestError('Use notes_patch or notes, not both')
  }

  return {
    body,
    notesPatch: notesPatchValue as Record<string, unknown> | undefined,
    contract: {
      nutritionDate: nutritionDateValue,
      idempotencyKey: idempotencyKeyValue,
      entryRevision: entryRevisionValue,
    },
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const body = await request.json()
  const today = getNutritionDayKey()
  const mergedBody = await mergeCheckinBodyWithExistingNotes(supabase, user.id, today, body)

  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert(
      {
        user_id: user.id,
        checkin_date: today,
        ...mergedBody,
      },
      { onConflict: 'user_id,checkin_date' }
    )
    .select()
    .single()

  if (error) {
    captureError(new Error(error.message), {
      feature: 'checkin-save',
      operation: 'upsert',
      userId: user.id,
      extra: { method: 'POST' },
    })
    return jsonWithCors({ error: error.message }, request, { status: 500 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  let bank: Awaited<ReturnType<typeof maybeSyncCalorieBank>> = null
  try {
    bank = await maybeSyncCalorieBank(supabase, user.id, data, profile as UserProfile | null)
  } catch (err) {
    console.error('[checkin] calorie bank sync failed after POST:', err)
    captureError(err, { feature: 'checkin-save', operation: 'calorie-bank-sync', userId: user.id })
  }

  return jsonWithCors({ checkin: data, calorie_bank: bank }, request)
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  let parsed: ReturnType<typeof parsePatchRequest>
  try {
    parsed = parsePatchRequest(
      request,
      (await request.json()) as Record<string, unknown>
    )
  } catch (error) {
    if (error instanceof CheckinRequestError) {
      return jsonWithCors({ error: error.message }, request, { status: 400 })
    }
    return jsonWithCors({ error: 'Invalid request body' }, request, { status: 400 })
  }
  const checkinDate = parsed.contract?.nutritionDate ?? getNutritionDayKey()
  const mergedBody = await mergeCheckinBodyWithExistingNotes(
    supabase,
    user.id,
    checkinDate,
    parsed.body,
    parsed.notesPatch
  )

  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert(
      {
        user_id: user.id,
        checkin_date: checkinDate,
        ...mergedBody,
      },
      { onConflict: 'user_id,checkin_date' }
    )
    .select()
    .single()

  if (error) {
    captureError(new Error(error.message), {
      feature: 'checkin-save',
      operation: 'upsert',
      userId: user.id,
      extra: { method: 'PATCH' },
    })
    return jsonWithCors({ error: error.message }, request, { status: 500 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  let bank: Awaited<ReturnType<typeof maybeSyncCalorieBank>> = null
  try {
    bank = await maybeSyncCalorieBank(supabase, user.id, data, profile as UserProfile | null)
  } catch (err) {
    console.error('[checkin] calorie bank sync failed after PATCH:', err)
    captureError(err, { feature: 'checkin-save', operation: 'calorie-bank-sync', userId: user.id })
  }

  return jsonWithCors(
    {
      checkin: data,
      calorie_bank: bank,
      ...(parsed.contract
        ? {
            confirmation: {
              status: 'confirmed',
              idempotency_key: parsed.contract.idempotencyKey,
              nutrition_date: parsed.contract.nutritionDate,
              entry_revision: parsed.contract.entryRevision,
            },
          }
        : {}),
    },
    request
  )
}
