'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Play } from 'lucide-react'
import { toast } from 'sonner'
import { getConvenienceMealsForDay, getHomeMealsForDay } from '@/lib/meal-plan-display'
import {
  buildCheckinPayload,
  initDietItems,
  initWorkoutItems,
  mealModesFromCheckin,
  customEatOutFromCheckin,
  mealSuggestFromCheckin,
  dailyRollsFromCheckin,
  userMemoryFromCheckin,
  calcTodayCompletion,
  isCheckinDayQualified,
  type MealModes,
  type MealType,
  type CustomEatOutSelection,
  type MealSuggestState,
  type UserMemoryMeta,
  type DailyRollState,
} from '@/lib/checkin-utils'
import EatOutBuilder from '@/components/dashboard/EatOutBuilder'
import HomeDecisionHero from '@/components/dashboard/HomeDecisionHero'
import ScrollFloatCard from '@/components/motion/ScrollFloatCard'
import BreathingProgress from '@/components/motion/BreathingProgress'
import ExpandPanel from '@/components/motion/ExpandPanel'
import { currentMealSlotForSchedule, getMealLabels, type WorkSchedule } from '@/lib/human-mode'
import { getTaipeiHour } from '@/lib/timezone'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { deserializeCustomCombo, selectedToDisplayItems } from '@/lib/eat-out-builder'
import { colors, cardStyle } from '@/lib/design-system'
import { pickZaiJianLine, zaijian } from '@/lib/copy/zaijian'
import {
  resolveMealCompanion,
  resolveWaterCompanion,
  resolveWorkoutCompanion,
} from '@/lib/companion-state'
import LifeEventPicker from '@/components/dashboard/LifeEventPicker'
import D3VictoryBanner from '@/components/dashboard/D3VictoryBanner'
import { getD3VictoryLine } from '@/lib/d3-victory'
import { humanizeMealReasoning } from '@/lib/meal-trust-copy'
import MealTrustCard from '@/components/dashboard/MealTrustCard'
import type { LifeEventMode } from '@/lib/human-mode'
import ZaiJian from '@/components/character/ZaiJian'
import type { DayPlan, DailyCheckin, DietCheckinItem, WorkoutCheckinItem, UserProfile } from '@/types'

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
  coachNote?: string | null
  dayIndex?: number
  profile?: UserProfile | null
  weekNumber?: number
  cheatRecovery?: boolean
  todayLabel?: string
}

