import { redirect } from 'next/navigation'
import { colors } from '@/lib/design-system'
import SettingsScreen from '@/components/settings/SettingsScreen'
import { getAccessStatus } from '@/lib/subscription-access'
import { SUBSCRIPTION_ACCESS_FIELDS } from '@/lib/subscription-types'
import { getAppUser } from '@/lib/supabase/app-session'

export const dynamic = 'force-dynamic'

const PROFILE_FIELDS =
  'id, display_name, weight_kg, body_fat_pct, created_at, gender, age, height_cm, goal_type, activity_level, is_vegetarian, is_vegan, is_halal, is_gluten_free, allergens, disliked_foods, food_budget, onboarding_completed'

export default async function SettingsPage() {
  const { supabase, user } = await getAppUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('user_profiles').select(PROFILE_FIELDS).eq('id', user.id).single(),
    supabase
      .from('subscriptions')
      .select(SUBSCRIPTION_ACCESS_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const access = getAccessStatus(profile?.created_at ?? new Date().toISOString(), subscription, {
    userEmail: user.email,
  })

  return (
    <div className="max-w-lg mx-auto pb-6" style={{ backgroundColor: colors.bg.canvas }}>
      <SettingsScreen profile={profile} email={user.email ?? ''} access={access} />
    </div>
  )
}
