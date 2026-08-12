import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { loadBodyMeasurementsForUser } from '@/lib/app/analytics-data'
import { saveBodyMeasurementForUser, validateBodyMetrics } from '@/lib/body-measurement-save'
import { captureError } from '@/lib/observability/capture-error'

// PATCH/DELETE for editing or removing a single measurement live at
// /api/measurements/[id] (a real dynamic route). This file previously also
// exported PATCH/DELETE handlers that destructured `ctx.params.id` despite
// this route (`/api/settings/body`, no [id] segment) never receiving one —
// any call would 500 on `.eq('id', undefined)`. Confirmed via
// `useSettingsData.ts`'s `updateSettings` (the only caller shape that would
// have hit it) that nothing in the app actually calls PATCH/DELETE here —
// removed rather than "fixed in place" to avoid leaving a second,
// differently-routed copy of /api/measurements/[id]'s logic to drift out of
// sync.

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const body = await request.json()
  const weightKg = Number(body.weight_kg)
  const bodyFatPct = body.body_fat_pct != null && body.body_fat_pct !== '' ? Number(body.body_fat_pct) : null
  const waistCm = body.waist_cm != null && body.waist_cm !== '' ? Number(body.waist_cm) : null
  const muscleMassKg =
    body.muscle_mass_kg != null && body.muscle_mass_kg !== '' ? Number(body.muscle_mass_kg) : null

  const validation = validateBodyMetrics(weightKg, bodyFatPct)
  if (validation) return jsonWithCors({ error: validation }, request, { status: 400 })

  const result = await saveBodyMeasurementForUser(supabase, user.id, {
    weight_kg: weightKg,
    body_fat_pct: bodyFatPct,
    measured_at: body.measured_at,
  })

  if (result.error) return jsonWithCors({ error: result.error.message }, request, { status: 500 })

  if (waistCm != null || muscleMassKg != null) {
    if (result.row?.id) {
      const { error: waistError } = await supabase
        .from('body_measurements')
        .update({
          waist_cm: waistCm,
          muscle_mass_kg: muscleMassKg,
        })
        .eq('id', result.row.id)
      // Non-fatal — the weight itself already saved successfully above, and
      // failing the whole request over an optional secondary field would be
      // worse UX. Still must not silently disappear: report it so it's
      // visible instead of masked as a full success.
      if (waistError) {
        captureError(waistError, { feature: 'settings-body', operation: 'update-waist-muscle', userId: user.id })
      }
    }
  }

  const measurements = await loadBodyMeasurementsForUser(supabase, user.id)
  return jsonWithCors({ measurements, profileSaved: result.profileSaved }, request)
}
