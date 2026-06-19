'use client'

import { useState, useTransition, useCallback } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Play } from 'lucide-react'
import { toast } from 'sonner'
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
import TodayOS from '@/components/dashboard/TodayOS'
import TodaySummary from '@/components/dashboard/TodaySummary'
import ScrollFloatCard from '@/components/motion/ScrollFloatCard'
import ExpandPanel from '@/components/motion/ExpandPanel'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { FoodDna } from '@/lib/food-memory'
import { colors, cardStyle } from '@/lib/design-system'
import { pickZaiJianLine, zaijian } from '@/lib/copy/zaijian'
import { resolveWorkoutCompanion } from '@/lib/companion-state'
import ZaiJian from '@/components/character/ZaiJian'
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
  const workoutDone = workoutItems.filter(w => w.completed).length
  const foodLogs = userMemory.food_logs_today ?? []
  const caloriesLogged = foodLogs.reduce((s, f) => s + f.calories, 0)
  const proteinLogged = foodLogs.reduce((s, f) => s + f.protein_g, 0)

  const mealModes = mealModesFromCheckin(checkin)

  const persist = useCallback(
    async (patch: { workoutItems?: WorkoutCheckinItem[]; userMemory?: UserMemoryMeta; dailyRolls?: DailyRollState; mealSuggest?: Partial<Record<MealType, MealSuggestState>>; customEatOut?: Partial<Record<MealType, CustomEatOutSelection[]>> }) => {
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
      } catch {
        toast.error(pickZaiJianLine('error').text)
      }
    },
    [checkin, workoutItems, mealModes, customEatOut, dailyRolls, mealSuggest, userMemory, weeklyPlanId]
  )

  const handleLogFood = (logs: FoodLogEntry[], nextMemory: UserMemoryMeta) => {
    setUserMemory(nextMemory)
    persist({ userMemory: nextMemory })
  }

  const handleDiceApply = (payload: {
    mealType: MealType
    selection: CustomEatOutSelection[]
    dailyRolls: DailyRollState
    mealSuggest: Partial<Record<MealType, MealSuggestState>>
    userMemory: UserMemoryMeta
  }) => {
    setCustomEatOut({ ...customEatOut, [payload.mealType]: payload.selection })
    setDailyRolls(payload.dailyRolls)
    setMealSuggest(payload.mealSuggest)
    setUserMemory(payload.userMemory)
    persist({
      customEatOut: { ...customEatOut, [payload.mealType]: payload.selection },
      dailyRolls: payload.dailyRolls,
      mealSuggest: payload.mealSuggest,
      userMemory: payload.userMemory,
    })
  }

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
  const workoutLine = resolveWorkoutCompanion({
    completionPercent: 0,
    waterMl: 0,
    waterTarget: 1,
    isRestDay,
    workoutDone,
    workoutTotal: workoutItems.length,
    mealsCompleted: { breakfast: false, lunch: false, dinner: false },
    cheatRecovery: false,
  })

  const activityTarget = Math.max(3, goalSnapshot?.weeks_remaining ? 5 : 3)

  return (
    <>
      <TodaySummary
        caloriesLogged={caloriesLogged}
        caloriesTarget={todayPlan.daily_targets.calories}
        proteinLogged={proteinLogged}
        proteinTarget={todayPlan.daily_targets.protein_g}
        activityDone={workoutDone}
        activityTarget={activityTarget}
      />

      <TodayOS
        todayPlan={todayPlan}
        profile={profile}
        goalSnapshot={goalSnapshot}
        userMemory={userMemory}
        foodDna={userMemory.food_dna ?? foodDna}
        dayOfWeek={dayOfWeek}
        recentMissedDays={recentMissedDays}
        dailyRolls={dailyRolls}
        mealSuggest={mealSuggest}
        customEatOut={customEatOut}
        dayIndex={dayIndex}
        workoutDone={workoutDone}
        workoutTotal={workoutItems.length}
        onLogFood={handleLogFood}
        onDiceApply={handleDiceApply}
      />

      <div className="px-4 pb-32 space-y-4" style={{ backgroundColor: colors.bg.canvas }}>
        {isPending && (
          <p className="text-center text-[11px]" style={{ color: colors.text.tertiary }}>{zaijian.saving}</p>
        )}

        {todayPlan.workout && !isRestDay && (
          <ScrollFloatCard depth={1} staggerIndex={2} className="rounded-2xl overflow-hidden" style={cardStyle}>
            <button
              type="button"
              className="w-full p-4 flex items-center gap-3 text-left"
              onClick={() => setExpandedWorkout(!expandedWorkout)}
            >
              <ZaiJian size="xs" expression={workoutLine.expression} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px]" style={{ color: colors.text.primary }}>
                  {todayPlan.workout.type_zh}
                </p>
                <p className="text-[12px]" style={{ color: colors.text.secondary }}>{workoutLine.text}</p>
              </div>
              {expandedWorkout ? <ChevronUp className="h-4 w-4" style={{ color: colors.text.tertiary }} /> : <ChevronDown className="h-4 w-4" style={{ color: colors.text.tertiary }} />}
            </button>
            <ExpandPanel open={expandedWorkout} className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: colors.border.subtle }}>
              {workoutItems.map((ex, idx) => (
                <div key={ex.exercise_id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: colors.bg.muted }}>
                  <button type="button" onClick={() => toggleExercise(ex.exercise_id)}>
                    {ex.completed ? (
                      <CheckCircle2 className="h-5 w-5" style={{ color: colors.accent.action }} />
                    ) : (
                      <Circle className="h-5 w-5" style={{ color: colors.border.subtle }} />
                    )}
                  </button>
                  <p className="text-[14px] font-medium" style={{ color: colors.text.primary }}>
                    {ex.exercise_name_zh || ex.exercise_name}
                  </p>
                </div>
              ))}
              {exercises[0]?.youtube_id && (
                <a
                  href={`https://www.youtube.com/watch?v=${exercises[0].youtube_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-1 px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
                >
                  <Play className="h-3.5 w-3.5" /> 教學
                </a>
              )}
            </ExpandPanel>
          </ScrollFloatCard>
        )}
      </div>
    </>
  )
}
