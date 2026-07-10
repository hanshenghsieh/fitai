import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { saveBodyMeasurementForUser } from '@/lib/body-measurement-save'
import { evaluateRegenNeed, triggerPlanRegeneration } from '@/lib/plan-regen'
import { loadBodyMeasurementsForUser } from '@/lib/app/analytics-data'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const measurements = await loadBodyMeasurementsForUser(supabase, user.id)
  return jsonWithCors({ measurements }, request)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const body = await request.json()
  const weightKg = typeof body.weight_kg === 'number' ? body.weight_kg : parseFloat(body.weight_kg)
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return jsonWithCors({ error: 'Invalid weight_kg' }, request, { status: 400 })
  }

  const bodyFatPct =
    body.body_fat_pct == null || body.body_fat_pct === ''
      ? null
      : typeof body.body_fat_pct === 'number'
        ? body.body_fat_pct
        : parseFloat(body.body_fat_pct)

  const { data: prevProfile } = await supabase
    .from('user_profiles')
    .select('weight_kg, body_fat_pct')
    .eq('id', user.id)
    .single()

  const { error, logSaved, historySaved, row } = await saveBodyMeasurementForUser(supabase, user.id, {
    weight_kg: weightKg,
    body_fat_pct: Number.isFinite(bodyFatPct as number) ? (bodyFatPct as number) : null,
    measured_at: body.measured_at,
  })

  if (error) return jsonWithCors({ error: error.message }, request, { status: 500 })

  const regenDecision = evaluateRegenNeed(
    {
      weight_kg: prevProfile?.weight_kg,
      body_fat_pct: prevProfile?.body_fat_pct,
    },
    {
      weight_kg: weightKg,
      body_fat_pct: Number.isFinite(bodyFatPct as number) ? (bodyFatPct as number) : prevProfile?.body_fat_pct,
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

  const measurements = await loadBodyMeasurementsForUser(supabase, user.id)

  return jsonWithCors(
    {
      measurement: row
        ? { id: row.id, measured_at: row.measured_at, weight_kg: row.weight_kg, created_at: row.created_at }
        : { weight_kg: weightKg, body_fat_pct: bodyFatPct },
      measurements,
      logSaved,
      historySaved,
      planRegenerated,
      regenSummary,
      regenError,
    },
    request
  )
}
