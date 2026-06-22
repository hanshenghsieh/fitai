'use client'

import { useState, useTransition, useCallback, useEffect, useRef, useMemo } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Play } from 'lucide-react'
import {
  buildCheckinPayload,
  initWorkoutItems,
  dailyRollsFromCheckin,
  userMemoryFromCheckin,
  mealSuggestFromCheckin,
  customEatOutFromCheckin,
  mealModesFromCheckin,
  type MealType,
  type CustomEatOutSelection,
  type MealSuggestState,
  type UserMemoryMeta,
  type DailyRollState,
} from '@/lib/checkin-utils'
import { toast } from 'sonner'
import TodayHeader from '@/components/dashboard/today/TodayHeader'
import TodayPosture from '@/components/dashboard/today/TodayPosture'
import TodayIntakeBar from '@/components/dashboard/today/TodayIntakeBar'
import TodayOS from '@/components/dashboard/TodayOS'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { FoodDna } from '@/lib/food-memory'
import { isRecoveryActive } from '@/lib/engines/calorie-bank-engine'
import { sumLoggedCalories, sumLoggedProtein, computeTodayMealState } from '@/lib/engines/next-meal-engine'
import { preloadDiceMenuBulk } from '@/lib/dice-menu-pool'
import { getVerifiedExerciseVideo, exerciseVideoPlaceholder } from '@/lib/exercise-video-map'
import { TODAY } from '@/lib/today-design'
import { GENTLE_ERROR_MESSAGE } from '@/lib/copy/gentle-errors'
import { zaijian } from '@/lib/copy/zaijian'
import type { DayPlan, DailyCheckin, WorkoutCheckinItem, UserProfile } from '@/types'

interface GoalSnapshot {
  current_body_fat?: number | null
  target_body_fat?: number | null
  target_weight?: number | null
  weeks_remaining?: number
  weekly_fat_loss_g?: number
  daily_deficit?: number
}

interface Props {
  todayPlan: DayPlan
  checkin: DailyCheckin | null
  weeklyPlanId: string | null
  goalSnapshot?: GoalSnapshot | null
  dayIndex?: number
  profile?: UserProfile | null
  foodDna: FoodDna
  dayOfWeek: number
  recentMissedDays: number
  recentFoodLogs?: FoodLogEntry[]
  trialDaysLeft?: number | null
  calorieBank?: CalorieBankRow | null
}

function formatExerciseDetail(set: { sets: number; reps: number | null; duration_secs: number | null; rest_secs: number }): string {
  const parts: string[] = []
  if (set.reps != null) parts.push(`${set.sets} 組 × ${set.reps} 下`)
  else if (set.duration_secs != null) parts.push(`${set.sets} 組 × ${Math.round(set.duration_secs / 60) || set.duration_secs} ${set.duration_secs >= 60 ? '分' : '秒'}`)
  else parts.push(`${set.sets} 組`)
  if (set.rest_secs > 0) parts.push(`休息 ${set.rest_secs} 秒`)
  return parts.join(' · ')
}

