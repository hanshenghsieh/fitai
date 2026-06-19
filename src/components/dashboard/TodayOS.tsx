'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, Camera, Clock, Dices, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { searchFoodMenu } from '@/lib/food-search'
import { estimateFreeTextMeal } from '@/lib/food-estimate'
import { buildUserBanks } from '@/lib/banks/build-banks'
import { getCorrectionMessage } from '@/lib/engines/correction-engine'
import { getFoodMemoryGreeting, getFoodPrediction } from '@/lib/engines/food-prediction'
import { inferEvents } from '@/lib/engines/event-engine'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  displayFrequent,
  frequentToLogEntry,
  learnFromLog,
  type FoodDna,
} from '@/lib/food-memory'
import { FOOD_SLOTS, defaultFoodSlot, slotLabel, type FoodSlot } from '@/lib/food-slots'
import { getTaipeiHour } from '@/lib/timezone'
import {
  rollMealSuggestion,
  suggestionToSelections,
  memoryFromCheckinMeta,
  type MealSuggestion,
} from '@/lib/meal-engine'
import { linesToDisplayItems } from '@/lib/meal-suggest'
import { mealMacroSplit } from '@/lib/goal-calculator'
import { currentMealSlotForSchedule, type WorkSchedule } from '@/lib/human-mode'
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

type EntryTab = 'photo' | 'search' | 'frequent'

interface GoalSnapshot {
  daily_deficit?: number
  total_deficit_kcal?: number
  weeks_remaining?: number
}

