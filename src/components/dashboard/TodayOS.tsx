'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Dices, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { searchFoodMenu } from '@/lib/food-search'
import { estimateFreeTextMeal } from '@/lib/food-estimate'
import { buildUserBanks } from '@/lib/banks/build-banks'
import { getCorrectionMessage, getOsGreeting } from '@/lib/engines/correction-engine'
import { getLifeEventWelcome } from '@/lib/life-event-copy'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  rollMealSuggestion,
  suggestionToSelections,
  memoryFromCheckinMeta,
  type MealSuggestion,
} from '@/lib/meal-engine'
import { linesToDisplayItems } from '@/lib/meal-suggest'
import { mealMacroSplit } from '@/lib/goal-calculator'
import {
  currentMealSlotForSchedule,
  type WorkSchedule,
} from '@/lib/human-mode'
import {
  appendSeenForMeal,
  recordMealRoll,
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

function applyCorrection(
  logs: FoodLogEntry[],
  userMemory: UserMemoryMeta,
  todayPlan: DayPlan,
  goalSnapshot: GoalSnapshot | null | undefined,
  workoutDone: number,
  workoutTotal: number,
  mealTargetKcal: number,
  lastDelta?: number
) {
  if (userMemory.life_event_mode && lastDelta === undefined) {
    return getLifeEventWelcome(userMemory.life_event_mode)
  }
  return getCorrectionMessage({
    banks: buildUserBanks(todayPlan, goalSnapshot, logs, workoutDone, workoutTotal),
    lifeEvent: userMemory.life_event_mode,
    lastLogDeltaKcal: lastDelta ?? 0,
  })
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
  const [dicePreview, setDicePreview] = useState<MealSuggestion | null>(null)
  const [localDiceRolls, setLocalDiceRolls] = useState(0)
  const [pendingFreeText, setPendingFreeText] = useState<string | null>(null)
  const [correctionLine, setCorrectionLine] = useState(getOsGreeting())

  const foodLogs = userMemory.food_logs_today ?? []
  const lifeEvent = userMemory.life_event_mode ?? null

  const mealTargets = useMemo(() => {
    const split = mealMacroSplit(
      {
        dailyCalories: todayPlan.daily_targets.calories,
        proteinGrams: todayPlan.daily_targets.protein_g,
        carbsGrams: todayPlan.daily_targets.carbs_g,
        fatGrams: todayPlan.daily_targets.fat_g,
      },
      mealSlot
    )
    return { calories: split.calories, protein: split.protein }
  }, [todayPlan.daily_targets, mealSlot])

  const results = useMemo(() => searchFoodMenu(query, 6), [query])
  const trimmedQuery = query.trim()
  const showFreeTextOption =
    trimmedQuery.length >= 2 &&
    !results.some(r => r.name.toLowerCase() === trimmedQuery.toLowerCase())

  useEffect(() => {
    if (lifeEvent) {
      setCorrectionLine(getLifeEventWelcome(lifeEvent))
    } else if (foodLogs.length === 0) {
      setCorrectionLine(getOsGreeting())
    }
  }, [lifeEvent, foodLogs.length])

  const commitLog = useCallback(
    (entry: Omit<FoodLogEntry, 'logged_at' | 'user_declared'>) => {
      const full: FoodLogEntry = {
        ...entry,
        logged_at: new Date().toISOString(),
        user_declared: true,
      }
      const nextLogs = [...foodLogs, full]
      const nextMemory = { ...userMemory, food_logs_today: nextLogs }
      const delta = full.calories - mealTargets.calories
      setCorrectionLine(
        applyCorrection(nextLogs, nextMemory, todayPlan, goalSnapshot, workoutDone, workoutTotal, mealTargets.calories, delta)
      )
      setQuery('')
      setPendingFreeText(null)
      onLogFood(nextLogs, nextMemory)
    },
    [foodLogs, userMemory, mealTargets.calories, todayPlan, goalSnapshot, workoutDone, workoutTotal, onLogFood]
  )

  const removeLog = useCallback(
    (index: number) => {
      const nextLogs = foodLogs.filter((_, i) => i !== index)
      const nextMemory = { ...userMemory, food_logs_today: nextLogs }
      setCorrectionLine(
        applyCorrection(nextLogs, nextMemory, todayPlan, goalSnapshot, workoutDone, workoutTotal, mealTargets.calories)
      )
      onLogFood(nextLogs, nextMemory)
    },
    [foodLogs, userMemory, todayPlan, goalSnapshot, workoutDone, workoutTotal, mealTargets.calories, onLogFood]
  )

  const rollDice = useCallback(() => {
    setRolling(true)
    const mealType = mealSlot
    const mealSeenIds = seenIdsForMeal(dailyRolls, mealType)
    const previewId = dicePreview?.id
    const excludeIds =
      previewId && !mealSeenIds.includes(previewId) ? [...mealSeenIds, previewId] : mealSeenIds

    const result = rollMealSuggestion({
      meal_type: mealType,
      daily_targets: todayPlan.daily_targets,
      profile,
      memory,
      day_index: dayIndex,
      seen_ids: excludeIds,
      rolls_used: localDiceRolls,
      user_lat: coords?.lat,
      user_lng: coords?.lng,
    })

    setTimeout(() => {
      setRolling(false)
      setLocalDiceRolls(n => n + 1)
      if (!result.suggestion) {
        toast.message('暫時想不到別的，自己搜尋或手動記？')
        return
      }
      setDicePreview(result.suggestion)
    }, 350)
  }, [
    mealSlot,
    dailyRolls,
    dicePreview,
    todayPlan,
    profile,
    memory,
    dayIndex,
    coords,
    localDiceRolls,
  ])

  const confirmDice = useCallback(() => {
    if (!dicePreview) return
    const mealType = mealSlot
    const selection = suggestionToSelections(dicePreview)
    const items = linesToDisplayItems(dicePreview.lines)
    const totalKcal = items.reduce((s, i) => s + (i.calories ?? 0), 0)
    const totalPro = items.reduce((s, i) => s + (i.protein_g ?? 0), 0)
    const name = items.map(i => i.name).join(' + ')
    const logEntry: FoodLogEntry = {
      id: `dice-${dicePreview.id}`,
      name,
      store: items[0]?.store,
      calories: totalKcal,
      protein_g: totalPro,
      logged_at: new Date().toISOString(),
      user_declared: true,
      source: 'dice',
    }
    const newDailyRolls = appendSeenForMeal(dailyRolls, mealType, dicePreview.id)
    const newSuggest = {
      ...mealSuggest,
      [mealType]: {
        current_highlight: dicePreview.highlight,
        current_highlight_key: dicePreview.highlight_key,
      },
    }
    const nextLogs = [...foodLogs, logEntry]
    const nextMemory = { ...userMemory, food_logs_today: nextLogs }
    const delta = totalKcal - mealTargets.calories
    setCorrectionLine(
      applyCorrection(nextLogs, nextMemory, todayPlan, goalSnapshot, workoutDone, workoutTotal, mealTargets.calories, delta)
    )
    onDiceApply({
      mealType,
      selection,
      dailyRolls: recordMealRoll(newDailyRolls, mealType),
      mealSuggest: newSuggest,
      userMemory: nextMemory,
      logEntry,
    })
    setDicePreview(null)
    setLocalDiceRolls(0)
    setDiceOpen(false)
  }, [
    dicePreview,
    mealSlot,
    dailyRolls,
    mealSuggest,
    foodLogs,
    userMemory,
    mealTargets.calories,
    todayPlan,
    goalSnapshot,
    workoutDone,
    workoutTotal,
    onDiceApply,
  ])

  const confirmFreeText = useCallback(() => {
    if (!pendingFreeText) return
    const est = estimateFreeTextMeal(pendingFreeText, mealTargets.calories, mealTargets.protein)
    commitLog(est)
  }, [pendingFreeText, mealTargets, commitLog])

  const previewItems = dicePreview ? linesToDisplayItems(dicePreview.lines) : []

  return (
    <div className="px-4 pt-2 pb-4 space-y-4" style={{ backgroundColor: colors.bg.canvas }}>
      <ScrollFloatCard depth={0} staggerIndex={0} className="rounded-2xl p-5" style={cardStyle}>
        <ZaiJian size="md" line={correctionLine} layout="stacked" className="mb-4" />

        {lifeEvent && (
          <p
            className="text-[11px] mb-3 px-2 py-1.5 rounded-lg inline-block"
            style={{ backgroundColor: colors.accent.actionSoft, color: colors.accent.action }}
          >
            生活模式已開啟 · 這週不懲罰
          </p>
        )}

        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
          style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}` }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: colors.text.tertiary }} />
          <input
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setPendingFreeText(null)
            }}
            placeholder="今天想吃什麼？搜尋或輸入菜名"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[13px]"
            style={{ color: colors.text.primary }}
            aria-label="搜尋食物"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setPendingFreeText(null) }} aria-label="清除">
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
                    commitLog({
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

        {showFreeTextOption && !pendingFreeText && (
          <button
            type="button"
            onClick={() => setPendingFreeText(trimmedQuery)}
            className="w-full text-left p-3 rounded-xl mb-3"
            style={{
              backgroundColor: colors.bg.elevated,
              border: `1px dashed ${colors.border.focus}`,
            }}
          >
            <p className="font-semibold text-[14px]" style={{ color: colors.text.primary }}>
              記錄「{trimmedQuery}」
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: colors.text.tertiary }}>
              菜單沒有也 OK · 確認後才記入
            </p>
          </button>
        )}

        {pendingFreeText && (
          <div
            className="rounded-xl p-4 mb-3 space-y-3"
            style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}` }}
          >
            <p className="text-[14px] font-semibold" style={{ color: colors.text.primary }}>
              記下「{pendingFreeText}」？
            </p>
            <p className="text-[12px]" style={{ color: colors.text.secondary }}>
              會先當成這餐份量粗估（約 {mealTargets.calories} kcal），背後再幫你調。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmFreeText}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
              >
                確認記錄
              </button>
              <button
                type="button"
                onClick={() => setPendingFreeText(null)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ backgroundColor: colors.bg.elevated, color: colors.text.secondary }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {foodLogs.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold mb-2" style={{ color: colors.text.tertiary }}>
              今天記了（可刪除）
            </p>
            <ul className="space-y-1">
              {foodLogs.map((log, i) => (
                <li
                  key={`${log.id}-${i}`}
                  className="flex items-center gap-2 text-[13px] px-2 py-1.5 rounded-lg"
                  style={{ color: colors.text.secondary, backgroundColor: colors.bg.muted }}
                >
                  <span className="flex-1 min-w-0 truncate">
                    {log.name}
                    {log.store ? ` · ${log.store}` : ''}
                    {log.source === 'free_text' && (
                      <span className="text-[10px] ml-1" style={{ color: colors.text.tertiary }}>自填</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLog(i)}
                    className="p-1 rounded-lg shrink-0"
                    style={{ color: colors.text.tertiary }}
                    aria-label={`刪除 ${log.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setDiceOpen(!diceOpen)
            if (diceOpen) {
              setDicePreview(null)
              setLocalDiceRolls(0)
            }
          }}
          className="text-[13px] font-medium flex items-center gap-1.5"
          style={{ color: colors.text.tertiary }}
        >
          <Dices className="h-3.5 w-3.5" />
          不知道？🎲 交給我
        </button>

        <ExpandPanel open={diceOpen} className="pt-3 space-y-3">
          <p className="text-[12px]" style={{ color: colors.text.secondary }}>
            可以一直骰。滿意了再按「就這個」才會記錄。
          </p>

          {!dicePreview ? (
            <button
              type="button"
              disabled={rolling}
              onClick={rollDice}
              className="w-full py-3 rounded-xl text-[14px] font-semibold"
              style={{ backgroundColor: colors.accent.action, color: '#FFFDF9', opacity: rolling ? 0.7 : 1 }}
            >
              {rolling ? '想一下…' : '🎲 骰一個'}
            </button>
          ) : (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}` }}
            >
              <ul className="space-y-1">
                {previewItems.map((item, i) => (
                  <li key={i} className="text-[13px]" style={{ color: colors.text.primary }}>
                    {item.name}
                    {item.store && (
                      <span className="text-[11px] block" style={{ color: colors.text.tertiary }}>
                        {item.store}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-[12px]" style={{ color: colors.text.secondary }}>
                約 {previewItems.reduce((s, i) => s + (i.calories ?? 0), 0)} kcal
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmDice}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
                >
                  就這個
                </button>
                <button
                  type="button"
                  disabled={rolling}
                  onClick={rollDice}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1"
                  style={{ backgroundColor: colors.bg.elevated, color: colors.text.secondary }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${rolling ? 'animate-spin' : ''}`} />
                  再骰
                </button>
              </div>
            </div>
          )}
        </ExpandPanel>
      </ScrollFloatCard>
    </div>
  )
}
