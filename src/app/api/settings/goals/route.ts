import { addDays, format } from 'date-fns'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GOAL_SELECT, PROFILE_SELECT, loadSettingsBundle } from '@/lib/app/settings-data'
import { generateWeeklyPlanForUser } from '@/lib/generate-weekly-plan'
import type { GoalType } from '@/types'

const VALID_GOAL_TYPES: GoalType[] = [
  'lose_fat',
  'lose_weight',
  'gain_muscle',
  'maintain',
  'body_recomp',
]

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bundle = await loadSettingsBundle(supabase, user.id, user)
  return NextResponse.json({ goal: bundle.goal, preferences: bundle.preferences, profile: bundle.profile })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const goalType = body.goal_type as GoalType | undefined
  if (goalType && !VALID_GOAL_TYPES.includes(goalType)) {
    return NextResponse.json({ error: 'Invalid goal_type' }, { status: 400 })
  }

  const targetDays =
    body.target_days != null ? Number(body.target_days) : body.goal_months != null ? Number(body.goal_months) * 30 : null
  const endDate =
    targetDays != null && Number.isFinite(targetDays)
      ? format(addDays(new Date(), targetDays), 'yyyy-MM-dd')
      : body.end_date

  const goalPatch = {
    goal_type: goalType,
    target_weight_kg: body.target_weight_kg != null ? Number(body.target_weight_kg) : undefined,
    target_body_fat_pct: body.target_body_fat_pct != null ? Number(body.target_body_fat_pct) : undefined,
    end_date: endDate,
  }

  const cleaned = Object.fromEntries(
    Object.entries(goalPatch).filter(([, v]) => v !== undefined)
  )

  const { data: existing } = await supabase
    .from('goals')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  let goalRow
  if (existing?.id) {
    const { data, error } = await supabase
      .from('goals')
      .update(cleaned)
      .eq('id', existing.id)
      .select(GOAL_SELECT)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    goalRow = data
  } else {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('weight_kg, body_fat_pct')
      .eq('id', user.id)
      .single()
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        goal_type: goalType ?? 'lose_fat',
        target_weight_kg: body.target_weight_kg != null ? Number(body.target_weight_kg) : null,
        target_body_fat_pct: body.target_body_fat_pct != null ? Number(body.target_body_fat_pct) : null,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: endDate ?? format(addDays(new Date(), 90), 'yyyy-MM-dd'),
        start_weight_kg: profile?.weight_kg ?? null,
        start_body_fat_pct: profile?.body_fat_pct ?? null,
        is_active: true,
      })
      .select(GOAL_SELECT)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    goalRow = data
  }

  if (body.preferences && typeof body.preferences === 'object') {
    const { data: current } = await supabase
      .from('user_profiles')
      .select('settings_preferences')
      .eq('id', user.id)
      .maybeSingle()
    const merged = {
      ...(current?.settings_preferences as Record<string, unknown> | null),
      ...body.preferences,
    }
    await supabase
      .from('user_profiles')
      .update({ settings_preferences: merged, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  let planRegenerated = false
  let regenError: string | null = null
  try {
    const result = await generateWeeklyPlanForUser(supabase, {
      userId: user.id,
      userEmail: user.email ?? null,
      regenReason: 'settings goal update',
    })
    planRegenerated = result.ok
    if (!result.ok) regenError = result.error ?? 'plan regen failed'
  } catch {
    regenError = 'plan regen failed'
  }

  const { data: profile } = await supabase.from('user_profiles').select(PROFILE_SELECT).eq('id', user.id).single()

  return NextResponse.json({ goal: goalRow, profile, planRegenerated, regenError })
}
