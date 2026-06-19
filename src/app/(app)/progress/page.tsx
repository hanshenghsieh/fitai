export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, subWeeks } from 'date-fns'
import { colors } from '@/lib/design-system'
import ProgressCharts from '@/components/progress/ProgressCharts'
import MeasurementForm from '@/components/progress/MeasurementForm'
import UpgradeGate from '@/components/subscription/UpgradeGate'
import { getAccessStatus } from '@/lib/subscription-access'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const eightWeeksAgo = format(subWeeks(new Date(), 8), 'yyyy-MM-dd')

  const [{ data: profile }, { data: subscription }, { data: measurements }, { data: plans }, { data: goal }] = await Promise.all([
    supabase.from('user_profiles').select('created_at, weight_kg').eq('id', user.id).single(),
    supabase.from('subscriptions').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('body_measurements').select('*').eq('user_id', user.id)
      .gte('measured_at', eightWeeksAgo).order('measured_at', { ascending: true }),
    supabase.from('weekly_plans').select('week_start,week_number,previous_completion_rate,previous_workout_rate')
      .eq('user_id', user.id).order('week_start', { ascending: true }).limit(12),
    supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
  ])

  const access = getAccessStatus(profile?.created_at ?? new Date().toISOString(), subscription)
  const activeGoal = goal?.[0] ?? null
  const latestWeight = measurements?.[measurements.length - 1]?.weight_kg ?? profile?.weight_kg

  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ backgroundColor: colors.bg.canvas }}>
      <div className="px-4 pt-12 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.accent.action }}>
          進度追蹤
        </p>
        <h1 className="text-[22px] font-semibold mt-1" style={{ color: colors.text.primary }}>
          你有在變嗎？
        </h1>
        <p className="text-[13px] mt-1" style={{ color: colors.text.secondary }}>
          體重變化夠大時，系統會自動重算熱量、蛋白質與課表。
        </p>
      </div>

      <div className="px-4 pb-4 space-y-4">
        <MeasurementForm lastWeightKg={latestWeight ?? null} />
        <UpgradeGate access={access} feature="進度分析與計畫調整">
          <ProgressCharts
            measurements={measurements ?? []}
            plans={plans ?? []}
            goal={activeGoal}
          />
        </UpgradeGate>
      </div>
    </div>
  )
}