interface Props {
  todayPlan: DayPlan
  profile?: UserProfile | null
  goalSnapshot?: GoalSnapshot | null
  userMemory: UserMemoryMeta
  foodDna: FoodDna
  dayOfWeek: number
  recentMissedDays: number
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

function applyLine(
  logs: FoodLogEntry[],
  memory: UserMemoryMeta,
  todayPlan: DayPlan,
  goalSnapshot: GoalSnapshot | null | undefined,
  workoutDone: number,
  workoutTotal: number,
  recentMissedDays: number,
  lastDelta?: number
) {
  const banks = buildUserBanks(todayPlan, goalSnapshot, logs, workoutDone, workoutTotal)
  const events = inferEvents({
    workSchedule: memory.work_schedule,
    todayLoggedKcal: banks.calorie.todayLoggedKcal,
    todayTargetKcal: banks.calorie.todayTargetKcal,
    recentMissedDays,
    isWeightPlateau: false,
    highCalorieSnacksToday: logs.filter(l => l.slot === 'other' || l.slot === 'before_sleep').length,
  })
  return getCorrectionMessage({ banks, inferredEvents: events, lastLogDeltaKcal: lastDelta })
}

export default function TodayOS({
  todayPlan,
  profile,
  goalSnapshot,
  userMemory,
  foodDna,
  dayOfWeek,
  recentMissedDays,
  dailyRolls,
  mealSuggest,
  customEatOut,
  dayIndex = 0,
  workoutDone,
  workoutTotal,
  onLogFood,
  onDiceApply,
}: Props) {
  const mealSlotLegacy = currentMealSlotForSchedule(userMemory.work_schedule ?? 'standard') as MealType
  const coords = useGeolocation(userMemory.eat_out_prefs?.work_location)
  const memory = memoryFromCheckinMeta({ user_memory: userMemory })
  const fileRef = useRef<HTMLInputElement>(null)

  const [activeSlot, setActiveSlot] = useState<FoodSlot>(() => defaultFoodSlot(getTaipeiHour()))
  const [entryTab, setEntryTab] = useState<EntryTab>('search')
  const [query, setQuery] = useState('')
  const [pendingFreeText, setPendingFreeText] = useState<string | null>(null)
  const [photoParsing, setPhotoParsing] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<{
    name: string
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    confidence: string
  } | null>(null)
  const [diceOpen, setDiceOpen] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [dicePreview, setDicePreview] = useState<MealSuggestion | null>(null)
  const [localDiceRolls, setLocalDiceRolls] = useState(0)

  const foodLogs = userMemory.food_logs_today ?? []
  const frequentList = useMemo(() => displayFrequent(foodDna), [foodDna])

  const prediction = useMemo(
    () => getFoodPrediction(frequentList, dayOfWeek),
    [frequentList, dayOfWeek]
  )

  const [correctionLine, setCorrectionLine] = useState(
    () => prediction ?? getFoodMemoryGreeting()
  )

  useEffect(() => {
    if (foodLogs.length === 0) {
      setCorrectionLine(prediction ?? getFoodMemoryGreeting())
    }
  }, [prediction, foodLogs.length])

  const mealTargets = useMemo(() => {
    const split = mealMacroSplit(
      {
        dailyCalories: todayPlan.daily_targets.calories,
        proteinGrams: todayPlan.daily_targets.protein_g,
        carbsGrams: todayPlan.daily_targets.carbs_g,
        fatGrams: todayPlan.daily_targets.fat_g,
      },
      mealSlotLegacy
    )
    return { calories: split.calories, protein: split.protein }
  }, [todayPlan.daily_targets, mealSlotLegacy])

  const results = useMemo(() => searchFoodMenu(query, 6), [query])
  const trimmedQuery = query.trim()
  const showFreeTextOption =
    trimmedQuery.length >= 2 &&
    !results.some(r => r.name.toLowerCase() === trimmedQuery.toLowerCase())

  const commitLog = useCallback(
    (entry: Omit<FoodLogEntry, 'logged_at' | 'user_declared'>) => {
      const full: FoodLogEntry = {
        ...entry,
        slot: entry.slot ?? activeSlot,
        logged_at: new Date().toISOString(),
        user_declared: true,
      }
      const nextLogs = [...foodLogs, full]
      const nextDna = learnFromLog(userMemory.food_dna ?? foodDna, full)
      const nextMemory = { ...userMemory, food_logs_today: nextLogs, food_dna: nextDna }
      const delta = full.calories - mealTargets.calories
      setCorrectionLine(
        applyLine(nextLogs, nextMemory, todayPlan, goalSnapshot, workoutDone, workoutTotal, recentMissedDays, delta)
      )
      setQuery('')
      setPendingFreeText(null)
      setPhotoPreview(null)
      onLogFood(nextLogs, nextMemory)
    },
    [foodLogs, userMemory, foodDna, activeSlot, mealTargets.calories, todayPlan, goalSnapshot, workoutDone, workoutTotal, recentMissedDays, onLogFood]
  )

  const removeLog = useCallback(
    (index: number) => {
      const nextLogs = foodLogs.filter((_, i) => i !== index)
      const nextMemory = { ...userMemory, food_logs_today: nextLogs }
      setCorrectionLine(
        applyLine(nextLogs, nextMemory, todayPlan, goalSnapshot, workoutDone, workoutTotal, recentMissedDays)
      )
      onLogFood(nextLogs, nextMemory)
    },
    [foodLogs, userMemory, todayPlan, goalSnapshot, workoutDone, workoutTotal, recentMissedDays, onLogFood]
  )

  const handlePhoto = async (file: File) => {
    setPhotoParsing(true)
    setPhotoPreview(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const b64 = result.split(',')[1] ?? ''
          resolve(b64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/food-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type || 'image/jpeg' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '辨識失敗')
      const items = json.data.items as Array<{
        name: string
        calories: number
        protein_g: number
        carbs_g: number
        fat_g: number
        confidence: string
      }>
      const total = items.reduce(
        (acc, i) => ({
          name: acc.name ? `${acc.name} + ${i.name}` : i.name,
          calories: acc.calories + i.calories,
          protein_g: acc.protein_g + i.protein_g,
          carbs_g: acc.carbs_g + i.carbs_g,
          fat_g: acc.fat_g + i.fat_g,
          confidence: i.confidence,
        }),
        { name: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, confidence: 'medium' }
      )
      setPhotoPreview(total)
    } catch (err) {
      toast.message(err instanceof Error ? err.message : '拍照失敗', {
        description: '改用搜尋或常吃？',
      })
    } finally {
      setPhotoParsing(false)
    }
  }

  const rollDice = useCallback(() => {
    setRolling(true)
    const mealSeenIds = seenIdsForMeal(dailyRolls, mealSlotLegacy)
    const previewId = dicePreview?.id
    const excludeIds =
      previewId && !mealSeenIds.includes(previewId) ? [...mealSeenIds, previewId] : mealSeenIds

    const result = rollMealSuggestion({
      meal_type: mealSlotLegacy,
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
        toast.message('暫時想不到別的')
        return
      }
      setDicePreview(result.suggestion)
    }, 350)
  }, [mealSlotLegacy, dailyRolls, dicePreview, todayPlan, profile, memory, dayIndex, coords, localDiceRolls])

