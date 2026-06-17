'use client'

import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ShoppingCart, MessageSquare } from 'lucide-react'
import type { WeeklyPlanData, WeeklyFeedback } from '@/types'
import WeeklyFeedbackForm from './WeeklyFeedbackForm'

interface Props {
  planData: WeeklyPlanData
  weekStart: string
  todayDayIndex: number
  checkinMap: Record<string, { diet_items: { completed: boolean }[]; workout_items: { completed: boolean }[] } | null>
  existingFeedback: WeeklyFeedback | null
}

const DAY_NAMES = ['一', '二', '三', '四', '五', '六', '日']

export default function WeeklyPlanView({ planData, weekStart, todayDayIndex, checkinMap, existingFeedback }: Props) {
  const [selectedDay, setSelectedDay] = useState(Math.min(todayDayIndex, planData?.days?.length - 1 ?? 0))
  const [showGrocery, setShowGrocery] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const todayPlan = planData?.days?.[selectedDay]
  if (!todayPlan) return <div className="m-4 p-6 text-center text-gray-500">無法載入計畫</div>

  function getDayCompletion(dayIndex: number) {
    const dateStr = format(addDays(new Date(weekStart), dayIndex), 'yyyy-MM-dd')
    const checkin = checkinMap[dateStr]
    if (!checkin) return null
    const dietDone = checkin.diet_items?.filter(i => i.completed).length ?? 0
    const dietTotal = checkin.diet_items?.length ?? 0
    const workDone = checkin.workout_items?.filter(i => i.completed).length ?? 0
    const workTotal = checkin.workout_items?.length ?? 0
    const total = dietTotal + workTotal
    if (total === 0) return null
    return Math.round(((dietDone + workDone) / total) * 100)
  }

  return (
    <div className="px-4 pb-4 mt-4 space-y-4">
      {/* Weekly summary */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-gray-800">{planData.weekly_targets.avg_daily_calories}</p>
            <p className="text-xs text-gray-400">均熱量/天</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600">{planData.weekly_targets.avg_daily_protein_g}g</p>
            <p className="text-xs text-gray-400">均蛋白質/天</p>
          </div>
          <div>
            <p className="text-lg font-bold text-purple-600">{planData.weekly_targets.workout_days}</p>
            <p className="text-xs text-gray-400">訓練天數</p>
          </div>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {planData.days.map((day, i) => {
          const completion = getDayCompletion(i)
          const isToday = i === todayDayIndex
          const isPast = i < todayDayIndex
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-colors min-w-[52px] ${
                selectedDay === i
                  ? 'bg-emerald-500 text-white'
                  : isToday
                  ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-700'
                  : 'bg-white shadow-sm text-gray-600'
              }`}
            >
              <span className="text-xs">{DAY_NAMES[i]}</span>
              <span className="text-sm font-bold mt-0.5">
                {format(addDays(new Date(weekStart), i), 'd')}
              </span>
              {completion !== null && (
                <div className={`w-1.5 h-1.5 rounded-full mt-1 ${completion >= 80 ? 'bg-emerald-400' : completion >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} />
              )}
              {completion === null && isPast && (
                <div className="w-1.5 h-1.5 rounded-full mt-1 bg-gray-200" />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      {todayPlan && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-orange-50">
              <h3 className="font-bold text-gray-800">🥗 飲食計畫</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                總熱量 {todayPlan.meals.reduce((s, m) => s + m.total_calories, 0)} kcal ·
                蛋白質 {todayPlan.daily_targets.protein_g.toFixed(0)}g
              </p>
            </div>
            {todayPlan.meals.map(meal => (
              <div key={meal.type} className="px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-medium text-sm text-gray-700">{meal.type_zh}</p>
                  <p className="text-xs text-gray-400">{meal.total_calories} kcal</p>
                </div>
                {meal.items.map(item => {
                  const emoji = item.name_zh === '蛋' ? '🥚' : item.name_zh === '吐司' ? '🍞' : item.name_zh === '雞肉' ? '🍗' : item.name_zh === '白飯' ? '🍚' : item.name_zh === '鮭魚' ? '🐟' : item.name_zh === '地瓜' ? '🍠' : '🍽️';
                  return (
                    <div key={item.id} className="flex items-center gap-2 mt-2">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                        {(item as any).photo_url ? (
                          <img src={(item as any).photo_url} alt={item.name_zh} className="w-full h-full object-cover rounded-lg" />
                        ) : emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700">{item.name_zh}</p>
                        <p className="text-xs text-gray-400">
                          {(item as any).quantity ? `${(item as any).quantity} · ` : ''}{item.portion} · {item.preparation}
                        </p>
                        {(item as any).portionDesc && (
                          <p className="text-xs text-gray-500 italic">({(item as any).portionDesc})</p>
                        )}
                        <p className="text-xs text-emerald-600 mt-0.5">蛋{item.protein_g}g · {item.calories} kcal</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-purple-50">
              <h3 className="font-bold text-gray-800">💪 訓練計畫</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {todayPlan.workout.type_zh} · {todayPlan.workout.estimated_duration_mins} 分鐘
              </p>
            </div>
            {todayPlan.workout.type === 'rest' ? (
              <div className="px-4 py-5 text-center text-gray-400 text-sm">😴 休息日 — 充分恢復</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {[
                  { label: '🔥 暖身', items: todayPlan.workout.warmup },
                  { label: '💪 主訓練', items: todayPlan.workout.main },
                  { label: '🧊 收操', items: todayPlan.workout.cooldown },
                ].filter(s => s.items.length > 0).map(section => (
                  <div key={section.label} className="px-4 py-2">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">{section.label}</p>
                    {section.items.map(ex => (
                      <div key={ex.exercise_id} className="flex justify-between items-center py-1">
                        <div>
                          <p className="text-sm text-gray-700">{ex.exercise_name_zh}</p>
                          <p className="text-xs text-gray-400">
                            {ex.sets}組 × {ex.duration_secs ? `${ex.duration_secs}秒` : `${ex.reps}次`} · 休{ex.rest_secs}秒
                          </p>
                        </div>
                        {ex.youtube_id && (
                          <a href={`https://www.youtube.com/watch?v=${ex.youtube_id}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-red-500 hover:underline ml-2 flex-shrink-0">
                            教學▶
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grocery list */}
      <div className="bg-white rounded-xl shadow-sm">
        <button
          className="w-full px-4 py-3 flex items-center gap-2 text-left"
          onClick={() => setShowGrocery(!showGrocery)}
        >
          <ShoppingCart className="h-5 w-5 text-emerald-500" />
          <span className="font-bold text-gray-800 flex-1">本週採購清單</span>
          {showGrocery ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {showGrocery && (
          <div className="px-4 pb-4 pt-0 space-y-3">
            {planData.grocery_list.map(cat => (
              <div key={cat.category}>
                <p className="text-xs font-medium text-gray-500 mb-1">{cat.category}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map(item => (
                    <span key={item} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly feedback */}
      <div className="bg-white rounded-xl shadow-sm">
        <button
          className="w-full px-4 py-3 flex items-center gap-2 text-left"
          onClick={() => setShowFeedback(!showFeedback)}
        >
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <span className="font-bold text-gray-800 flex-1">
            {existingFeedback ? '本週回饋（已提交）' : '本週回饋 · 幫助 AI 調整下週計畫'}
          </span>
          {showFeedback ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {showFeedback && (
          <div className="px-4 pb-4">
            <WeeklyFeedbackForm existing={existingFeedback} />
          </div>
        )}
      </div>
    </div>
  )
}