export default function BetterBitHome({
  todayPlan,
  checkin,
  weeklyPlanId,
  goalSnapshot,
  dayIndex = 0,
  profile,
  foodDna,
  dayOfWeek,
  recentMissedDays,
  recentFoodLogs = [],
  trialDaysLeft,
  calorieBank: initialCalorieBank = null,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [expandedWorkout, setExpandedWorkout] = useState(false)
  const [workoutItems, setWorkoutItems] = useState<WorkoutCheckinItem[]>(() =>
    initWorkoutItems(
      checkin,
      todayPlan.workout?.main?.map(ex => ({
        exercise_id: ex.exercise_id,
        exercise_name_zh: ex.exercise_name_zh,
      })) ?? []
    )
  )
  const [dailyRolls, setDailyRolls] = useState<DailyRollState>(() => dailyRollsFromCheckin(checkin))
  const [mealSuggest, setMealSuggest] = useState<Partial<Record<MealType, MealSuggestState>>>(() =>
    mealSuggestFromCheckin(checkin)
  )
  const [customEatOut, setCustomEatOut] = useState<Partial<Record<MealType, CustomEatOutSelection[]>>>(() =>
    customEatOutFromCheckin(checkin)
  )
  const [userMemory, setUserMemory] = useState<UserMemoryMeta>(() => {
    const mem = userMemoryFromCheckin(checkin)
    return { ...mem, food_dna: mem.food_dna ?? foodDna }
  })

  const exercises = todayPlan.workout?.main ?? []
  const warmup = todayPlan.workout?.warmup ?? []
  const cooldown = todayPlan.workout?.cooldown ?? []
  const workoutDone = workoutItems.filter(w => w.completed).length
  const foodLogs = userMemory.food_logs_today ?? []
  const [postureLine, setPostureLine] = useState('最近忙嗎？回來就好。今天照常。')
  const [calorieBank, setCalorieBank] = useState<CalorieBankRow | null>(initialCalorieBank)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistPatchRef = useRef<{
    workoutItems?: WorkoutCheckinItem[]
    userMemory?: UserMemoryMeta
    dailyRolls?: DailyRollState
    mealSuggest?: Partial<Record<MealType, MealSuggestState>>
    customEatOut?: Partial<Record<MealType, CustomEatOutSelection[]>>
  }>({})

  useEffect(() => {
    void preloadDiceMenuBulk()
  }, [])

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    }
  }, [])

  const intakeSummary = useMemo(() => {
    const caloriesLogged = sumLoggedCalories(foodLogs)
    const proteinLogged = sumLoggedProtein(foodLogs)
    const normalTarget = todayPlan.daily_targets.calories
    const proteinTarget = todayPlan.daily_targets.protein_g
    const recoveryActive = isRecoveryActive(calorieBank ?? { recovery_balance_kcal: 0, spread_days_remaining: 0 })
    const dayState = computeTodayMealState({
      todayFoodLogs: foodLogs,
      normalTargetKcal: normalTarget,
      internalTargetKcal: calorieBank?.internal_target_kcal,
      proteinTargetG: proteinTarget,
      calorieBank,
    })
    return {
      caloriesLogged,
      proteinLogged,
      caloriesTarget: dayState.todayTarget,
      proteinTarget,
      overTarget: dayState.overTargetProtection,
      recoveryActive,
    }
  }, [foodLogs, todayPlan.daily_targets, calorieBank])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('welcome') !== '1') return
    toast.message('第一餐在下面。點「常吃」或骰子，一鍵就好。')
    window.history.replaceState({}, '', '/dashboard')
  }, [])

  const mealModes = mealModesFromCheckin(checkin)

  const flushPersist = useCallback(async () => {
    const patch = persistPatchRef.current
    persistPatchRef.current = {}
    const state = {
      dietItems: checkin?.diet_items ?? [],
      workoutItems: patch.workoutItems ?? workoutItems,
      waterMl: checkin?.water_ml ?? 0,
      mealModes,
      customEatOut: patch.customEatOut ?? customEatOut,
      dailyRolls: patch.dailyRolls ?? dailyRolls,
      mealSuggest: patch.mealSuggest ?? mealSuggest,
      userMemory: patch.userMemory ?? userMemory,
    }
    try {
      const res = await fetch('/api/checkin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCheckinPayload(state, weeklyPlanId)),
      })
      if (!res.ok) throw new Error()
      const json = (await res.json()) as { calorie_bank?: CalorieBankRow | null }
      if (json.calorie_bank) setCalorieBank(json.calorie_bank)
    } catch {
      toast.error(GENTLE_ERROR_MESSAGE)
    }
  }, [checkin, workoutItems, mealModes, customEatOut, dailyRolls, mealSuggest, userMemory, weeklyPlanId])

  const persist = useCallback(
    (patch: {
      workoutItems?: WorkoutCheckinItem[]
      userMemory?: UserMemoryMeta
      dailyRolls?: DailyRollState
      mealSuggest?: Partial<Record<MealType, MealSuggestState>>
      customEatOut?: Partial<Record<MealType, CustomEatOutSelection[]>>
    }) => {
      persistPatchRef.current = { ...persistPatchRef.current, ...patch }
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null
        void flushPersist()
      }, 400)
    },
    [flushPersist]
  )

  const handleLogFood = useCallback((logs: FoodLogEntry[], nextMemory: UserMemoryMeta) => {
    setUserMemory(nextMemory)
    persist({ userMemory: nextMemory })
  }, [persist])

  const handleDiceApply = useCallback((payload: {
    mealType: MealType
    selection: CustomEatOutSelection[]
    dailyRolls: DailyRollState
    mealSuggest: Partial<Record<MealType, MealSuggestState>>
    userMemory: UserMemoryMeta
  }) => {
    const nextCustom = { ...customEatOut, [payload.mealType]: payload.selection }
    setCustomEatOut(nextCustom)
    setDailyRolls(payload.dailyRolls)
    setMealSuggest(payload.mealSuggest)
    setUserMemory(payload.userMemory)
    persist({
      customEatOut: nextCustom,
      dailyRolls: payload.dailyRolls,
      mealSuggest: payload.mealSuggest,
      userMemory: payload.userMemory,
    })
  }, [customEatOut, persist])

  const toggleExercise = (exerciseId: string) => {
    startTransition(() => {
      const updated = workoutItems.map(w =>
        w.exercise_id === exerciseId ? { ...w, completed: !w.completed } : w
      )
      setWorkoutItems(updated)
      persist({ workoutItems: updated })
    })
  }

  const isRestDay = exercises.length === 0

  return (
    <>
      <TodayHeader trialDaysLeft={trialDaysLeft} />
      <TodayPosture line={postureLine} />
      <TodayIntakeBar
        caloriesLogged={intakeSummary.caloriesLogged}
        caloriesTarget={intakeSummary.caloriesTarget}
        proteinLogged={intakeSummary.proteinLogged}
        proteinTarget={intakeSummary.proteinTarget}
        overTarget={intakeSummary.overTarget}
      />

      <TodayOS
        todayPlan={todayPlan}
        profile={profile}
        goalSnapshot={goalSnapshot}
        userMemory={userMemory}
        foodDna={userMemory.food_dna ?? foodDna}
        dayOfWeek={dayOfWeek}
        recentMissedDays={recentMissedDays}
        recentFoodLogs={recentFoodLogs}
        dailyRolls={dailyRolls}
        mealSuggest={mealSuggest}
        customEatOut={customEatOut}
        dayIndex={dayIndex}
        workoutDone={workoutDone}
        workoutTotal={workoutItems.length}
        calorieBank={calorieBank}
        onLogFood={handleLogFood}
        onPostureLine={setPostureLine}
        onDiceApply={handleDiceApply}
      />

      <div className="px-5 pb-32 max-w-[640px] mx-auto space-y-4" style={{ fontFamily: TODAY.font }}>
        {isPending && (
          <p className="text-center text-[11px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>{zaijian.saving}</p>
        )}

        {todayPlan.workout && !isRestDay && (
          <div
            className="overflow-hidden"
            style={{
              backgroundColor: TODAY.card,
              borderRadius: TODAY.radiusCard,
              boxShadow: TODAY.cardShadow,
            }}
          >
            <button
              type="button"
              className="w-full p-6 flex items-start justify-between gap-4 text-left"
              onClick={() => setExpandedWorkout(!expandedWorkout)}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[16px]" style={{ color: TODAY.text, fontWeight: 500 }}>
                  {todayPlan.workout.type_zh}
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                  約 {todayPlan.workout.estimated_duration_mins} 分鐘
                  {todayPlan.workout.calories_burned_est > 0 && ` · 預估 ${todayPlan.workout.calories_burned_est} kcal`}
                </p>
                {!expandedWorkout && exercises[0] && (
                  <div className="pt-3 space-y-1" style={{ borderTop: '1px solid rgba(47, 36, 29, 0.06)' }}>
                    <p className="text-[13px] pt-3" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                      首項：{exercises[0].exercise_name_zh}
                    </p>
                    {exercises[0].sets && (
                      <p className="text-[13px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                        {formatExerciseDetail(exercises[0])}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {expandedWorkout ? (
                <ChevronUp className="h-[18px] w-[18px] shrink-0 mt-1" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.textSecondary }} />
              ) : (
                <ChevronDown className="h-[18px] w-[18px] shrink-0 mt-1" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.textSecondary }} />
              )}
            </button>
            {expandedWorkout && (
              <div className="px-6 pb-6 space-y-5" style={{ borderTop: '1px solid rgba(47, 36, 29, 0.06)' }}>
                {warmup.length > 0 && (
                  <div>
                    <p className="text-[12px] mb-3" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>熱身</p>
                    <div className="space-y-3">
                      {warmup.map(ex => (
                        <div key={`w-${ex.exercise_id}`} className="py-2">
                          <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 500 }}>{ex.exercise_name_zh}</p>
                          <p className="text-[13px] mt-0.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>{formatExerciseDetail(ex)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[12px] mb-3" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>主訓練</p>
                  <div className="space-y-4">
                    {workoutItems.map((ex, idx) => {
                      const planEx = exercises.find(e => e.exercise_id === ex.exercise_id) ?? exercises[idx]
                      return (
                        <div key={ex.exercise_id} className="space-y-2">
                          <div className="flex items-start gap-3">
                            <button type="button" onClick={() => toggleExercise(ex.exercise_id)} className="mt-0.5 shrink-0">
                              {ex.completed ? (
                                <CheckCircle2 className="h-5 w-5" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.mocha }} />
                              ) : (
                                <Circle className="h-5 w-5" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.textSecondary }} />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 500 }}>
                                {ex.exercise_name}
                              </p>
                              {planEx && (
                                <p className="text-[13px] mt-0.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                                  {formatExerciseDetail(planEx)}
                                </p>
                              )}
                              {planEx?.notes && (
                                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                                  {planEx.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          {(() => {
                            const verified = getVerifiedExerciseVideo(ex.exercise_id)
                            if (verified?.video_url) {
                              return (
                                <a
                                  href={verified.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 ml-8 px-3 py-1.5 text-[11px] rounded-full"
                                  style={{ backgroundColor: TODAY.pillBg, color: TODAY.mocha, fontWeight: 500 }}
                                >
                                  <Play className="h-3 w-3" strokeWidth={TODAY.iconStroke} /> 動作教學
                                </a>
                              )
                            }
                            return (
                              <p className="ml-8 text-[11px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                                {exerciseVideoPlaceholder(ex.exercise_name)}
                              </p>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {cooldown.length > 0 && (
                  <div>
                    <p className="text-[12px] mb-3" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>收操</p>
                    <div className="space-y-3">
                      {cooldown.map(ex => (
                        <div key={`c-${ex.exercise_id}`} className="py-2">
                          <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 500 }}>{ex.exercise_name_zh}</p>
                          <p className="text-[13px] mt-0.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>{formatExerciseDetail(ex)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
