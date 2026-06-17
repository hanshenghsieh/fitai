'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import type { DayPlan, DailyCheckin } from '@/types'

interface Props {
  todayPlan: DayPlan
  checkin: DailyCheckin | null
  weeklyPlanId: string | null
}

export default function BetterBitHome({ todayPlan, checkin, weeklyPlanId }: Props) {
  const [expandedMeal, setExpandedMeal] = useState<string | null>('breakfast')
  const [dietCompleted, setDietCompleted] = useState(0)

  const completedBreakfast = checkin?.diet_items?.find(d => d.meal_id === 'breakfast')?.completed ?? false
  const completedLunch = checkin?.diet_items?.find(d => d.meal_id === 'lunch')?.completed ?? false
  const completedDinner = checkin?.diet_items?.find(d => d.meal_id === 'dinner')?.completed ?? false

  const handleCompleteTask = async (mealId: string) => {
    // 更新數據庫邏輯
    console.log('Complete:', mealId)

    // 顯示成功反饋
    setDietCompleted(prev => prev + 1)
  }

  return (
    <div className="space-y-4 px-4 py-4 pb-24">
      {/* 今日統計 - 簡潔卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          emoji="🔥"
          value={`${todayPlan.daily_targets.calories}`}
          unit="kcal"
          subtext="目標熱量"
        />
        <StatCard
          emoji="💪"
          value={`${todayPlan.daily_targets.protein_g}`}
          unit="g"
          subtext="蛋白質"
        />
        <StatCard
          emoji="⏱️"
          value="30"
          unit="min"
          subtext="今日運動"
        />
      </div>

      {/* 今日任務 - 卡片式，可展開 */}
      <div className="space-y-2">
        {/* 早餐 */}
        <TaskCard
          mealType="早餐"
          emoji="☀️"
          isCompleted={completedBreakfast}
          isExpanded={expandedMeal === 'breakfast'}
          onToggleExpand={() => setExpandedMeal(expandedMeal === 'breakfast' ? null : 'breakfast')}
          onComplete={() => handleCompleteTask('breakfast')}
          meal={todayPlan.meals[0]}
        />

        {/* 午餐 */}
        <TaskCard
          mealType="午餐"
          emoji="🌞"
          isCompleted={completedLunch}
          isExpanded={expandedMeal === 'lunch'}
          onToggleExpand={() => setExpandedMeal(expandedMeal === 'lunch' ? null : 'lunch')}
          onComplete={() => handleCompleteTask('lunch')}
          meal={todayPlan.meals[1]}
        />

        {/* 晚餐 */}
        <TaskCard
          mealType="晚餐"
          emoji="🌙"
          isCompleted={completedDinner}
          isExpanded={expandedMeal === 'dinner'}
          onToggleExpand={() => setExpandedMeal(expandedMeal === 'dinner' ? null : 'dinner')}
          onComplete={() => handleCompleteTask('dinner')}
          meal={todayPlan.meals[2]}
        />

        {/* 運動 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-green-300 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCompleteTask('workout')}
              className="flex-shrink-0"
            >
              <Circle className="w-6 h-6 text-gray-300" />
            </button>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">💪 運動</p>
              <p className="text-sm text-gray-500">快走 30 分鐘</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">下午 3 點</p>
              <p className="text-xs text-green-600 font-medium">已提醒</p>
            </div>
          </div>
        </div>

        {/* 喝水 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="font-semibold text-gray-800 mb-2">💧 喝水進度</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-400" style={{ width: '37.5%' }} />
            </div>
            <p className="text-xs text-gray-500">3/8</p>
          </div>
          <p className="text-xs text-gray-500">還需 5 杯</p>
        </div>
      </div>

      {/* 本週成績 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">連續完成</p>
          <p className="text-2xl font-bold text-green-600">3 天</p>
          <p className="text-xs text-gray-400 mt-1">✓ ✓ ✓</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">本月完成</p>
          <p className="text-2xl font-bold text-green-600">85%</p>
          <p className="text-xs text-gray-400 mt-1">15/18 天</p>
        </div>
      </div>
    </div>
  )
}

// 統計卡片組件
function StatCard({ emoji, value, unit, subtext }: any) {
  return (
    <div className="bg-white rounded-2xl p-3 border border-gray-100 text-center hover:border-green-300 transition-colors">
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500">{subtext}</p>
    </div>
  )
}

// 任務卡片組件
function TaskCard({
  mealType,
  emoji,
  isCompleted,
  isExpanded,
  onToggleExpand,
  onComplete,
  meal,
}: any) {
  return (
    <div className={`bg-white rounded-2xl border transition-all ${
      isCompleted
        ? 'border-gray-200 bg-gray-50'
        : 'border-gray-100 hover:border-green-300'
    }`}>
      {/* 標題欄 */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onComplete}
            className="flex-shrink-0 transition-transform hover:scale-110"
          >
            {isCompleted ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <Circle className="w-6 h-6 text-gray-300" />
            )}
          </button>

          <button
            onClick={onToggleExpand}
            className="flex-1 text-left"
          >
            <p className={`font-semibold transition-colors ${
              isCompleted ? 'text-gray-400' : 'text-gray-800'
            }`}>
              {emoji} {mealType}
            </p>
            {meal && (
              <p className={`text-sm transition-colors ${
                isCompleted ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {meal.items.map((i: any) => i.name_zh).join(' · ')}
              </p>
            )}
          </button>

          <button
            onClick={onToggleExpand}
            className="flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* 展開內容 */}
      {isExpanded && meal && (
        <>
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-600 mb-3">食材明細</p>
            <div className="space-y-2">
              {meal.items.map((item: any) => (
                <div key={item.id} className="flex gap-2 text-xs text-gray-600">
                  <span className="font-medium">{item.name_zh}</span>
                  <span className="text-gray-400">{item.portion}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2 justify-end">
            <button className="text-xs font-medium text-green-600 hover:text-green-700">
              換菜單
            </button>
            <span className="text-gray-300">|</span>
            <button className="text-xs font-medium text-red-600 hover:text-red-700">
              刪除
            </button>
          </div>
        </>
      )}

      {/* 營養概覽 (摺疊時) */}
      {!isExpanded && meal && (
        <div className="px-4 pb-3 flex gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium text-gray-700">{meal.total_calories}</span>
            <span> kcal</span>
          </div>
          <div>
            <span className="font-medium text-green-600">{meal.items.reduce((s: number, i: any) => s + i.protein_g, 0)}</span>
            <span> g 蛋白</span>
          </div>
        </div>
      )}
    </div>
  )
}
