export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, subWeeks, startOfWeek } from 'date-fns'
import ProgressCharts from '@/components/progress/ProgressCharts'
import MeasurementForm from '@/components/progress/MeasurementForm'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const eightWeeksAgo = format(subWeeks(new Date(), 8), 'yyyy-MM-dd')

  const [{ data: measurements }, { data: plans }, { data: goal }] = await Promise.all([
    supabase.from('body_measurements').select('*').eq('user_id', user.id)
      .gte('measured_at', eightWeeksAgo).order('measured_at', { ascending: true }),
    supabase.from('weekly_plans').select('week_start,week_number,previous_completion_rate,previous_workout_rate')
      .eq('user_id', user.id).order('week_start', { ascending: true }).limit(12),
    supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
  ])

  const activeGoal = goal?.[0] ?? null

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-4 pt-12 pb-6 text-white">
        <h1 className="text-2xl font-bold">進度追蹤</h1>
        <p className="text-emerald-100 text-sm mt-1">數據不會說謊，繼續努力 💪</p>
      </div>

      <div className="px-4 pb-4 mt-4 space-y-4">
        <MeasurementForm />
        <ProgressCharts
          measurements={measurements ?? []}
          plans={plans ?? []}
          goal={activeGoal}
        />
      </div>
    </div>
  )
}
