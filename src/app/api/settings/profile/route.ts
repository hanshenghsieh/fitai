import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROFILE_SELECT, loadSettingsBundle } from '@/lib/app/settings-data'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bundle = await loadSettingsBundle(supabase, user.id, user)
  return NextResponse.json(bundle)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const patch: Record<string, unknown> = {}

  if (body.display_name !== undefined) patch.display_name = body.display_name || null
  if (body.gender !== undefined) patch.gender = body.gender || null
  if (body.age !== undefined) patch.age = body.age != null ? Number(body.age) : null
  if (body.height_cm !== undefined) patch.height_cm = body.height_cm != null ? Number(body.height_cm) : null
  if (body.activity_level !== undefined) patch.activity_level = body.activity_level
  if (body.fitness_level !== undefined) patch.fitness_level = body.fitness_level
  if (body.is_vegetarian !== undefined) patch.is_vegetarian = Boolean(body.is_vegetarian)
  if (body.is_vegan !== undefined) patch.is_vegan = Boolean(body.is_vegan)
  if (body.is_halal !== undefined) patch.is_halal = Boolean(body.is_halal)
  if (body.is_gluten_free !== undefined) patch.is_gluten_free = Boolean(body.is_gluten_free)
  if (body.allergens !== undefined) patch.allergens = body.allergens
  if (body.disliked_foods !== undefined) patch.disliked_foods = body.disliked_foods
  if (body.food_budget !== undefined) patch.food_budget = body.food_budget
  if (body.weight_kg !== undefined) patch.weight_kg = body.weight_kg != null ? Number(body.weight_kg) : null
  if (body.body_fat_pct !== undefined) patch.body_fat_pct = body.body_fat_pct != null ? Number(body.body_fat_pct) : null
  if (body.muscle_mass_kg !== undefined) patch.muscle_mass_kg = body.muscle_mass_kg != null ? Number(body.muscle_mass_kg) : null
  if (body.sleep_hours_target !== undefined) {
    patch.sleep_hours_target = body.sleep_hours_target != null ? Number(body.sleep_hours_target) : null
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
    patch.settings_preferences = merged
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('user_profiles')
    .update(patch)
    .eq('id', user.id)
    .select(PROFILE_SELECT)
    .single()

  if (error) {
    if (error.message.includes('settings_preferences')) {
      const { settings_preferences: _prefs, ...profilePatch } = patch
      if (Object.keys(profilePatch).length <= 1) {
        return NextResponse.json(
          { error: 'settings_preferences column missing — run migration 004', clientOnly: true },
          { status: 503 }
        )
      }
      const { data: fallback, error: fbErr } = await supabase
        .from('user_profiles')
        .update(profilePatch)
        .eq('id', user.id)
        .select(PROFILE_SELECT.replace(', settings_preferences', ''))
        .single()
      if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 500 })
      return NextResponse.json({ profile: fallback, preferencesClientOnly: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}
