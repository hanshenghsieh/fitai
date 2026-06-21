'use client'

import { useMemo } from 'react'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import {
  deserializeCustomCombo,
  selectedToDisplayItems,
  validateEatOutCombo,
  formatEatOutItemMeta,
} from '@/lib/eat-out-builder'
import { rollMealSuggestion, suggestionToSelections, memoryFromCheckinMeta } from '@/lib/meal-engine'
import { suggestionId } from '@/lib/meal-engine-types'
import { useGeolocation } from '@/lib/use-geolocation'
import { seenIdsForMeal, appendSeenForMeal, rollsForMeal, recordMealRoll, type MealType, type MealSuggestState, type UserMemoryMeta } from '@/lib/checkin-utils'
import { zaijian } from '@/lib/copy/zaijian'
import { colors } from '@/lib/design-system'
import type { UserProfile } from '@/types'
import type { PortionId } from '@/lib/eat-out-builder'
import type { DailyRollState } from '@/lib/checkin-utils'

interface Props {
  mealType: MealType
  dailyTargets: { calories: number; protein_g: number }
  profile?: UserProfile | null
  userMemory?: UserMemoryMeta
  mealSuggestState?: MealSuggestState
  dailyRolls: DailyRollState
  dayIndex?: number
  suggestedItems?: { id: string; name: string; store: string; calories: number; protein_g: number; price?: number }[]
  savedSelection?: { id: string; portion: PortionId }[]
  onRoll: (payload: {
    selection: { id: string; portion: PortionId }[]
    dailyRolls: DailyRollState
    mealSuggest: MealSuggestState
  }) => void
}

export default function EatOutBuilder({
  mealType,
  dailyTargets,
  profile,
  userMemory,
  mealSuggestState,
  dailyRolls,
  dayIndex = 0,
  suggestedItems = [],
  savedSelection,
  onRoll,
}: Props) {
  const coords = useGeolocation(userMemory?.eat_out_prefs?.work_location)
  const memory = memoryFromCheckinMeta({ user_memory: userMemory })
  const rollsUsed = rollsForMeal(dailyRolls, mealType)
  const mealSeenIds = seenIdsForMeal(dailyRolls, mealType)

  const selected = useMemo(() => {
    if (savedSelection?.length) {
      return deserializeCustomCombo(savedSelection, eatOutMenu)
    }
    const fromPlan = suggestedItems
      .map(s => eatOutMenu.find(i => i.id === s.id))
      .filter(Boolean)
      .map(item => ({ item: item!, portion: 'full' as PortionId }))
    return fromPlan
  }, [savedSelection, suggestedItems])

  const displayItems = selectedToDisplayItems(selected)
  const validation = validateEatOutCombo(selected, mealType, dailyTargets)

  const handleRoll = () => {
    const currentNames = displayItems.map(i => i.name)
    const currentId =
      selected.length > 0
        ? suggestionId(selected.map(s => ({ item: s.item, portion: s.portion })))
        : null
    const excludeIds = currentId && !mealSeenIds.includes(currentId)
      ? [...mealSeenIds, currentId]
      : mealSeenIds

    const result = rollMealSuggestion({
      meal_type: mealType,
      daily_targets: dailyTargets,
      profile,
      memory,
      day_index: dayIndex,
      seen_ids: excludeIds,
      exclude_names: currentNames,
      rolls_used: rollsUsed,
      user_lat: coords?.lat,
      user_lng: coords?.lng,
    })
    if (!result.suggestion) {
      toast.message('暫時找不到其他符合目標的組合')
      onRoll({
        selection: savedSelection ?? [],
        dailyRolls: recordMealRoll(dailyRolls, mealType),
        mealSuggest: mealSuggestState ?? {},
      })
      return
    }
    const newRolls = appendSeenForMeal(dailyRolls, mealType, result.suggestion.id)
    onRoll({
      selection: suggestionToSelections(result.suggestion),
      dailyRolls: newRolls,
      mealSuggest: {
        current_highlight: result.suggestion.highlight,
        current_highlight_key: result.suggestion.highlight_key,
      },
    })
  }

  return (
    <div className="space-y-3">
      {mealSuggestState?.current_highlight && (
        <p
          className="text-[13px] px-3 py-2 rounded-xl text-center"
          style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
        >
          {mealSuggestState.current_highlight}
        </p>
      )}

      <div className="space-y-2">
        {displayItems.map(item => (
          <div
            key={item.id + item.name}
            className="p-3 rounded-xl"
            style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
          >
            <p className="font-semibold text-[15px]" style={{ color: colors.text.primary }}>{item.name}</p>
            <p className="text-[13px] mt-0.5" style={{ color: colors.text.tertiary }}>
              {formatEatOutItemMeta(item)}
              {item.price ? ` · $${item.price}` : ''}
            </p>
          </div>
        ))}
        {!displayItems.length && (
          <p className="text-[13px] text-center py-4" style={{ color: colors.text.tertiary }}>
            點下方換一組
          </p>
        )}
      </div>

      {displayItems.length > 0 && validation.valid && (
        <p className="flex items-center justify-center gap-1 text-[13px]" style={{ color: colors.accent.action }}>
          <CheckCircle2 className="h-3.5 w-3.5" /> {zaijian.mealOk}
        </p>
      )}

      <button
        type="button"
        onClick={handleRoll}
        className="w-full py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2"
        style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
      >
        <RefreshCw className="h-4 w-4" /> {zaijian.reroll}
      </button>
    </div>
  )
}
