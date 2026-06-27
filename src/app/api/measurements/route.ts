import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateRegenNeed, triggerPlanRegeneration } from '@/lib/plan-regen'

async function upsertBodyMeasurement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: {
    measured_at?: string
    weight_kg?: number | null
    body_fat_pct?: number | null
    muscle_mass_kg?: number | null
    waist_cm?: number | null
    hip_cm?: number | null
    chest_cm?: number | null
  }
) {
  const measuredAt = body.measured_at ?? new Date().toISOString().split('T')[0]
  const payload = {
    weight_kg: body.weight_kg ?? null,
    body_fat_pct: body.body_fat_pct ?? null,
    muscle_mass_kg: body.muscle_mass_kg ?? null,
    waist_cm: body.waist_cm ?? null,
    hip_cm: body.hip_cm ?? null,
    chest_cm: body.chest_cm ?? null,
  }

  const { data: existing } = await supabase
    .from('body_measurements')
    .select('id')
    .eq('user_id', userId)
    .eq('measured_at', measuredAt)
    .maybeSingle()

  if (existing?.id) {
    return supabase
      .from('body_measurements')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
  }

  return supabase
    .from('body_measurements')
    .insert({ user_id: userId, measured_at: measuredAt, ...payload })
    .select()
    .single()
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: true })
    .limit(52)

  return NextResponse.json({ measurements: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data: prevProfile } = await supabase
    .from('user_profiles')
    .select('weight_kg, body_fat_pct')
    .eq('id', user.id)
    .single()

  const { data, error } = await upsertBodyMeasurement(supabase, user.id, body)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: profileError } = await supabase.from('user_profiles').update({
    weight_kg: body.weight_kg ?? undefined,
    body_fat_pct: body.body_fat_pct ?? undefined,
    muscle_mass_kg: body.muscle_mass_kg ?? undefined,
  }).eq('id', user.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  const regenDecision = evaluateRegenNeed(
    {
      weight_kg: prevProfile?.weight_kg,
      body_fat_pct: prevProfile?.body_fat_pct,
    },
    {
      weight_kg: body.weight_kg ?? prevProfile?.weight_kg,
      body_fat_pct: body.body_fat_pct ?? prevProfile?.body_fat_pct,
    }
  )

  let planRegenerated = false
  let regenSummary: string | null = null
  let regenError: string | null = null

  if (regenDecision.shouldRegen && regenDecision.summary) {
    const result = await triggerPlanRegeneration(user.id, regenDecision.summary)
    planRegenerated = result.ok
    regenSummary = regenDecision.summary
    if (!result.ok) regenError = result.error ?? '重算失敗'
  }

  return NextResponse.json({
    measurement: data,
    planRegenerated,
    regenSummary,
    regenError,
  })
}
