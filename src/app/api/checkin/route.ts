import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNutritionDayKey } from '@/lib/timezone'
import { parseCheckinMeta } from '@/lib/checkin-utils'
import { syncBankFromFoodLogs } from '@/lib/banks/calorie-bank-store'
import { differenceInDays, format, parseISO, startOfWeek } from 'date-fns'
import type { WeeklyPlanData, UserProfile } from '@/types'

async function resolveNormalTargetKcal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  nutritionDate: string
): Promise<number | null> {
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
  return days[safeIndex]?.daily_targets?.calories ?? null
}

async function maybeSyncCalorieBank(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  checkin: { notes?: string | null },
  profile: UserProfile | null
) {
  const meta = parseCheckinMeta(checkin)
  const logs = meta.user_memory?.food_logs_today ?? []
  const today = getNutritionDayKey()
  const normalTarget = await resolveNormalTargetKcal(supabase, userId, today)
  if (!normalTarget) return null

  return syncBankFromFoodLogs({
    supabase,
    userId,
    normalTargetKcal: normalTarget,
    foodLogs: logs,
    profile,
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = getNutritionDayKey()
  const { data } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('checkin_date', today)
    .single()

  return NextResponse.json({ checkin: data ?? null })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const today = getNutritionDayKey()

  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert({
      user_id: user.id,
      checkin_date: today,
      ...body,
    }, { onConflict: 'user_id,checkin_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const bank = await maybeSyncCalorieBank(supabase, user.id, data, profile as UserProfile | null)

  return NextResponse.json({ checkin: data, calorie_bank: bank })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const today = getNutritionDayKey()

  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert({
      user_id: user.id,
      checkin_date: today,
      ...body,
    }, { onConflict: 'user_id,checkin_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const bank = await maybeSyncCalorieBank(supabase, user.id, data, profile as UserProfile | null)

  return NextResponse.json({ checkin: data, calorie_bank: bank })
}
