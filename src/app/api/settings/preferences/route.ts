import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mergePreferences, type UserSettingsPreferences } from '@/lib/settings/user-settings-types'
import { loadSettingsBundle } from '@/lib/app/settings-data'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bundle = await loadSettingsBundle(supabase, user.id, user)
  return NextResponse.json({ preferences: bundle.preferences })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      return NextResponse.json(
        { error: 'settings_preferences column missing — run migration 004', clientOnly: true, preferences: merged },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ preferences: merged })
}
