'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapPin, Navigation, Heart, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { currentMealSlotForSchedule, getMealLabels, type WorkSchedule } from '@/lib/human-mode'
import { getTaipeiHour } from '@/lib/timezone'
import { humanizeMealReasoning } from '@/lib/meal-trust-copy'
import MealTrustCard from '@/components/dashboard/MealTrustCard'
import {
  rollMealSuggestion,
  suggestionToSelections,
  recordFavorite,
  memoryFromCheckinMeta,
  type MealSuggestion,
} from '@/lib/meal-engine'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { linesToDisplayItems } from '@/lib/meal-suggest'
import { suggestionId } from '@/lib/meal-engine-types'
import { mealMacroSplit } from '@/lib/goal-calculator'
import { formatEatOutItemMeta, deserializeCustomCombo, selectedToDisplayItems } from '@/lib/eat-out-builder'
import { useGeolocation } from '@/lib/use-geolocation'
import { appendSeenForMeal, seenIdsForMeal, rollsForMeal, recordMealRoll } from '@/lib/checkin-utils'
import { colors, cardStyle } from '@/lib/design-system'
import { SWAP_BUTTON, PLAN_FIRST_HINT, formatSwapReason } from '@/lib/coach-copy'
import { zaijian } from '@/lib/copy/zaijian'
import CoachPlanSummary from '@/components/coach/CoachPlanSummary'
import ScrollFloatCard from '@/components/motion/ScrollFloatCard'
import ExpandPanel from '@/components/motion/ExpandPanel'
import type {
  MealType,
  CustomEatOutSelection,
  MealSuggestState,
  UserMemoryMeta,
  DailyRollState,
} from '@/lib/checkin-utils'
import type { UserProfile, DayPlan } from '@/types'

interface GoalSnapshot {
  daily_deficit?: number
  lean_mass_kg?: number
  weekly_fat_loss_g?: number
  target_weight?: number | null
  tdee?: number
}

interface Props {
  todayPlan: DayPlan
  profile?: UserProfile | null
  goalSnapshot?: GoalSnapshot | null
  weekNumber?: number
  coachNote?: string | null
  dayIndex?: number
  todayLabel?: string
  dailyRolls: DailyRollState
  mealSuggest: Partial<Record<MealType, MealSuggestState>>
  customEatOut: Partial<Record<MealType, CustomEatOutSelection[]>>
  userMemory: UserMemoryMeta
  onApply: (payload: {
    mealType: MealType
    selection: CustomEatOutSelection[]
    dailyRolls: DailyRollState
    mealSuggest: Partial<Record<MealType, MealSuggestState>>
    userMemory: UserMemoryMeta
    switchToConvenience?: boolean
  }) => void
}

