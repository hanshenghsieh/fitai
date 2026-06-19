'use client'

import { useCallback, useMemo, useState } from 'react'
import { Search, Dices, X } from 'lucide-react'
import { toast } from 'sonner'
import { searchFoodMenu } from '@/lib/food-search'
import { buildUserBanks } from '@/lib/banks/build-banks'
import { getCorrectionMessage, getOsGreeting } from '@/lib/engines/correction-engine'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  rollMealSuggestion,
  suggestionToSelections,
  memoryFromCheckinMeta,
} from '@/lib/meal-engine'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { linesToDisplayItems } from '@/lib/meal-suggest'
import { mealMacroSplit } from '@/lib/goal-calculator'
import {
  currentMealSlotForSchedule,
  type WorkSchedule,
} from '@/lib/human-mode'
import {
  appendSeenForMeal,
  recordMealRoll,
  rollsForMeal,
  seenIdsForMeal,
  type MealType,
  type UserMemoryMeta,
  type DailyRollState,
  type MealSuggestState,
  type CustomEatOutSelection,
} from '@/lib/checkin-utils'
import { useGeolocation } from '@/lib/use-geolocation'
import { colors, cardStyle } from '@/lib/design-system'
import ZaiJian from '@/components/character/ZaiJian'
import ScrollFloatCard from '@/components/motion/ScrollFloatCard'
import ExpandPanel from '@/components/motion/ExpandPanel'
import type { DayPlan, UserProfile } from '@/types'

interface GoalSnapshot {
  daily_deficit?: number
  total_deficit_kcal?: number
  weeks_remaining?: number
  lean_mass_kg?: number
}

interface Props {
  todayPlan: DayPlan
  profile?: UserProfile | null
  goalSnapshot?: GoalSnapshot | null
  userMemory: UserMemoryMeta
  dailyRolls: DailyRollState
  mealSuggest: Partial<Record<MealType, MealSuggestState>>
  customEatOut: Partial<Record<MealType, CustomEatOutSelection[]>>
  dayIndex?: number
  workoutDone: number
  workoutTotal: number
  onLogFood: (logs: FoodLogEntry[], userMemory: UserMemoryMeta) => void
  onDiceApply: (payload: {
    mealType: MealType
    selection: CustomEatOutSelection[]
    dailyRolls: DailyRollState
    mealSuggest: Partial<Record<MealType, MealSuggestState>>
    userMemory: UserMemoryMeta
    logEntry: FoodLogEntry
  }) => void
}

