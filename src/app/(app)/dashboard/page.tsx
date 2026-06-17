export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, differenceInDays } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { redirect } from 'next/navigation'
import type { WeeklyPlanData, DayPlan } from '@/types'
import NotificationPrompt from '@/components/dashboard/NotificationPrompt'
import BetterBitHome from '@/components/dashboard/BetterBitHome'

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

  return (
    <div className="max-w-lg mx-auto bg-slate-50 min-h-screen">
      {/* Push notification prompt */}
      <NotificationPrompt />

      {/* BetterBit Header - 簡潔設計 */}
      <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
        {/* 靈魂標語 */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">今天不用想太多，</p>
          <h1 className="text-3xl font-bold text-gray-800">照著做就好。</h1>
        </div>

        {/* 日期 */}
        <p className="text-sm text-gray-400">
          {format(today, 'M月d日 EEEE', { locale: zhTW })}
        </p>
      </div>

      {/* 生成計畫狀態 */}
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

      {/* 還沒有計畫 */}
      {!weeklyPlan || !planData?.days?.length ? (
        <div className="m-4 p-6 bg-white rounded-2xl border border-gray-100 text-center">
          <p className="text-gray-600 text-sm mb-4">還沒有本週計畫</p>
          <GeneratePlanButton />
        </div>
      ) : (
        <>
          {/* AI 教練建議 */}
          {weeklyPlan?.coach_note && (
            <div className="mx-4 mt-4 p-4 bg-green-50 border border-green-200 rounded-2xl">
              <p className="text-xs font-medium text-green-700 mb-2">💡 今週提醒</p>
              <p className="text-sm text-gray-700">{weeklyPlan.coach_note}</p>
            </div>
          )}

          {/* 今日計畫 - 新設計 */}
          {todayPlan && (
            <BetterBitHome
              todayPlan={todayPlan}
              checkin={checkin}
              weeklyPlanId={weeklyPlan?.id ?? null}
            />
          )}
        </>
      )}
    </div>
  )
}

function GeneratePlanButton() {
  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      await fetch('/api/generate-plan', { method: 'POST' })
      window.location.reload()
    }}>
      <button type="submit" className="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
        🔄 重新生成計畫
      </button>
    </form>
  )
}
