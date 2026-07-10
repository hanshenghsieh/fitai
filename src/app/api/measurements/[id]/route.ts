import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadBodyMeasurementsForUser } from '@/lib/app/analytics-data'
import { validateBodyMetrics } from '@/lib/body-measurement-save'

type RouteCtx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const patch: Record<string, unknown> = {}
  if (body.weight_kg != null) patch.weight_kg = Number(body.weight_kg)
  if (body.body_fat_pct != null) patch.body_fat_pct = body.body_fat_pct === '' ? null : Number(body.body_fat_pct)
  if (body.waist_cm != null) patch.waist_cm = body.waist_cm === '' ? null : Number(body.waist_cm)
  if (body.muscle_mass_kg != null) patch.muscle_mass_kg = body.muscle_mass_kg === '' ? null : Number(body.muscle_mass_kg)
  if (body.measured_at != null) patch.measured_at = body.measured_at

  if (patch.weight_kg != null) {
    const err = validateBodyMetrics(Number(patch.weight_kg), patch.body_fat_pct as number | null)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('body_measurements')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const measurements = await loadBodyMeasurementsForUser(supabase, user.id)
  const latest = measurements.at(-1)
  if (latest && latest.id === id) {
    await supabase
      .from('user_profiles')
      .update({
        weight_kg: latest.weight_kg,
        body_fat_pct: latest.body_fat_pct ?? null,
        muscle_mass_kg: latest.muscle_mass_kg ?? null,
      })
      .eq('id', user.id)
  }

  return NextResponse.json({ measurement: data, measurements })
}

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('body_measurements').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const measurements = await loadBodyMeasurementsForUser(supabase, user.id)
  const latest = measurements.at(-1)
  if (latest) {
    await supabase
      .from('user_profiles')
      .update({
        weight_kg: latest.weight_kg,
        body_fat_pct: latest.body_fat_pct ?? null,
      })
      .eq('id', user.id)
  }

  return NextResponse.json({ measurements })
}
