import { redirect } from 'next/navigation'
import { getAppUser } from '@/lib/supabase/app-session'
import { loadSettingsBundle, type SettingsBundle } from '@/lib/app/settings-data'

export async function requireSettingsBundle(): Promise<SettingsBundle> {
  const { supabase, user } = await getAppUser()
  if (!user) redirect('/login')
  return loadSettingsBundle(supabase, user.id, user)
}