  const confirmDice = useCallback(() => {
    if (!dicePreview) return
    const items = linesToDisplayItems(dicePreview.lines)
    const logEntry: FoodLogEntry = {
      id: `dice-${dicePreview.id}`,
      name: items.map(i => i.name).join(' + '),
      store: items[0]?.store,
      calories: items.reduce((s, i) => s + (i.calories ?? 0), 0),
      protein_g: items.reduce((s, i) => s + (i.protein_g ?? 0), 0),
      slot: activeSlot,
      logged_at: new Date().toISOString(),
      user_declared: true,
      source: 'dice',
    }
    const nextLogs = [...foodLogs, logEntry]
    const nextDna = learnFromLog(userMemory.food_dna ?? foodDna, logEntry)
    const nextMemory = { ...userMemory, food_logs_today: nextLogs, food_dna: nextDna }
    setCorrectionLine(
      applyLine(nextLogs, nextMemory, todayPlan, goalSnapshot, workoutDone, workoutTotal, recentMissedDays, logEntry.calories - mealTargets.calories)
    )
    onDiceApply({
      mealType: mealSlotLegacy,
      selection: suggestionToSelections(dicePreview),
      dailyRolls: recordMealRoll(appendSeenForMeal(dailyRolls, mealSlotLegacy, dicePreview.id), mealSlotLegacy),
      mealSuggest: {
        ...mealSuggest,
        [mealSlotLegacy]: {
          current_highlight: dicePreview.highlight,
          current_highlight_key: dicePreview.highlight_key,
        },
      },
      userMemory: nextMemory,
      logEntry,
    })
    setDicePreview(null)
    setLocalDiceRolls(0)
    setDiceOpen(false)
  }, [dicePreview, activeSlot, foodLogs, userMemory, foodDna, mealSlotLegacy, dailyRolls, mealSuggest, todayPlan, goalSnapshot, workoutDone, workoutTotal, recentMissedDays, mealTargets.calories, onDiceApply])

  const previewItems = dicePreview ? linesToDisplayItems(dicePreview.lines) : []

  const tabs: { id: EntryTab; label: string; icon: typeof Camera }[] = [
    { id: 'photo', label: '拍照', icon: Camera },
    { id: 'search', label: '搜尋', icon: Search },
    { id: 'frequent', label: '常吃', icon: Clock },
  ]

