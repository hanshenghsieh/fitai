export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, differenceInDays } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import DailyCheckinView from '@/components/dashboard/DailyCheckinView'
import { redirect } from 'next/navigation'
import type { WeeklyPlanData, DayPlan } from '@/types'
import NotificationPrompt from '@/components/dashboard/NotificationPrompt'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [{ data: profile }, { data: weeklyPlan }, { data: checkin }, { data: goal }] = await Promise.all([
    supabase.from('user_profiles').select('display_name, weight_kg, body_fat_pct').eq('id', user.id).single(),
    supabase.from('weekly_plans').select('*').eq('user_id', user.id).eq('week_start', weekStart).single(),
    supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('checkin_date', todayStr).single(),
    supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
  ])

  const planData = weeklyPlan?.plan_data as WeeklyPlanData | null
  const dayOfWeek = differenceInDays(today, new Date(weekStart))
  const todayPlan: DayPlan | null = planData?.days?.[dayOfWeek] ?? null

  const activeGoal = goal?.[0]
  const daysLeft = activeGoal ? differenceInDays(new Date(activeGoal.end_date), today) : null

  const greeting = today.getHours() < 12 ? '早安' : today.getHours() < 18 ? '午安' : '晚安'

  return (
    <div className="max-w-lg mx-auto">
      {/* Push notification prompt */}
      <NotificationPrompt />

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-4 pt-12 pb-6 text-white">
        <p className="text-emerald-100 text-sm">{greeting}，</p>
        <h1 className="text-2xl font-bold mt-0.5">{profile?.display_name ?? '訓練者'} 💪</h1>
        <p className="text-emerald-100 text-sm mt-1">
          {format(today, 'M月d日 EEEE', { locale: zhTW })}
        </p>
        {daysLeft !== null && daysLeft > 0 && (
          <div className="mt-3 bg-white/20 rounded-xl px-3 py-2 inline-block">
            <span className="text-sm">距離目標還有 <strong>{daysLeft}</strong> 天</span>
          </div>
        )}
      </div>

      {/* Plan status */}
      {weeklyPlan?.generation_status === 'generating' && (
        <div className="m-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 text-center">
          ⏳ AI 正在生成你的計畫，請稍候...
        </div>
      )}

      {weeklyPlan?.generation_status === 'failed' && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center">
          計畫生成失敗，請稍後重試
        </div>
      )}

      {/* No plan yet */}
      {!weeklyPlan || !planData?.days?.length ? (
        <div className="m-4 p-6 bg-white rounded-xl shadow-sm text-center">
          <p className="text-gray-500 text-sm">尚未有本週計畫</p>
          <GeneratePlanButton />
        </div>
      ) : null}

      {/* Coach note */}
      {weeklyPlan?.coach_note && (
        <div className="mx-4 mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
          <p className="text-xs font-medium text-emerald-600 mb-1">💬 AI 教練本週提醒</p>
          <p className="text-sm text-gray-700">{weeklyPlan.coach_note}</p>
        </div>
      )}

      {/* Today's plan */}
      {todayPlan && (
        <DailyCheckinView
          todayPlan={todayPlan}
          checkin={checkin}
          weeklyPlanId={weeklyPlan?.id ?? null}
        />
      )}
    </div>
  )
}

function GeneratePlanButton() {
  return (
    <form action="/api/generate-plan" method="POST">
      <button type="submit" className="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
        生成本週計畫
      </button>
    </form>
  )
}
