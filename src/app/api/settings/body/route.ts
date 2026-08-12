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
  let userId: string | null = null
  // Build 38 — correlates this server-side log with the client-side
  // [API_REQUEST]/[API_RESPONSE_ERROR] log for the same attempt (see
  // src/lib/api/client.ts's X-Client-Request-Id header). Never in the URL.
  const requestId = request.headers.get('X-Client-Request-Id')
  console.log('[WEIGHT_TRACE:3_route_entered]', { request_id: requestId })
  try {
    const auth = await requireApiUser(request)
    if (!auth.ok) return auth.response
    const { user, supabase } = auth
    userId = user.id
    console.log('[WEIGHT_TRACE:4_auth_success]', { request_id: requestId, userId: user.id })

    const body = await request.json()
    const weightKg = Number(body.weight_kg)
    const bodyFatPct = body.body_fat_pct != null && body.body_fat_pct !== '' ? Number(body.body_fat_pct) : null
    const waistCm = body.waist_cm != null && body.waist_cm !== '' ? Number(body.waist_cm) : null
    const muscleMassKg =
      body.muscle_mass_kg != null && body.muscle_mass_kg !== '' ? Number(body.muscle_mass_kg) : null

    const validation = validateBodyMetrics(weightKg, bodyFatPct)
    if (validation) return jsonWithCors({ error: validation }, request, { status: 400 })

    const result = await saveBodyMeasurementForUser(
      supabase,
      user.id,
      {
        weight_kg: weightKg,
        body_fat_pct: bodyFatPct,
        measured_at: body.measured_at,
      },
      requestId
    )

    if (result.error) {
      // Build 38 — the previous 500 was undiagnosable because only
      // `.message` (the least useful Postgrest field) ever reached logs.
      // Log the full code/details/hint here so a recurrence is actually
      // debuggable, without exposing internals to the client response.
      console.error('settings/body save failed:', {
        request_id: requestId,
        userId: user.id,
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
      })
      captureError(new Error(result.error.message), {
        feature: 'settings-body',
        operation: 'save',
        userId: user.id,
        extra: {
          request_id: requestId,
          code: result.error.code ?? null,
          details: result.error.details ?? null,
          hint: result.error.hint ?? null,
        },
      })
      return jsonWithCors({ error: '體重儲存失敗，請稍後再試' }, request, { status: 500 })
    }

    console.log('[WEIGHT_TRACE:13_core_save_completed]', { request_id: requestId })

    if (waistCm != null || muscleMassKg != null) {
      if (result.row?.id) {
        console.log('[WEIGHT_TRACE:14_waist_muscle_update_start]', { request_id: requestId })
        const { error: waistError } = await supabase
          .from('body_measurements')
          .update({
            waist_cm: waistCm,
            muscle_mass_kg: muscleMassKg,
          })
          .eq('id', result.row.id)
        console.log('[WEIGHT_TRACE:15_waist_muscle_update_completed]', { request_id: requestId, ok: !waistError })
        // Non-fatal — the weight itself already saved successfully above, and
        // failing the whole request over an optional secondary field would be
        // worse UX. Still must not silently disappear: report it so it's
        // visible instead of masked as a full success.
        if (waistError) {
          captureError(waistError, { feature: 'settings-body', operation: 'update-waist-muscle', userId: user.id })
        }
      }
    }

    console.log('[WEIGHT_TRACE:16_load_measurements_start]', { request_id: requestId })
    const measurements = await loadBodyMeasurementsForUser(supabase, user.id)
    console.log('[WEIGHT_TRACE:17_load_measurements_completed]', { request_id: requestId })
    return jsonWithCors({ measurements, profileSaved: result.profileSaved }, request)
  } catch (err) {
    // Build 38 — anything that THROWS (not just a returned {error}) used to
    // surface as an opaque, unlogged generic 500 (confirmed via Vercel logs:
    // "level: info", no expandable content). Catching here guarantees the
    // real exception is always captured with a stack trace.
    console.error('settings/body unhandled error:', {
      request_id: requestId,
      ...(err instanceof Error ? { message: err.message, stack: err.stack } : { err }),
    })
    captureError(err, { feature: 'settings-body', operation: 'save', userId, extra: { request_id: requestId } })
    return jsonWithCors({ error: '體重儲存失敗，請稍後再試' }, request, { status: 500 })
  }
}