export default function HomeDecisionHero({
  todayPlan,
  profile,
  goalSnapshot,
  weekNumber,
  coachNote,
  dayIndex = 0,
  todayLabel,
  dailyRolls,
  mealSuggest,
  customEatOut,
  userMemory,
  onApply,
}: Props) {
  const schedule: WorkSchedule = userMemory.work_schedule ?? 'standard'
  const lifeEvent = userMemory.life_event_mode ?? null

  const [nowSlot, setNowSlot] = useState<MealType>('breakfast')
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast')
  useEffect(() => {
    const slot = currentMealSlotForSchedule(schedule)
    setNowSlot(slot)
    setSelectedMeal(slot)
  }, [schedule])

  const mealLabels = getMealLabels(schedule)
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner']

  const coords = useGeolocation(userMemory.eat_out_prefs?.work_location)
  const [activeSuggestion, setActiveSuggestion] = useState<MealSuggestion | null>(null)
  const [swapping, setSwapping] = useState(false)

  const memory = memoryFromCheckinMeta({ user_memory: userMemory })
  const rollsUsed = rollsForMeal(dailyRolls, selectedMeal)
  const mealSeenIds = seenIdsForMeal(dailyRolls, selectedMeal)

  const mealTargets = useMemo(() => {
    const nutrition = {
      dailyCalories: todayPlan.daily_targets.calories,
      proteinGrams: todayPlan.daily_targets.protein_g,
      carbsGrams: todayPlan.daily_targets.carbs_g,
      fatGrams: todayPlan.daily_targets.fat_g,
    }
    const split = mealMacroSplit(nutrition, selectedMeal)
    return { calories: split.calories, protein: split.protein }
  }, [todayPlan.daily_targets, selectedMeal])

  useEffect(() => {
    setActiveSuggestion(null)
  }, [selectedMeal])

  const previewItems = useMemo(() => {
    const custom = customEatOut[selectedMeal]
    if (custom?.length) {
      return selectedToDisplayItems(deserializeCustomCombo(custom, eatOutMenu))
    }
    const plan = todayPlan.convenience_meals?.find(m => m.meal_type === selectedMeal)
    return plan?.items ?? []
  }, [customEatOut, selectedMeal, todayPlan.convenience_meals])

  const handleSwap = useCallback(() => {
    setSwapping(true)
    const currentNames = activeSuggestion
      ? [...new Set(activeSuggestion.lines.map(l => l.item.name))]
      : (customEatOut[selectedMeal] ?? [])
          .map(s => eatOutMenu.find(i => i.id === s.id)?.name)
          .filter((n): n is string => !!n)

    const currentId = activeSuggestion?.id
      ?? (customEatOut[selectedMeal]?.length
        ? suggestionId(
            customEatOut[selectedMeal]!.map(s => ({
              item: eatOutMenu.find(i => i.id === s.id)!,
              portion: s.portion,
            })).filter(l => l.item)
          )
        : null)

    const excludeIds =
      currentId && !mealSeenIds.includes(currentId) ? [...mealSeenIds, currentId] : mealSeenIds

    const result = rollMealSuggestion({
      meal_type: selectedMeal,
      daily_targets: todayPlan.daily_targets,
      profile,
      memory,
      day_index: dayIndex,
      seen_ids: excludeIds,
      exclude_names: currentNames,
      rolls_used: rollsUsed,
      user_lat: coords?.lat,
      user_lng: coords?.lng,
    })

    setTimeout(() => {
      setSwapping(false)
      if (!result.suggestion) {
        toast.message('暫時找不到其他符合目標的組合')
        onApply({
          mealType: selectedMeal,
          selection: customEatOut[selectedMeal] ?? [],
          dailyRolls: recordMealRoll(dailyRolls, selectedMeal),
          mealSuggest,
          userMemory,
          switchToConvenience: true,
        })
        return
      }

      setActiveSuggestion(result.suggestion)
      const selection = suggestionToSelections(result.suggestion)
      const newDailyRolls = appendSeenForMeal(dailyRolls, selectedMeal, result.suggestion.id)
      const newSuggest: Partial<Record<MealType, MealSuggestState>> = {
        ...mealSuggest,
        [selectedMeal]: {
          current_highlight: result.suggestion.highlight,
          current_highlight_key: result.suggestion.highlight_key,
        },
      }

      onApply({
        mealType: selectedMeal,
        selection,
        dailyRolls: newDailyRolls,
        mealSuggest: newSuggest,
        userMemory,
        switchToConvenience: true,
      })
    }, 300)
  }, [
    rollsUsed,
    dailyRolls,
    selectedMeal,
    todayPlan,
    profile,
    memory,
    dayIndex,
    coords,
    mealSuggest,
    userMemory,
    onApply,
    activeSuggestion,
    customEatOut,
    mealSeenIds,
  ])

  const handleFavorite = () => {
    if (!activeSuggestion) return
    const updated = recordFavorite(memory, activeSuggestion)
    onApply({
      mealType: selectedMeal,
      selection: customEatOut[selectedMeal] ?? suggestionToSelections(activeSuggestion),
      dailyRolls,
      mealSuggest,
      userMemory: {
        ...userMemory,
        favorite_item_ids: updated.favorite_item_ids,
        favorite_brands: updated.favorite_brands,
      },
    })
    toast.success(zaijian.favorite)
  }

  const displayItems = activeSuggestion
    ? linesToDisplayItems(activeSuggestion.lines)
    : previewItems
  const displayTotals = activeSuggestion
    ? activeSuggestion.totals
    : {
        calories: displayItems.reduce((s, i) => s + i.calories, 0),
        protein_g: displayItems.reduce((s, i) => s + i.protein_g, 0),
      }

  const swapNote = formatSwapReason(
    displayTotals.calories,
    mealTargets.calories,
    displayTotals.protein_g,
    mealTargets.protein
  )

  const locHint =
    coords?.source === 'gps' || coords?.source === 'work'
      ? zaijian.nearby
      : '全台便利店菜單'

  const planReasoning = todayPlan.convenience_meals?.find(m => m.meal_type === selectedMeal)?.reasoning
  const trustCopy = humanizeMealReasoning(planReasoning, {
    mealType: selectedMeal,
    schedule,
    lifeEvent,
    isConvenience: true,
  })

  return (
    <div className="pt-12 pb-2 px-4 space-y-4" style={{ backgroundColor: colors.bg.canvas }}>
      <ScrollFloatCard depth={0} staggerIndex={0}>
        <CoachPlanSummary
          todayPlan={todayPlan}
          goalSnapshot={goalSnapshot}
          weekNumber={weekNumber}
          coachNote={coachNote}
          todayLabel={todayLabel}
          compact
        />
      </ScrollFloatCard>

      <ScrollFloatCard depth={0} staggerIndex={1}>
        <div className="rounded-3xl p-5 space-y-4" style={{ ...cardStyle, backgroundColor: colors.bg.elevated }}>
          <div>
            <p className="text-[11px] font-semibold" style={{ color: colors.accent.action }}>
              今日{mealLabels[selectedMeal]}
            </p>
            <p className="text-[13px] mt-1" style={{ color: colors.text.tertiary }}>
              {PLAN_FIRST_HINT}
            </p>
          </div>

          <MealTrustCard title={trustCopy.title} body={trustCopy.body} />

          <div className="flex gap-2">
            {mealTypes.map(mt => {
              const active = selectedMeal === mt
              const isNow = nowSlot === mt
              const nowHint = schedule === 'shift' && mt === 'dinner' && isNow && (getTaipeiHour() >= 22 || getTaipeiHour() < 5)
                ? '睡前'
                : isNow && !active
                  ? '現在'
                  : ''
              return (
                <button
                  key={mt}
                  type="button"
                  onClick={() => setSelectedMeal(mt)}
                  className="flex-1 min-h-[44px] py-1.5 rounded-xl text-[12px] font-semibold flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: active ? colors.accent.action : colors.bg.muted,
                    color: active ? '#FFFDF9' : colors.text.secondary,
                    border: `1px solid ${active ? colors.accent.action : colors.border.subtle}`,
                  }}
                >
                  <span>{mealLabels[mt]}</span>
                  <span
                    className="text-[10px] font-normal leading-[14px] h-[14px]"
                    style={{ opacity: nowHint ? 0.7 : 0 }}
                    aria-hidden={!nowHint}
                  >
                    {nowHint || '現在'}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="text-[12px]" style={{ color: colors.text.tertiary }}>
            {PLAN_FIRST_HINT}
          </p>

          <ExpandPanel open={displayItems.length > 0} className="space-y-2">
            {displayItems.map(item => (
              <div
                key={item.id + item.name}
                className="p-3 rounded-xl"
                style={{ backgroundColor: colors.bg.canvas, border: `1px solid ${colors.border.subtle}` }}
              >
                <p className="font-semibold text-[15px]" style={{ color: colors.text.primary }}>{item.name}</p>
                <p className="text-[13px] mt-0.5" style={{ color: colors.text.tertiary }}>
                  {formatEatOutItemMeta(item, { protein: true })}
                </p>
              </div>
            ))}
          </ExpandPanel>

          {displayItems.length > 0 && (
            <p className="text-center text-[13px]" style={{ color: colors.text.secondary }}>
              合計 {displayTotals.calories} kcal · {Math.round(displayTotals.protein_g)}g 蛋白
              <span className="block text-[11px] mt-0.5" style={{ color: colors.text.tertiary }}>{swapNote}</span>
            </p>
          )}

          <p className="text-[12px] flex items-center justify-center gap-1" style={{ color: colors.text.tertiary }}>
            <MapPin className="h-3.5 w-3.5" /> {locHint}
          </p>

          <button
            type="button"
            onClick={handleSwap}
            disabled={swapping}
            className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ backgroundColor: colors.bg.muted, color: colors.text.primary, border: `1px solid ${colors.border.subtle}` }}
          >
            <RefreshCw className={`h-4 w-4 ${swapping ? 'animate-spin' : ''}`} />
            {swapping ? '找同熱量組合…' : SWAP_BUTTON}
          </button>

          {activeSuggestion && (
            <div className="flex gap-2">
              {activeSuggestion.maps_url && (
                <a
                  href={activeSuggestion.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1"
                  style={{ backgroundColor: colors.bg.canvas, color: colors.text.primary, border: `1px solid ${colors.border.subtle}` }}
                >
                  <Navigation className="h-3.5 w-3.5" /> {zaijian.navigate}
                </a>
              )}
              <button
                type="button"
                onClick={handleFavorite}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1"
                style={{ backgroundColor: colors.accent.actionSoft, color: colors.accent.action }}
              >
                <Heart className="h-3.5 w-3.5" /> 收藏
              </button>
            </div>
          )}
        </div>
      </ScrollFloatCard>
    </div>
  )
}