export default function BetterBitHome({
  todayPlan,
  checkin,
  weeklyPlanId,
  goalSnapshot,
  dayIndex = 0,
  coachNote,
  profile,
  weekNumber,
  cheatRecovery = false,
  todayLabel,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [expandedWorkout, setExpandedWorkout] = useState(false)
  const [dietItems, setDietItems] = useState<DietCheckinItem[]>(() => initDietItems(checkin))
  const [workoutItems, setWorkoutItems] = useState<WorkoutCheckinItem[]>(() =>
    initWorkoutItems(
      checkin,
      todayPlan.workout?.main?.map(ex => ({
        exercise_id: ex.exercise_id,
        exercise_name_zh: ex.exercise_name_zh,
      })) ?? []
    )
  )
  const [mealModes, setMealModes] = useState<MealModes>(() => mealModesFromCheckin(checkin))
  const [customEatOut, setCustomEatOut] = useState<Partial<Record<MealType, CustomEatOutSelection[]>>>(() =>
    customEatOutFromCheckin(checkin)
  )
  const [mealSuggest, setMealSuggest] = useState<Partial<Record<MealType, MealSuggestState>>>(() =>
    mealSuggestFromCheckin(checkin)
  )
  const [dailyRolls, setDailyRolls] = useState<DailyRollState>(() => dailyRollsFromCheckin(checkin))
  const [userMemory, setUserMemory] = useState<UserMemoryMeta>(() => userMemoryFromCheckin(checkin))
  const [waterMl, setWaterMl] = useState(checkin?.water_ml ?? 0)

  const schedule: WorkSchedule = userMemory.work_schedule ?? 'standard'
  const mealLabelMap = getMealLabels(schedule)

  useEffect(() => {
    setExpandedMeal(currentMealSlotForSchedule(schedule))
  }, [schedule])

  const mealsCompletedToday = dietItems.filter(d => d.completed).length
  const d3Line = profile?.created_at
    ? getD3VictoryLine({
        profileCreatedAt: profile.created_at,
        mealsCompletedToday,
      })
    : null

  const waterTarget = todayPlan.daily_targets.water_ml
  const exercises = todayPlan.workout?.main ?? []

  const persist = useCallback(
    async (patch: {
      dietItems?: DietCheckinItem[]
      workoutItems?: WorkoutCheckinItem[]
      waterMl?: number
      mealModes?: MealModes
      customEatOut?: Partial<Record<MealType, CustomEatOutSelection[]>>
      dailyRolls?: DailyRollState
      mealSuggest?: Partial<Record<MealType, MealSuggestState>>
      userMemory?: UserMemoryMeta
    }) => {
      const state = {
        dietItems: patch.dietItems ?? dietItems,
        workoutItems: patch.workoutItems ?? workoutItems,
        waterMl: patch.waterMl ?? waterMl,
        mealModes: patch.mealModes ?? mealModes,
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

        const qualified = isCheckinDayQualified({
          diet_items: state.dietItems,
          workout_items: state.workoutItems,
        })
        const pct = calcTodayCompletion(state.dietItems, state.workoutItems, state.waterMl, waterTarget)
        if (qualified && pct >= 100) {
          toast.success(pickZaiJianLine('success').subtext ?? pickZaiJianLine('success').text)
        }
      } catch {
        toast.error(pickZaiJianLine('error').text)
      }
    },
    [dietItems, workoutItems, waterMl, mealModes, customEatOut, dailyRolls, mealSuggest, userMemory, weeklyPlanId, waterTarget]
  )

  const setLifeEvent = (mode: LifeEventMode | null) => {
    const next = { ...userMemory, life_event_mode: mode }
    setUserMemory(next)
    persist({ userMemory: next })
  }

  const toggleMeal = (mealId: MealType) => {
    startTransition(() => {
      const updated = dietItems.map(d =>
        d.meal_id === mealId ? { ...d, completed: !d.completed } : d
      )
      setDietItems(updated)
      persist({ dietItems: updated })
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

  const setMealMode = (mealType: MealType, mode: 'cook' | 'convenience') => {
    startTransition(() => {
      const updated = { ...mealModes, [mealType]: mode }
      setMealModes(updated)
      persist({ mealModes: updated })
    })
  }

  const addWater = (ml: number) => {
    const next = Math.min(waterTarget + 500, waterMl + ml)
    setWaterMl(next)
    persist({ waterMl: next })
  }

  const homeMeals = getHomeMealsForDay(todayPlan, dayIndex, profile)
  const convenienceMeals = getConvenienceMealsForDay(todayPlan, dayIndex)

  const getMealDisplay = (mealIndex: number, mealType: MealType) => {
    const types: MealType[] = ['breakfast', 'lunch', 'dinner']
    const label = mealLabelMap[types[mealIndex]]
    const convenience = convenienceMeals.find(m => m.meal_type === mealType)
    const home = homeMeals.find(m => m.type === mealType) ?? homeMeals[mealIndex]
    const custom = customEatOut[mealType]

    if (mealModes[mealType] === 'cook' && home?.items?.length) {
      return { label, meal: home, isConvenience: false }
    }

    if (custom?.length) {
      const selected = deserializeCustomCombo(custom, eatOutMenu)
      const display = selectedToDisplayItems(selected)
      return {
        label,
        combo: { items: display },
        isConvenience: true,
      }
    }

    if (convenience?.items?.length) {
      return {
        label,
        combo: { items: convenience.items },
        isConvenience: true,
      }
    }
    if (home?.items?.length) {
      return { label, meal: home, isConvenience: false }
    }
    return { label, combo: { items: [] }, isConvenience: true }
  }

  const applyHeroDecision = (payload: {
    mealType: MealType
    selection: CustomEatOutSelection[]
    dailyRolls: DailyRollState
    mealSuggest: Partial<Record<MealType, MealSuggestState>>
    userMemory: UserMemoryMeta
    switchToConvenience?: boolean
  }) => {
    const modes = payload.switchToConvenience
      ? { ...mealModes, [payload.mealType]: 'convenience' as const }
      : mealModes
    const eatOut = { ...customEatOut, [payload.mealType]: payload.selection }
    setMealModes(modes)
    setCustomEatOut(eatOut)
    setDailyRolls(payload.dailyRolls)
    setMealSuggest(payload.mealSuggest)
    setUserMemory(payload.userMemory)
    setExpandedMeal(payload.mealType)
    persist({
      mealModes: modes,
      customEatOut: eatOut,
      dailyRolls: payload.dailyRolls,
      mealSuggest: payload.mealSuggest,
      userMemory: payload.userMemory,
    })
  }

  const handleMealRoll = (
    mealType: MealType,
    payload: {
      selection: CustomEatOutSelection[]
      dailyRolls: DailyRollState
      mealSuggest: MealSuggestState
    }
  ) => {
    const eatOut = { ...customEatOut, [mealType]: payload.selection }
    const suggest = { ...mealSuggest, [mealType]: payload.mealSuggest }
    setCustomEatOut(eatOut)
    setDailyRolls(payload.dailyRolls)
    setMealSuggest(suggest)
    persist({ customEatOut: eatOut, dailyRolls: payload.dailyRolls, mealSuggest: suggest })
  }

  const completionPercent = calcTodayCompletion(dietItems, workoutItems, waterMl, waterTarget)

  const meals = ([0, 1, 2] as const).map(idx => {
    const types: MealType[] = ['breakfast', 'lunch', 'dinner']
    const type = types[idx]
    return {
      ...getMealDisplay(idx, type),
      type,
      completed: dietItems.find(d => d.meal_id === type)?.completed ?? false,
    }
  })

  const isRestDay = exercises.length === 0
  const workoutDone = workoutItems.filter(w => w.completed).length

  const companionCtx = {
    completionPercent,
    waterMl,
    waterTarget,
    isRestDay,
    workoutDone,
    workoutTotal: workoutItems.length,
    mealsCompleted: {
      breakfast: dietItems.find(d => d.meal_id === 'breakfast')?.completed ?? false,
      lunch: dietItems.find(d => d.meal_id === 'lunch')?.completed ?? false,
      dinner: dietItems.find(d => d.meal_id === 'dinner')?.completed ?? false,
    },
    cheatRecovery,
  }

  const waterLine = resolveWaterCompanion(waterMl, waterTarget)
  const workoutLine = resolveWorkoutCompanion(companionCtx)

  const mealSummary = (meal: (typeof meals)[0]) => {
    const items = meal.meal?.items || meal.combo?.items || []
    return items
      .slice(0, 2)
      .map(i => ('name' in i && meal.isConvenience ? i.name : (i as { name_zh?: string }).name_zh))
      .filter(Boolean)
      .join(' · ') || '點開查看'
  }

  return (
    <>
      {d3Line && <D3VictoryBanner line={d3Line} />}

      <HomeDecisionHero
        todayPlan={todayPlan}
        profile={profile}
        goalSnapshot={goalSnapshot}
        weekNumber={weekNumber}
        coachNote={coachNote}
        dayIndex={dayIndex}
        todayLabel={todayLabel}
        dailyRolls={dailyRolls}
        mealSuggest={mealSuggest}
        customEatOut={customEatOut}
        userMemory={userMemory}
        onApply={applyHeroDecision}
      />

      <div className="px-4 pb-32 space-y-6" style={{ backgroundColor: colors.bg.canvas }}>
        <LifeEventPicker
          active={userMemory.life_event_mode}
          onSelect={setLifeEvent}
        />

        <ScrollFloatCard depth={0} staggerIndex={2}>
          <div className="space-y-2">
            <BreathingProgress percent={completionPercent} />
            {completionPercent >= 100 && (
              <ZaiJian size="sm" line={pickZaiJianLine('success')} layout="inline" className="justify-center px-2" />
            )}
          </div>
        </ScrollFloatCard>

        {isPending && (
          <p className="text-center text-[11px]" style={{ color: colors.text.tertiary }}>{zaijian.saving}</p>
        )}

        <ScrollFloatCard
          depth={1}
          staggerIndex={3}
          className="rounded-2xl p-5"
          style={cardStyle}
        >
          <ZaiJian size="xs" line={waterLine} layout="inline" className="mb-3" />
          <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: colors.bg.muted }}>
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: colors.accent.action,
                width: `${Math.min(100, (waterMl / waterTarget) * 100)}%`,
                transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
          <div className="flex gap-2">
            {[250, 500].map(ml => (
              <button
                key={ml}
                type="button"
                onClick={() => addWater(ml)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ backgroundColor: colors.bg.muted, color: colors.text.primary }}
              >
                +{ml}ml
              </button>
            ))}
          </div>
        </ScrollFloatCard>

        <div className="space-y-6">
          {meals.map((meal, mealIdx) => {
            const mealLine = resolveMealCompanion(meal.type, meal.completed)
            return (
            <ScrollFloatCard
              key={meal.type}
              depth={(mealIdx + 1) as 1 | 2 | 3}
              staggerIndex={4 + mealIdx}
              id={`meal-section-${meal.type}`}
              className="rounded-2xl overflow-hidden"
              style={{
                ...cardStyle,
                backgroundColor: meal.completed ? colors.bg.canvas : colors.bg.elevated,
                borderColor: expandedMeal === meal.type ? colors.border.focus : colors.border.subtle,
              }}
            >
              <div className="p-5 flex items-center gap-4">
                <button type="button" onClick={() => toggleMeal(meal.type)} aria-label={`完成${meal.label}`}>
                  {meal.completed ? (
                    <CheckCircle2 className="h-6 w-6" style={{ color: colors.accent.action }} />
                  ) : (
                    <Circle className="h-6 w-6" style={{ color: colors.border.subtle }} />
                  )}
                </button>
                <button
                  type="button"
                  className="flex-1 text-left min-w-0"
                  onClick={() => setExpandedMeal(expandedMeal === meal.type ? null : meal.type)}
                >
                  <p
                    className="font-semibold text-[15px]"
                    style={{ color: meal.completed ? colors.text.tertiary : colors.text.primary }}
                  >
                    {meal.label}
                  </p>
                  <p className="text-[12px] truncate mt-0.5" style={{ color: colors.text.secondary }}>
                    {meal.completed ? mealLine.subtext ?? mealLine.text : mealLine.text}
                  </p>
                  {!meal.completed && (
                    <p className="text-[13px] truncate mt-0.5" style={{ color: colors.text.tertiary }}>
                      {mealSummary(meal)}
                    </p>
                  )}
                </button>
                <button type="button" onClick={() => setExpandedMeal(expandedMeal === meal.type ? null : meal.type)}>
                  {expandedMeal === meal.type ? (
                    <ChevronUp className="h-5 w-5" style={{ color: colors.text.tertiary }} />
                  ) : (
                    <ChevronDown className="h-5 w-5" style={{ color: colors.text.tertiary }} />
                  )}
                </button>
              </div>

              <ExpandPanel
                open={expandedMeal === meal.type}
                className="px-5 pb-5 space-y-4 border-t"
                style={{ borderColor: colors.border.subtle, backgroundColor: colors.bg.canvas }}
              >
                <div className="flex gap-2 pt-4">
                  {(['外食', '自己煮'] as const).map((label, i) => {
                    const mode = i === 0 ? 'convenience' : 'cook'
                    const active = mealModes[meal.type] === mode
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setMealMode(meal.type, mode)}
                        className="flex-1 py-2 rounded-xl text-[12px] font-semibold"
                        style={{
                          backgroundColor: active ? colors.accent.action : colors.bg.muted,
                          color: active ? '#FFFDF9' : colors.text.secondary,
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                {mealModes[meal.type] === 'convenience' ? (
                  <EatOutBuilder
                    mealType={meal.type}
                    dailyTargets={todayPlan.daily_targets}
                    profile={profile}
                    userMemory={userMemory}
                    mealSuggestState={mealSuggest[meal.type]}
                    dailyRolls={dailyRolls}
                    dayIndex={dayIndex}
                    suggestedItems={convenienceMeals.find(m => m.meal_type === meal.type)?.items ?? []}
                    savedSelection={customEatOut[meal.type]}
                    onRoll={payload => handleMealRoll(meal.type, payload)}
                  />
                ) : (
                  <div className="space-y-2">
                    {(meal.meal?.items || []).map((item: { id: string; name_zh?: string }) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
                      >
                        <p className="font-semibold text-[15px]" style={{ color: colors.text.primary }}>
                          {item.name_zh}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ExpandPanel>
            </ScrollFloatCard>
            )
          })}
        </div>

        {todayPlan.workout && (
          <ScrollFloatCard
            depth={2}
            staggerIndex={7}
            className="rounded-2xl overflow-hidden"
            style={{
              ...cardStyle,
              borderColor: expandedWorkout ? colors.border.focus : colors.border.subtle,
            }}
          >
            <button
              type="button"
              className="w-full p-5 flex items-center gap-4 text-left"
              onClick={() => setExpandedWorkout(!expandedWorkout)}
            >
              <ZaiJian size="xs" expression={workoutLine.expression} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px]" style={{ color: colors.text.primary }}>
                  {todayPlan.workout.type_zh}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: colors.text.secondary }}>
                  {workoutLine.text}
                </p>
                <p className="text-[13px] mt-0.5 truncate" style={{ color: colors.text.tertiary }}>
                  {isRestDay
                    ? workoutLine.subtext
                    : `${todayPlan.workout.estimated_duration_mins} 分鐘 · ${workoutDone}/${workoutItems.length}${
                        todayPlan.daily_targets.exercise_burn_kcal
                          ? ` · 約 ${todayPlan.daily_targets.exercise_burn_kcal} kcal`
                          : ''
                      }`}
                </p>
              </div>
              {expandedWorkout ? (
                <ChevronUp className="h-5 w-5" style={{ color: colors.text.tertiary }} />
              ) : (
                <ChevronDown className="h-5 w-5" style={{ color: colors.text.tertiary }} />
              )}
            </button>

            <ExpandPanel
              open={expandedWorkout && !isRestDay}
              className="px-5 pb-5 space-y-2 border-t"
              style={{ borderColor: colors.border.subtle, backgroundColor: colors.bg.canvas }}
            >
              {workoutItems.map((ex, idx) => (
                <div
                  key={ex.exercise_id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
                >
                  <button type="button" onClick={() => toggleExercise(ex.exercise_id)}>
                    {ex.completed ? (
                      <CheckCircle2 className="h-5 w-5" style={{ color: colors.accent.action }} />
                    ) : (
                      <Circle className="h-5 w-5" style={{ color: colors.border.subtle }} />
                    )}
                  </button>
                  <div className="flex-1">
                    <p
                      className="text-[15px] font-semibold"
                      style={{ color: ex.completed ? colors.text.tertiary : colors.text.primary }}
                    >
                      {ex.exercise_name_zh || ex.exercise_name}
                    </p>
                    {exercises[idx] && (
                      <p className="text-[13px]" style={{ color: colors.text.tertiary }}>
                        {exercises[idx].sets}組
                        {exercises[idx].duration_secs
                          ? ` × ${exercises[idx].duration_secs}秒`
                          : exercises[idx].reps
                            ? ` × ${exercises[idx].reps}次`
                            : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {exercises[0]?.youtube_id && (
                <a
                  href={`https://www.youtube.com/watch?v=${exercises[0].youtube_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
                >
                  <Play className="h-4 w-4" /> 教學影片
                </a>
              )}
            </ExpandPanel>
          </ScrollFloatCard>
        )}
      </div>
    </>
  )
}
