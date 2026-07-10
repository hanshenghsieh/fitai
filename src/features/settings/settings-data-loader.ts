import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getAccessStatus, type AccessStatus } from '@/lib/subscription-access'
import { SUBSCRIPTION_ACCESS_FIELDS } from '@/lib/subscription-types'
import { loadSettingsBundle, type SettingsBundle } from '@/lib/app/settings-data'
import packageJson from '../../../package.json'

const PROFILE_FIELDS_MAIN = 'created_at'

export interface SettingsMainPageData {
  access: AccessStatus
  appVersion: string
}

export async function loadSettingsMainPageData(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | null | undefined
): Promise<SettingsMainPageData> {
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('user_profiles').select(PROFILE_FIELDS_MAIN).eq('id', userId).single(),
    supabase
      .from('subscriptions')
      .select(SUBSCRIPTION_ACCESS_FIELDS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const access = getAccessStatus(profile?.created_at ?? new Date().toISOString(), subscription, {
    userEmail,
  })

  return {
    access,
    appVersion: packageJson.version,
  }
}

export async function loadSettingsBundleData(
  supabase: SupabaseClient,
  user: User
): Promise<SettingsBundle> {
  return loadSettingsBundle(supabase, user.id, user)
}

export async function loadPremiumPageData(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | null | undefined
): Promise<{ access: AccessStatus }> {
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('user_profiles').select('created_at').eq('id', userId).single(),
    supabase
      .from('subscriptions')
      .select(SUBSCRIPTION_ACCESS_FIELDS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    access: getAccessStatus(profile?.created_at ?? new Date().toISOString(), subscription, {
      userEmail,
    }),
  }
}