export default function TodayOS({
  todayPlan,
  profile,
  goalSnapshot,
  userMemory,
  dailyRolls,
  mealSuggest,
  customEatOut,
  dayIndex = 0,
  workoutDone,
  workoutTotal,
  onLogFood,
  onDiceApply,
}: Props) {
  const schedule: WorkSchedule = userMemory.work_schedule ?? 'standard'
  const mealSlot = currentMealSlotForSchedule(schedule)
  const coords = useGeolocation(userMemory.eat_out_prefs?.work_location)
  const memory = memoryFromCheckinMeta({ user_memory: userMemory })

  const [query, setQuery] = useState('')
  const [diceOpen, setDiceOpen] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [correctionLine, setCorrectionLine] = useState(getOsGreeting())

  const foodLogs = userMemory.food_logs_today ?? []

  const banks = useMemo(
    () => buildUserBanks(todayPlan, goalSnapshot, foodLogs, workoutDone, workoutTotal),
    [todayPlan, goalSnapshot, foodLogs, workoutDone, workoutTotal]
  )

  const results = useMemo(() => searchFoodMenu(query, 6), [query])

  const mealTargetKcal = useMemo(() => {
    const split = mealMacroSplit(
      {
        dailyCalories: todayPlan.daily_targets.calories,
        proteinGrams: todayPlan.daily_targets.protein_g,
        carbsGrams: todayPlan.daily_targets.carbs_g,
        fatGrams: todayPlan.daily_targets.fat_g,
      },
      mealSlot
    )
    return split.calories
  }, [todayPlan.daily_targets, mealSlot])

  const logFood = useCallback(
    (entry: Omit<FoodLogEntry, 'logged_at' | 'user_declared'>) => {
      const full: FoodLogEntry = {
        ...entry,
        logged_at: new Date().toISOString(),
        user_declared: true,
      }
      const nextLogs = [...foodLogs, full]
      const nextMemory = { ...userMemory, food_logs_today: nextLogs }
      const delta = full.calories - mealTargetKcal
      const line = getCorrectionMessage({
        banks: buildUserBanks(todayPlan, goalSnapshot, nextLogs, workoutDone, workoutTotal),
        lifeEvent: userMemory.life_event_mode,
        lastLogDeltaKcal: delta,
      })
      setCorrectionLine(line)
      setQuery('')
      onLogFood(nextLogs, nextMemory)
    },
    [foodLogs, userMemory, mealTargetKcal, todayPlan, goalSnapshot, workoutDone, workoutTotal, onLogFood]
  )

  const handleDice = useCallback(() => {
    setRolling(true)
    const mealType = mealSlot
    const rollsUsed = rollsForMeal(dailyRolls, mealType)
    const mealSeenIds = seenIdsForMeal(dailyRolls, mealType)

    const result = rollMealSuggestion({
      meal_type: mealType,
      daily_targets: todayPlan.daily_targets,
      profile,
      memory,
      day_index: dayIndex,
      seen_ids: mealSeenIds,
      rolls_used: rollsUsed,
      user_lat: coords?.lat,
      user_lng: coords?.lng,
    })

    setTimeout(() => {
      setRolling(false)
      if (!result.suggestion) {
        toast.message('暫時想不到別的，搜尋看看？')
        return
      }

      const selection = suggestionToSelections(result.suggestion)
      const items = linesToDisplayItems(result.suggestion.lines)
      const totalKcal = items.reduce((s, i) => s + (i.calories ?? 0), 0)
      const totalPro = items.reduce((s, i) => s + (i.protein_g ?? 0), 0)
      const name = items.map(i => i.name).join(' + ')
      const logEntry: FoodLogEntry = {
        id: `dice-${result.suggestion.id}`,
        name,
        store: items[0]?.store,
        calories: totalKcal,
        protein_g: totalPro,
        logged_at: new Date().toISOString(),
        user_declared: true,
        source: 'dice',
      }
      const newDailyRolls = appendSeenForMeal(dailyRolls, mealType, result.suggestion.id)
      const newSuggest = {
        ...mealSuggest,
        [mealType]: {
          current_highlight: result.suggestion.highlight,
          current_highlight_key: result.suggestion.highlight_key,
        },
      }
      const nextLogs = [...foodLogs, logEntry]
      const nextMemory = { ...userMemory, food_logs_today: nextLogs }
      const delta = totalKcal - mealTargetKcal
      setCorrectionLine(
        getCorrectionMessage({
          banks: buildUserBanks(todayPlan, goalSnapshot, nextLogs, workoutDone, workoutTotal),
          lifeEvent: userMemory.life_event_mode,
          lastLogDeltaKcal: delta,
        })
      )
      onDiceApply({
        mealType,
        selection,
        dailyRolls: recordMealRoll(newDailyRolls, mealType),
        mealSuggest: newSuggest,
        userMemory: nextMemory,
        logEntry,
      })
      setDiceOpen(false)
    }, 400)
  }, [
    mealSlot,
    dailyRolls,
    todayPlan,
    profile,
    memory,
    dayIndex,
    coords,
    mealSuggest,
    userMemory,
    foodLogs,
    goalSnapshot,
    workoutDone,
    workoutTotal,
    onDiceApply,
  ])

  return (
    <div className="px-4 pt-2 pb-4 space-y-4" style={{ backgroundColor: colors.bg.canvas }}>
      <ScrollFloatCard depth={0} staggerIndex={0} className="rounded-2xl p-5" style={cardStyle}>
        <ZaiJian size="md" line={correctionLine} layout="stacked" className="mb-4" />

        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
          style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}` }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: colors.text.tertiary }} />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="今天想吃什麼？搜尋店名或菜名"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[13px]"
            style={{ color: colors.text.primary }}
            aria-label="搜尋食物"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="清除">
              <X className="h-4 w-4" style={{ color: colors.text.tertiary }} />
            </button>
          )}
        </div>

        {results.length > 0 && (
          <ul className="space-y-2 mb-3">
            {results.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    logFood({
                      id: item.id,
                      name: item.name,
                      store: item.store,
                      calories: item.calories,
                      protein_g: item.protein_g,
                      source: 'search',
                    })
                  }
                  className="w-full text-left p-3 rounded-xl transition-colors"
                  style={{
                    backgroundColor: colors.bg.elevated,
                    border: `1px solid ${colors.border.subtle}`,
                  }}
                >
                  <p className="font-semibold text-[14px]" style={{ color: colors.text.primary }}>
                    {item.name}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: colors.text.secondary }}>
                    {item.store} · {item.calories} kcal · {item.protein_g}g 蛋白
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {foodLogs.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold mb-2" style={{ color: colors.text.tertiary }}>
              今天記了
            </p>
            <ul className="space-y-1">
              {foodLogs.map((log, i) => (
                <li
                  key={`${log.id}-${i}`}
                  className="text-[13px] px-2 py-1 rounded-lg"
                  style={{ color: colors.text.secondary, backgroundColor: colors.bg.muted }}
                >
                  {log.name}
                  {log.store ? ` · ${log.store}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => setDiceOpen(!diceOpen)}
          className="text-[13px] font-medium flex items-center gap-1.5"
          style={{ color: colors.text.tertiary }}
        >
          <Dices className="h-3.5 w-3.5" />
          不知道？🎲 交給我
        </button>

        <ExpandPanel open={diceOpen} className="pt-3">
          <p className="text-[12px] mb-3" style={{ color: colors.text.secondary }}>
            幫你想一個符合目標的外食組合。選了就算記錄。
          </p>
          <button
            type="button"
            disabled={rolling}
            onClick={handleDice}
            className="w-full py-3 rounded-xl text-[14px] font-semibold"
            style={{ backgroundColor: colors.accent.action, color: '#FFFDF9', opacity: rolling ? 0.7 : 1 }}
          >
            {rolling ? '想一下…' : '🎲 交給我'}
          </button>
        </ExpandPanel>
      </ScrollFloatCard>
    </div>
  )
}
