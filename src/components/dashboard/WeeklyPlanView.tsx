'use client'

import { useCallback, useMemo, useState } from 'react'
import { format, addDays } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { ChevronDown, ChevronUp, ShoppingCart, MessageSquare, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getConvenienceMealsForDay, getHomeMealsForDay } from '@/lib/meal-plan-display'
import { buildMealCombination, comboToSaved } from '@/lib/meal-combo-engine'
import { formatEatOutStoreLine } from '@/lib/eat-out-builder'
import {
  buildWeekJourney,
  formatWeeklyGoals,
  simplifyWorkout,
  statusLabel,
} from '@/lib/weekly-journey'
import { colors, cardStyle } from '@/lib/design-system'
import { SWAP_BUTTON } from '@/lib/coach-copy'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import CoachPlanSummary from '@/components/coach/CoachPlanSummary'
import type { WeeklyPlanData, WeeklyFeedback } from '@/types'
import type { UserProfile } from '@/types'
import type { ConvenienceMealCombination } from '@/types'
import WeeklyFeedbackForm from './WeeklyFeedbackForm'

interface Props {
  planData: WeeklyPlanData
  weekStart: string
  todayDayIndex: number
  profile?: UserProfile | null
  checkinMap: Record<string, { diet_items: { completed: boolean }[]; workout_items: { completed: boolean }[] } | null>
  existingFeedback: WeeklyFeedback | null
  weekNumber?: number
}

type MealSlot = 'breakfast' | 'lunch' | 'dinner'
type HomeRollState = { rollOffset: number; seen: string[]; totalRolls: number }
type EatOutRollState = { rollOffset: number; totalRolls: number }

const MEAL_RATIOS = { breakfast: 0.25, lunch: 0.4, dinner: 0.35 } as const

function rollKey(day: number, slot: MealSlot) {
  return `${day}-${slot}`
}

