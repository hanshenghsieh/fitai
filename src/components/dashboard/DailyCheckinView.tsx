'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Play, ChevronDown, ChevronUp, Droplets, Flame, Dumbbell } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { DayPlan, DailyCheckin, DietCheckinItem, WorkoutCheckinItem } from '@/types'

interface Props {
  todayPlan: DayPlan
  checkin: DailyCheckin | null
  weeklyPlanId: string | null
}

export default function DailyCheckinView({ todayPlan, checkin, weeklyPlanId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [dietItems, setDietItems] = useState<DietCheckinItem[]>(
    checkin?.diet_items?.length
      ? checkin.diet_items
      : todayPlan.meals.map(m => ({ meal_id: m.type, meal_type: m.type, completed: false }))
  )
  const [workoutItems, setWorkoutItems] = useState<WorkoutCheckinItem[]>(
    checkin?.workout_items?.length
      ? checkin.workout_items
      : todayPlan.workout.main.map(ex => ({ exercise_id: ex.exercise_id, exercise_name: ex.exercise_name_zh, completed: false }))
  )
  const [waterMl, setWaterMl] = useState(checkin?.water_ml ?? 0)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [expandedEx, setExpandedEx] = useState<string | null>(null)

  const dietCompleted = dietItems.filter(i => i.completed).length
  const workoutCompleted = workoutItems.filter(i => i.completed).length
  const waterTarget = todayPlan.daily_targets.water_ml
  const [isCompleted, setIsCompleted] = useState(checkin?.is_completed ?? false)

  const allComplete = dietCompleted === dietItems.length && workoutCompleted === workoutItems.length && waterMl >= waterTarget

  async function saveCheckin(updates: Partial<{ diet_items: DietCheckinItem[]; workout_items: WorkoutCheckinItem[]; water_ml: number; is_completed?: boolean }>) {
    try {
      await fetch('/api/checkin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekly_plan_id: weeklyPlanId,
          diet_items: dietItems,
          workout_items: workoutItems,
          water_ml: waterMl,
          is_completed: isCompleted,
          ...updates,
        }),
      })
    } catch {
      toast.error('儲存失敗，請檢查網路連線')
    }
  }

  async function markAsComplete() {
    if (!allComplete) {
      toast.error('還沒有完成所有項目唷！')
      return
    }
    startTransition(async () => {
      setIsCompleted(true)
      await saveCheckin({ is_completed: true })
      toast.success('🎉 今天達標了！繼續加油！')
    })
  }

  function toggleDiet(mealId: string) {
    startTransition(() => {
      const updated = dietItems.map(i => i.meal_id === mealId ? { ...i, completed: !i.completed } : i)
      setDietItems(updated)
      saveCheckin({ diet_items: updated })
    })
  }

  function toggleWorkout(exerciseId: string) {
    startTransition(() => {
      const updated = workoutItems.map(i => i.exercise_id === exerciseId ? { ...i, completed: !i.completed } : i)
      setWorkoutItems(updated)
      saveCheckin({ workout_items: updated })
    })
  }

  function addWater(ml: number) {
    const newVal = Math.min(waterTarget + 500, waterMl + ml)
    setWaterMl(newVal)
    saveCheckin({ water_ml: newVal })
  }

  const totalCalories = todayPlan.meals.reduce((sum, m) => sum + m.total_calories, 0)

  return (
    <div className="px-4 pb-4 space-y-4 mt-4">
      {/* Daily targets summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <Flame className="h-5 w-5 text-orange-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-800">{todayPlan.daily_targets.calories}</p>
          <p className="text-xs text-gray-400">目標熱量</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <div className="text-base font-bold text-emerald-600 mb-1">{Math.round(todayPlan.daily_targets.protein_g)}g</div>
          <p className="text-lg font-bold text-gray-800">{todayPlan.daily_targets.protein_g.toFixed(0)}</p>
          <p className="text-xs text-gray-400">蛋白質(g)</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <Dumbbell className="h-5 w-5 text-purple-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-800">{todayPlan.workout.estimated_duration_mins}'</p>
          <p className="text-xs text-gray-400">運動時長</p>
        </div>
      </div>

      {/* Diet section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">🥗 今日飲食</h2>
            <p className="text-xs text-gray-400 mt-0.5">{dietCompleted}/{dietItems.length} 餐完成 · 共 {totalCalories} kcal</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-emerald-600">{dietItems.length > 0 ? Math.round((dietCompleted / dietItems.length) * 100) : 0}%</p>
          </div>
        </div>
        <Progress value={dietItems.length > 0 ? (dietCompleted / dietItems.length) * 100 : 0} className="h-1 rounded-none" />

        <div className="divide-y divide-gray-50">
          {todayPlan.meals.map(meal => {
            const item = dietItems.find(i => i.meal_id === meal.type)
            const expanded = expandedMeal === meal.type
            return (
              <div key={meal.type}>
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedMeal(expanded ? null : meal.type)}
                >
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleDiet(meal.type) }}
                    className="flex-shrink-0"
                  >
                    {item?.completed
                      ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      : <Circle className="h-6 w-6 text-gray-300" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{meal.type_zh}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {meal.items.map(i => i.name_zh).join('、')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-600">{meal.total_calories} kcal</p>
                    {expanded ? <ChevronUp className="h-3 w-3 text-gray-400 ml-auto mt-0.5" /> : <ChevronDown className="h-3 w-3 text-gray-400 ml-auto mt-0.5" />}
                  </div>
                </div>
                {expanded && (
                  <div className="px-4 pb-3 bg-gray-50 space-y-3">
                    {meal.items.map(item => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                          {(item as any).photo_url ? (
                            <img src={(item as any).photo_url} alt={item.name_zh} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {item.name_zh === '蛋' ? '🥚' : item.name_zh === '吐司' ? '🍞' : item.name_zh === '雞肉' ? '🍗' : item.name_zh === '白飯' ? '🍚' : item.name_zh === '鮭魚' ? '🐟' : item.name_zh === '地瓜' ? '🍠' : '🍽️'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">{item.name_zh}</p>
                          <p className="text-xs text-gray-500">
                            {(item as any).quantity ? `${(item as any).quantity} · ` : ''}{item.portion} · {item.preparation}
                          </p>
                          {(item as any).portionDesc && (
                            <p className="text-xs text-gray-400 italic">({(item as any).portionDesc})</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-gray-600">{item.calories} kcal</span>
                            <span className="text-xs text-emerald-600">蛋{item.protein_g}g</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Workout section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">💪 今日訓練</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {todayPlan.workout.type_zh}
              {workoutItems.length > 0 && ` · ${workoutCompleted}/${workoutItems.length} 完成`}
            </p>
          </div>
          <p className="text-sm font-bold text-purple-600">
            {workoutItems.length > 0 ? Math.round((workoutCompleted / workoutItems.length) * 100) : 0}%
          </p>
        </div>
        <Progress value={workoutItems.length > 0 ? (workoutCompleted / workoutItems.length) * 100 : 0} className="h-1 rounded-none [&>div]:bg-purple-500" />

        {todayPlan.workout.type === 'rest' ? (
          <div className="px-4 py-6 text-center">
            <p className="text-2xl mb-2">😴</p>
            <p className="font-medium text-gray-700">今天是休息日</p>
            <p className="text-sm text-gray-400 mt-1">好好休息，讓肌肉恢復</p>
            {todayPlan.workout.cooldown.length > 0 && (
              <p className="text-xs text-emerald-600 mt-2">可進行輕度伸展 ({todayPlan.workout.estimated_duration_mins} 分鐘)</p>
            )}
          </div>
        ) : (
          <div>
            {/* Warmup */}
            {todayPlan.workout.warmup.length > 0 && (
              <div className="px-4 py-2 bg-yellow-50 border-b border-gray-50">
                <p className="text-xs font-medium text-yellow-700 mb-1">🔥 暖身</p>
                {todayPlan.workout.warmup.map(ex => (
                  <p key={ex.exercise_id} className="text-xs text-gray-600">
                    {ex.exercise_name_zh} · {ex.sets}組 {ex.duration_secs ? `${ex.duration_secs}秒` : `${ex.reps}次`}
                  </p>
                ))}
              </div>
            )}

            {/* Main exercises */}
            <div className="divide-y divide-gray-50">
              {todayPlan.workout.main.map(ex => {
                const item = workoutItems.find(i => i.exercise_id === ex.exercise_id)
                const expanded = expandedEx === ex.exercise_id
                return (
                  <div key={ex.exercise_id}>
                    <div
                      className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedEx(expanded ? null : ex.exercise_id)}
                    >
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); toggleWorkout(ex.exercise_id) }}
                        className="flex-shrink-0"
                      >
                        {item?.completed
                          ? <CheckCircle2 className="h-6 w-6 text-purple-500" />
                          : <Circle className="h-6 w-6 text-gray-300" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{ex.exercise_name_zh}</p>
                        <p className="text-xs text-gray-400">
                          {ex.sets}組 × {ex.duration_secs ? `${ex.duration_secs}秒` : `${ex.reps}次`} · 休息{ex.rest_secs}秒
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {ex.youtube_id && (
                          <a
                            href={`https://www.youtube.com/watch?v=${ex.youtube_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Play className="h-3.5 w-3.5 text-red-500" />
                          </a>
                        )}
                        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                    {expanded && (
                      <div className="px-4 pb-3 bg-gray-50">
                        {ex.youtube_id && (
                          <div className="aspect-video rounded-lg overflow-hidden mb-2">
                            <iframe
                              src={`https://www.youtube.com/embed/${ex.youtube_id}`}
                              title={ex.exercise_name_zh}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full"
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-500">{ex.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Cooldown */}
            {todayPlan.workout.cooldown.length > 0 && (
              <div className="px-4 py-2 bg-blue-50 border-t border-gray-50">
                <p className="text-xs font-medium text-blue-700 mb-1">🧊 收操</p>
                {todayPlan.workout.cooldown.map(ex => (
                  <p key={ex.exercise_id} className="text-xs text-gray-600">
                    {ex.exercise_name_zh} · {ex.duration_secs ? `${ex.duration_secs}秒` : `${ex.reps}次`}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Water tracking */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-400" />
            <h2 className="font-bold text-gray-800">喝水記錄</h2>
          </div>
          <p className="text-sm text-gray-600"><span className="text-blue-600 font-bold">{waterMl}</span> / {waterTarget} ml</p>
        </div>
        <Progress value={(waterMl / waterTarget) * 100} className="h-2 mb-3 [&>div]:bg-blue-400" />
        <div className="flex gap-2">
          {[150, 250, 350, 500].map(ml => (
            <button key={ml} type="button" onClick={() => addWater(ml)}
              className="flex-1 py-1.5 rounded-lg border border-blue-200 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors">
              +{ml}ml
            </button>
          ))}
        </div>
      </div>

      {/* Daily completion */}
      <div className={`rounded-xl shadow-sm p-4 text-center transition-colors ${isCompleted ? 'bg-emerald-50 border-2 border-emerald-300' : allComplete ? 'bg-white' : 'bg-gray-50'}`}>
        {isCompleted ? (
          <>
            <p className="text-3xl mb-2">🎉</p>
            <p className="font-bold text-emerald-700 text-lg">今天達標了！</p>
            <p className="text-xs text-emerald-600 mt-1">完成所有飲食、運動和喝水目標</p>
          </>
        ) : allComplete ? (
          <>
            <p className="text-sm text-gray-700 mb-3">所有項目都完成了！</p>
            <button
              onClick={markAsComplete}
              disabled={isPending}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors"
            >
              {isPending ? '記錄中...' : '✨ 標記為今日達標'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">還有未完成的項目</p>
            <p className="text-xs text-gray-400 mt-1">
              飲食 {dietCompleted}/{dietItems.length} · 運動 {workoutCompleted}/{workoutItems.length} · 喝水 {waterMl}/{waterTarget}ml
            </p>
          </>
        )}
      </div>
    </div>
  )
}