  return (
    <div className="px-5 pt-3 pb-5" style={{ backgroundColor: colors.bg.canvas }}>
      <ScrollFloatCard depth={0} staggerIndex={0} className="p-6 space-y-5" style={cardStyle}>
        <ZaiJian size="md" line={correctionLine} layout="whisper" />

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {FOOD_SLOTS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSlot(s.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                backgroundColor: activeSlot === s.id ? colors.accent.action : colors.bg.muted,
                color: activeSlot === s.id ? colors.bg.elevated : colors.text.secondary,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {tabs.map(t => {
            const Icon = t.icon
            const active = entryTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setEntryTab(t.id)}
                className="py-2.5 rounded-xl flex flex-col items-center gap-1"
                style={{
                  backgroundColor: active ? colors.accent.actionSoft : colors.bg.muted,
                  border: `1px solid ${active ? colors.accent.action : colors.border.subtle}`,
                }}
              >
                <Icon className="h-4 w-4" style={{ color: active ? colors.accent.action : colors.text.tertiary }} />
                <span className="text-[12px] font-medium" style={{ color: active ? colors.accent.action : colors.text.secondary }}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>

        {entryTab === 'photo' && (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handlePhoto(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              disabled={photoParsing}
              onClick={() => fileRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-2"
              style={{ borderColor: colors.border.subtle, color: colors.text.secondary }}
            >
              <Camera className="h-8 w-8" style={{ color: colors.text.tertiary }} />
              <span className="text-[14px] font-medium">{photoParsing ? '看一下…' : '拍今天吃的'}</span>
              <span className="text-[11px]" style={{ color: colors.text.tertiary }}>自動辨識 · 確認後才記</span>
            </button>
            {photoPreview && (
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: colors.bg.muted }}>
                <p className="font-medium text-[14px]" style={{ color: colors.text.primary }}>{photoPreview.name}</p>
                <p className="text-[12px]" style={{ color: colors.text.secondary }}>
                  約 {photoPreview.calories} kcal · {Math.round(photoPreview.protein_g)}g 蛋白
                  {photoPreview.confidence && ` · 信心 ${photoPreview.confidence}`}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      commitLog({
                        id: `photo-${Date.now()}`,
                        name: photoPreview.name,
                        calories: photoPreview.calories,
                        protein_g: photoPreview.protein_g,
                        carbs_g: photoPreview.carbs_g,
                        fat_g: photoPreview.fat_g,
                        confidence: photoPreview.confidence as FoodLogEntry['confidence'],
                        source: 'photo',
                      })
                    }
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
                    style={{ backgroundColor: colors.accent.action, color: colors.bg.elevated }}
                  >
                    確認記錄
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
                    style={{ backgroundColor: colors.bg.elevated, color: colors.text.secondary }}
                  >
                    重拍
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {entryTab === 'search' && (
          <div className="space-y-3">
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}` }}
            >
              <Search className="h-4 w-4 shrink-0" style={{ color: colors.text.tertiary }} />
              <input
                type="search"
                value={query}
                onChange={e => { setQuery(e.target.value); setPendingFreeText(null) }}
                placeholder="店名或菜名"
                className="flex-1 bg-transparent text-[15px] outline-none"
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
              <ul className="space-y-2">
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
                      className="w-full text-left p-3 rounded-xl"
                      style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
                    >
                      <p className="font-medium text-[14px]" style={{ color: colors.text.primary }}>{item.name}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: colors.text.secondary }}>
                        {item.store} · {item.calories} kcal
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
                className="w-full text-left p-3 rounded-xl"
                style={{ backgroundColor: colors.bg.elevated, border: `1px dashed ${colors.border.focus}` }}
              >
                <p className="font-medium text-[14px]" style={{ color: colors.text.primary }}>記錄「{trimmedQuery}」</p>
                <p className="text-[12px] mt-0.5" style={{ color: colors.text.tertiary }}>菜單沒有也 OK</p>
              </button>
            )}
            {pendingFreeText && (
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: colors.bg.muted }}>
                <p className="text-[14px] font-medium" style={{ color: colors.text.primary }}>記下「{pendingFreeText}」？</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => commitLog(estimateFreeTextMeal(pendingFreeText, mealTargets.calories, mealTargets.protein))}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
                    style={{ backgroundColor: colors.accent.action, color: colors.bg.elevated }}
                  >
                    確認
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingFreeText(null)}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
                    style={{ backgroundColor: colors.bg.elevated, color: colors.text.secondary }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {entryTab === 'frequent' && (
          <div className="flex flex-wrap gap-2">
            {frequentList.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => commitLog(frequentToLogEntry(f, activeSlot))}
                className="px-3 py-2 rounded-xl text-[13px] font-medium"
                style={{ backgroundColor: colors.bg.muted, color: colors.text.primary, border: `1px solid ${colors.border.subtle}` }}
              >
                {f.name}
                {f.count > 0 && (
                  <span className="text-[10px] ml-1" style={{ color: colors.text.tertiary }}>×{f.count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {foodLogs.length > 0 && (
          <div>
            <p className="text-[11px] font-medium mb-2" style={{ color: colors.text.tertiary }}>今天</p>
            <ul className="space-y-1">
              {foodLogs.map((log, i) => (
                <li
                  key={`${log.id}-${i}`}
                  className="flex items-center gap-2 text-[13px] px-2 py-1.5 rounded-lg"
                  style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
                >
                  <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bg.elevated }}>
                    {log.slot ? slotLabel(log.slot) : '—'}
                  </span>
                  <span className="flex-1 truncate">{log.name}</span>
                  <button type="button" onClick={() => removeLog(i)} aria-label="刪除">
                    <X className="h-3.5 w-3.5" style={{ color: colors.text.tertiary }} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => { setDiceOpen(!diceOpen); if (diceOpen) { setDicePreview(null); setLocalDiceRolls(0) } }}
          className="text-[12px] font-medium flex items-center gap-1"
          style={{ color: colors.text.tertiary }}
        >
          <Dices className="h-3.5 w-3.5" />
          不知道吃什麼？交給我
        </button>

        <ExpandPanel open={diceOpen} className="space-y-3">
          {!dicePreview ? (
            <button
              type="button"
              disabled={rolling}
              onClick={rollDice}
              className="w-full py-2.5 rounded-xl text-[13px] font-medium"
              style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
            >
              {rolling ? '想一下…' : '骰一個'}
            </button>
          ) : (
            <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: colors.bg.muted }}>
              {previewItems.map((item, i) => (
                <p key={i} className="text-[13px]" style={{ color: colors.text.primary }}>{item.name}</p>
              ))}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={confirmDice} className="flex-1 py-2 rounded-xl text-[12px] font-medium" style={{ backgroundColor: colors.accent.action, color: colors.bg.elevated }}>
                  就這個
                </button>
                <button type="button" disabled={rolling} onClick={rollDice} className="flex-1 py-2 rounded-xl text-[12px] font-medium flex items-center justify-center gap-1" style={{ backgroundColor: colors.bg.elevated, color: colors.text.secondary }}>
                  <RefreshCw className={`h-3 w-3 ${rolling ? 'animate-spin' : ''}`} /> 再骰
                </button>
              </div>
            </div>
          )}
        </ExpandPanel>
      </ScrollFloatCard>
    </div>
  )
}
