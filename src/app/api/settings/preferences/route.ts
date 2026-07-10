import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { mergePreferences, type UserSettingsPreferences } from '@/lib/settings/user-settings-types'
import { loadSettingsBundle } from '@/lib/app/settings-data'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const bundle = await loadSettingsBundle(supabase, user.id, user)
  return jsonWithCors({ preferences: bundle.preferences }, request)
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const body = (await request.json()) as Partial<UserSettingsPreferences>
  const { data: current } = await supabase
    .from('user_profiles')
    .select('settings_preferences')
    .eq('id', user.id)
    .maybeSingle()

  const merged = mergePreferences({
    ...(current?.settings_preferences as UserSettingsPreferences | null),
    ...body,
    notifications: { ...mergePreferences(null).notifications, ...body.notifications },
    photo: { ...mergePreferences(null).photo, ...body.photo },
    diet_extras: { ...mergePreferences(null).diet_extras, ...body.diet_extras },
    ui: { ...mergePreferences(null).ui, ...body.ui },
  })

  const { error } = await supabase
    .from('user_profiles')
    .update({ settings_preferences: merged, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    if (error.message.includes('settings_preferences')) {
      return jsonWithCors(
        { error: 'settings_preferences column missing — run migration 004', clientOnly: true, preferences: merged },
        request,
        { status: 503 }
      )
    }
    return jsonWithCors({ error: error.message }, request, { status: 500 })
  }

  return jsonWithCors({ preferences: merged }, request)
}