export default function WeeklyPlanView({
  planData,
  weekStart,
  todayDayIndex,
  profile,
  checkinMap,
  existingFeedback,
  weekNumber = 1,
}: Props) {
  const [selectedDay, setSelectedDay] = useState(Math.min(Math.max(todayDayIndex, 0), (planData?.days?.length ?? 1) - 1))
  const [mealMode, setMealMode] = useState<'cook' | 'eat-out'>('cook')
  const [showGrocery, setShowGrocery] = useState(false)
  const [showFeedback, setShowFeedback] = useState(todayDayIndex >= 6)
  const [showNutrition, setShowNutrition] = useState(false)
  const [homeRolls, setHomeRolls] = useState<Record<string, HomeRollState>>({})
  const [eatOutRolls, setEatOutRolls] = useState<Record<string, EatOutRollState>>({})
  const [eatOutOverrides, setEatOutOverrides] = useState<Record<number, ConvenienceMealCombination[]>>({})

  const todayPlan = planData?.days?.[selectedDay]
  const weekSeed = planData.week_number ?? weekNumber

  const journey = useMemo(
    () =>
      buildWeekJourney({
        todayDayIndex,
        checkinMap,
        weekStart,
        workoutTypes: planData.days.map(d => d.workout.type),
        dayCalories: planData.days.map(d => d.daily_targets.calories),
      }),
    [todayDayIndex, checkinMap, weekStart, planData.days]
  )

  const weeklyGoals = useMemo(() => formatWeeklyGoals(planData), [planData])

  const homeRollOptions = useMemo(() => {
    const opts: Partial<Record<MealSlot, { rollOffset?: number; weekSeed?: number; excludeComboIds?: string[] }>> = {}
    for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
      const key = rollKey(selectedDay, slot)
      const st = homeRolls[key]
      if (st) {
        opts[slot] = { rollOffset: st.rollOffset, weekSeed, excludeComboIds: st.seen }
      } else {
        opts[slot] = { weekSeed }
      }
    }
    return opts
  }, [homeRolls, selectedDay, weekSeed])

  const homeMeals = useMemo(() => {
    if (!todayPlan || !profile) return todayPlan?.meals ?? []
    return getHomeMealsForDay(todayPlan, selectedDay, profile, homeRollOptions)
  }, [todayPlan, selectedDay, profile, homeRollOptions])

  const convenienceMeals = useMemo(() => {
    if (!todayPlan) return []
    if (eatOutOverrides[selectedDay]) return eatOutOverrides[selectedDay]!
    return getConvenienceMealsForDay(todayPlan, selectedDay)
  }, [todayPlan, selectedDay, eatOutOverrides])

  const handleHomeDice = useCallback(
    (slot: MealSlot) => {
      if (!profile || !todayPlan) return
      const key = rollKey(selectedDay, slot)
      const prev = homeRolls[key] ?? { rollOffset: 0, seen: [], totalRolls: 0 }
      const currentMeals = getHomeMealsForDay(todayPlan, selectedDay, profile, {
        ...homeRollOptions,
        [slot]: { rollOffset: prev.rollOffset, weekSeed, excludeComboIds: prev.seen },
      })
      const current = currentMeals.find(m => m.type === slot) as { combo_id?: string } | undefined
      const seen = current?.combo_id ? [...prev.seen, current.combo_id] : prev.seen
      const totalRolls = prev.totalRolls + 1
      setHomeRolls({
        ...homeRolls,
        [key]: { rollOffset: prev.rollOffset + 1, seen, totalRolls },
      })
      const line = pickZaiJianLine('decide')
      toast.message(line.subtext ? `${line.text} ${line.subtext}` : line.text)
    },
    [profile, todayPlan, selectedDay, homeRolls, homeRollOptions, weekSeed]
  )

  const handleEatOutDice = useCallback(
    (slot: MealSlot) => {
      if (!todayPlan) return
      const key = rollKey(selectedDay, slot)
      const prev = eatOutRolls[key] ?? { rollOffset: 0, totalRolls: 0 }
      const totalRolls = prev.totalRolls + 1
      const ratio = MEAL_RATIOS[slot]
      const combo = buildMealCombination(
        slot,
        Math.round(todayPlan.daily_targets.calories * ratio),
        Math.round(todayPlan.daily_targets.protein_g * ratio),
        selectedDay + prev.rollOffset + 1 + totalRolls,
        profile ?? undefined
      )
      const saved = comboToSaved(slot, combo)
      const base = eatOutOverrides[selectedDay] ?? getConvenienceMealsForDay(todayPlan, selectedDay)
      const updated = base.map(m => (m.meal_type === slot ? saved : m))
      setEatOutOverrides({ ...eatOutOverrides, [selectedDay]: updated })
      setEatOutRolls({ ...eatOutRolls, [key]: { rollOffset: prev.rollOffset + 1, totalRolls } })
      const line = pickZaiJianLine('decide')
      toast.message(line.subtext ? `${line.text} ${line.subtext}` : line.text)
    },
    [todayPlan, selectedDay, eatOutRolls, eatOutOverrides, profile]
  )

  if (!todayPlan) {
    return (
      <div className="m-4 p-6 text-center text-[15px]" style={{ color: colors.text.tertiary }}>
        無法載入計畫
      </div>
    )
  }

  const workoutSimple = simplifyWorkout(todayPlan.workout)
  const isWeekend = selectedDay >= 5

  return (
    <div className="px-4 pb-8 space-y-6">
      {planData.days[todayDayIndex] && (
        <CoachPlanSummary
          todayPlan={planData.days[todayDayIndex]!}
          goalSnapshot={planData.goal_snapshot}
          weekNumber={weekNumber}
          coachNote={planData.coach_note}
        />
      )}

      {/* Weekly goals */}
      <div className="rounded-3xl p-6 space-y-4" style={{ ...cardStyle, backgroundColor: colors.bg.elevated }}>
        <p className="text-[13px] font-medium" style={{ color: colors.text.tertiary }}>
          本週科學目標
        </p>
        <ul className="space-y-3">
          {weeklyGoals.map((g, i) => (
            <li key={i} className="text-[17px] font-semibold leading-snug" style={{ color: colors.text.primary }}>
              {g.icon} {g.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Section 3 — Week Journey */}
      <div className="space-y-2">
        <p className="text-[13px] font-medium px-1" style={{ color: colors.text.tertiary }}>
          這週每天
        </p>
        <div className="space-y-1.5">
          {journey.map(node => {
            const isSelected = node.dayIndex === selectedDay
            const isToday = node.dayIndex === todayDayIndex
            return (
              <button
                key={node.dayIndex}
                type="button"
                onClick={() => setSelectedDay(node.dayIndex)}
                className="w-full text-left rounded-2xl px-4 py-3 transition-all"
                style={{
                  backgroundColor: isSelected ? colors.accent.actionSoft : colors.bg.elevated,
                  border: `1px solid ${isToday ? colors.accent.action : colors.border.subtle}`,
                  opacity: node.dayIndex > todayDayIndex && !isSelected ? 0.85 : 1,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold" style={{ color: colors.text.primary }}>
                      {node.label}
                      {isToday && (
                        <span className="ml-2 text-[11px] font-medium" style={{ color: colors.accent.action }}>
                          今天
                        </span>
                      )}
                    </p>
                    <p className="text-[13px] mt-0.5 truncate" style={{ color: colors.text.secondary }}>
                      {node.mood}
                    </p>
                  </div>
                  <span
                    className="text-[11px] flex-shrink-0 px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: colors.bg.muted,
                      color: colors.text.tertiary,
                    }}
                  >
                    {statusLabel(node.status)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Section 4 — Day detail */}
      <div className="space-y-4">
        <p className="text-[13px] px-1" style={{ color: colors.text.tertiary }}>
          {format(addDays(new Date(weekStart), selectedDay), 'M月d日 EEEE', { locale: zhTW })}
          {isWeekend && ' · 週末模式'}
        </p>

        {isWeekend && (
          <p className="text-[13px] px-1" style={{ color: colors.text.secondary }}>
            週末照目標吃，不用報復性節食。
          </p>
        )}

        {/* Meal mode */}
        <div className="flex gap-2">
          {[
            { val: 'cook' as const, label: '🍳 自己煮' },
            { val: 'eat-out' as const, label: '🍱 外食' },
          ].map(({ val, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => setMealMode(val)}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
              style={{
                backgroundColor: mealMode === val ? colors.accent.action : colors.bg.muted,
                color: mealMode === val ? '#FFFDF9' : colors.text.secondary,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Meals */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="px-4 py-3 border-b" style={{ borderColor: colors.border.subtle, backgroundColor: colors.bg.canvas }}>
            <h3 className="font-semibold text-[15px]" style={{ color: colors.text.primary }}>
              {mealMode === 'cook' ? '自己煮' : '外食'}
            </h3>
            <p className="text-[13px] mt-0.5" style={{ color: colors.text.tertiary }}>
              {mealMode === 'cook' ? '照計畫煮。不喜歡可換同熱量組合。' : '照計畫吃。不喜歡可換同熱量組合。'}
            </p>
          </div>

          {mealMode === 'cook'
            ? homeMeals.map(meal => {
                const ext = meal as {
                  name_zh?: string
                  steps?: string[]
                  zaijian_note?: string
                }
                const slot = meal.type as MealSlot
                return (
                  <div
                    key={meal.type}
                    className="px-4 py-4 border-b last:border-0"
                    style={{ borderColor: colors.border.subtle }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-[15px]" style={{ color: colors.text.primary }}>
                          {meal.type_zh}
                        </p>
                        {ext.name_zh && (
                          <p className="text-[14px] mt-0.5" style={{ color: colors.text.secondary }}>
                            {ext.name_zh}
                          </p>
                        )}
                        {ext.zaijian_note && (
                          <p className="text-[12px] mt-1 italic" style={{ color: colors.text.tertiary }}>
                            再健：{ext.zaijian_note}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleHomeDice(slot)}
                        className="flex-shrink-0 p-2 rounded-xl text-[13px] font-medium flex items-center gap-1"
                        style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
                        aria-label="換一組自己煮"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="text-[11px]">{SWAP_BUTTON}</span>
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {meal.items.map(item => (
                        <li key={item.id} className="flex items-center gap-2 text-[13px]" style={{ color: colors.text.secondary }}>
                          <span className="text-base">
                            {item.name_zh.includes('蛋') ? '🥚' : item.name_zh.includes('飯') || item.name_zh.includes('麥') ? '🍚' : '🥗'}
                          </span>
                          <span>
                            {item.name_zh} · {item.portion}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {ext.steps && ext.steps.length > 0 && (
                      <ol className="mt-3 space-y-1 list-decimal list-inside text-[12px]" style={{ color: colors.text.tertiary }}>
                        {ext.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    )}
                    {showNutrition && (
                      <p className="text-[11px] mt-2" style={{ color: colors.text.tertiary }}>
                        約 {meal.total_calories} kcal · 份量剛好
                      </p>
                    )}
                  </div>
                )
              })
            : convenienceMeals.map(conv => {
                const slot = conv.meal_type as MealSlot
                return (
                  <div
                    key={conv.meal_type}
                    className="px-4 py-4 border-b last:border-0"
                    style={{ borderColor: colors.border.subtle }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-[15px]" style={{ color: colors.text.primary }}>
                        {conv.meal_type_zh}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleEatOutDice(slot)}
                        className="flex-shrink-0 p-2 rounded-xl"
                        style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
                        aria-label="換一組外食"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="text-[11px]">{SWAP_BUTTON}</span>
                      </button>
                    </div>
                    {conv.items.length === 0 ? (
                      <p className="text-[13px]" style={{ color: colors.text.tertiary }}>
                        到首頁查看今日外食計畫
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {conv.items.map((item: { id: string; name: string; store?: string }) => (
                          <li key={item.id} className="text-[13px]" style={{ color: colors.text.secondary }}>
                            🍱 {item.name}
                            {item.store && (
                              <span className="block text-[11px] mt-0.5" style={{ color: colors.text.tertiary }}>
                                {formatEatOutStoreLine(item as Parameters<typeof formatEatOutStoreLine>[0])}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {showNutrition && conv.total_calories > 0 && (
                      <p className="text-[11px] mt-2" style={{ color: colors.text.tertiary }}>
                        約 {conv.total_calories} kcal
                      </p>
                    )}
                  </div>
                )
              })}
        </div>

        <button
          type="button"
          onClick={() => setShowNutrition(!showNutrition)}
          className="text-[12px] w-full text-center py-1"
          style={{ color: colors.text.tertiary }}
        >
          {showNutrition ? '收起數字' : '展開營養數字'}
        </button>

        {/* Workout — simplified */}
        <div className="rounded-2xl p-5 space-y-2" style={cardStyle}>
          <p className="text-[13px] font-medium" style={{ color: colors.text.tertiary }}>
            今天動一下
          </p>
          <p className="text-[17px] font-semibold" style={{ color: colors.text.primary }}>
            {workoutSimple.title}
          </p>
          <p className="text-[14px]" style={{ color: colors.text.secondary }}>
            {workoutSimple.subtitle}
          </p>
          {workoutSimple.duration && (
            <p className="text-[13px]" style={{ color: colors.text.tertiary }}>
              {workoutSimple.duration}
            </p>
          )}
        </div>
      </div>

      {/* Sunday grocery preview */}
      {todayDayIndex >= 6 && planData.grocery_list.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <button
            type="button"
            className="w-full px-4 py-3 flex items-center gap-2 text-left"
            onClick={() => setShowGrocery(!showGrocery)}
          >
            <ShoppingCart className="h-5 w-5" style={{ color: colors.accent.action }} />
            <span className="font-semibold text-[15px] flex-1" style={{ color: colors.text.primary }}>
              下週採買預覽
            </span>
            {showGrocery ? <ChevronUp className="h-4 w-4" style={{ color: colors.text.tertiary }} /> : <ChevronDown className="h-4 w-4" style={{ color: colors.text.tertiary }} />}
          </button>
          {showGrocery && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-[13px]" style={{ color: colors.text.secondary }}>
                週日先看一下，下週比較不用想。
              </p>
              {planData.grocery_list.map(cat => (
                <div key={cat.category}>
                  <p className="text-[12px] font-medium mb-1" style={{ color: colors.text.tertiary }}>
                    {cat.category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map(item => (
                      <span
                        key={item}
                        className="px-2.5 py-1 rounded-full text-[12px]"
                        style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <button
          type="button"
          className="w-full px-4 py-3 flex items-center gap-2 text-left"
          onClick={() => setShowFeedback(!showFeedback)}
        >
          <MessageSquare className="h-5 w-5" style={{ color: colors.accent.action }} />
          <span className="font-semibold text-[15px] flex-1" style={{ color: colors.text.primary }}>
            {existingFeedback ? '本週回饋（已提交）' : '本週回饋（影響下週計畫）'}
          </span>
          {showFeedback ? <ChevronUp className="h-4 w-4" style={{ color: colors.text.tertiary }} /> : <ChevronDown className="h-4 w-4" style={{ color: colors.text.tertiary }} />}
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
