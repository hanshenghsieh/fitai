import { redirect } from 'next/navigation'
import { colors } from '@/lib/design-system'
import SettingsScreen from '@/components/settings/SettingsScreen'
import { getAccessStatus } from '@/lib/subscription-access'
import { getNutritionDayKey } from '@/lib/timezone'
import { userMemoryFromCheckin } from '@/lib/checkin-utils'
import type { WorkSchedule } from '@/lib/human-mode'
import { getAppUser } from '@/lib/supabase/app-session'

export const dynamic = 'force-dynamic'

const PROFILE_FIELDS =
  'id, display_name, weight_kg, body_fat_pct, created_at, gender, age, height_cm, goal_type, activity_level, is_vegetarian, is_vegan, is_halal, is_gluten_free, allergens, disliked_foods, food_budget, onboarding_completed'

export default async function SettingsPage() {
  const { supabase, user } = await getAppUser()
  if (!user) redirect('/login')

  const today = getNutritionDayKey()

  const [{ data: profile }, { data: subscription }, { data: checkin }] = await Promise.all([
    supabase.from('user_profiles').select(PROFILE_FIELDS).eq('id', user.id).single(),
    supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('daily_checkins')
      .select('notes, diet_items, workout_items, water_ml, weekly_plan_id, checkin_date')
      .eq('user_id', user.id)
      .eq('checkin_date', today)
      .maybeSingle(),
  ])

  const access = getAccessStatus(profile?.created_at ?? new Date().toISOString(), subscription)
  const memory = userMemoryFromCheckin(checkin ?? null)
  const initialWorkSchedule = (memory.work_schedule ?? 'standard') as WorkSchedule
  const initialEatingContext = memory.eating_context ?? 'solo'

  return (
    <div className="max-w-lg mx-auto pb-6" style={{ backgroundColor: colors.bg.canvas }}>
      <SettingsScreen
        profile={profile}
        email={user.email ?? ''}
        access={access}
        initialWorkSchedule={initialWorkSchedule}
        initialEatingContext={initialEatingContext}
      />
    </div>
  )
}
