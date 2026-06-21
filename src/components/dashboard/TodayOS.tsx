'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, ClipboardList, Loader2 } from 'lucide-react'
import { searchFoodMenu } from '@/lib/food-search'
import { estimateFreeTextMeal } from '@/lib/food-estimate'
import {
  fileToDataUrl,
  isLowConfidence,
  lookupVerifiedFood,
  parseFoodPhotoFile,
} from '@/lib/food-capture'
import { buildUserBanks } from '@/lib/banks/build-banks'
import { formatPostureLine } from '@/lib/copy/zaijian'
import { getCorrectionMessage } from '@/lib/engines/correction-engine'
import { buildAdherenceState, adherenceToTrustEvent } from '@/lib/engines/adherence-engine'
import { mergeBankIntoAdherence } from '@/lib/engines/calorie-bank-engine'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import { getFoodMemoryGreeting, getFoodPrediction } from '@/lib/engines/food-prediction'
import type { FoodLogEntry } from '@/lib/banks/types'
import {
  displayFrequent,
  frequentToLogEntry,
  learnFromLog,
  type FoodDna,
} from '@/lib/food-memory'
import { FOOD_SLOTS, defaultFoodSlot, slotLabel, mealHoursFromLogs, type FoodSlot } from '@/lib/food-slots'
import { getTaipeiHour, nutritionDayResetLabel, getNutritionDayKey } from '@/lib/timezone'
import {
  rollMealSuggestion,
  suggestionToSelections,
  memoryFromCheckinMeta,
  type MealSuggestion,
} from '@/lib/meal-engine'
import { preloadDiceMenuBulk } from '@/lib/dice-menu-pool'
import { storesInText } from '@/lib/dice-store-names'
import { linesToDisplayItems } from '@/lib/meal-suggest'
import { formatEatOutDiceLabel } from '@/lib/eat-out-builder'
import DiceMealPreview from '@/components/dashboard/DiceMealPreview'
import TodayFoodMore from '@/components/dashboard/today/TodayFoodMore'
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
import { TODAY } from '@/lib/today-design'
import FoodPhotoThumb from '@/components/dashboard/today/FoodPhotoThumb'
import { mealMacroSplit } from '@/lib/goal-calculator'
import { currentMealSlotForSchedule, type WorkSchedule } from '@/lib/human-mode'
import type { DayPlan, UserProfile } from '@/types'

interface GoalSnapshot {
  daily_deficit?: number
  total_deficit_kcal?: number
  weeks_remaining?: number
}

function allItemNamesFromLogs(logs: FoodLogEntry[]): string[] {
  return [...new Set(logs.flatMap(l => l.name.split(/\s*\+\s*/).map(s => s.trim()).filter(Boolean)))]
}

function diceSessionKey(mealType: MealType): string {
  return `dice-session-${getNutritionDayKey(new Date())}-${mealType}`
}

function loadDiceSession(mealType: MealType): { stores: string[]; ids: string[] } {
  if (typeof window === 'undefined') return { stores: [], ids: [] }
  try {
    const raw = sessionStorage.getItem(diceSessionKey(mealType))
    if (!raw) return { stores: [], ids: [] }
    const parsed = JSON.parse(raw) as { stores?: string[]; ids?: string[] }
    return { stores: parsed.stores ?? [], ids: parsed.ids ?? [] }
  } catch {
    return { stores: [], ids: [] }
  }
}

function saveDiceSession(mealType: MealType, stores: string[], ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(diceSessionKey(mealType), JSON.stringify({ stores, ids }))
  } catch {
    /* quota / private mode */
  }
}

interface Props {
  todayPlan: DayPlan
  profile?: UserProfile | null
  goalSnapshot?: GoalSnapshot | null
  userMemory: UserMemoryMeta
  foodDna: FoodDna
  dayOfWeek: number
  recentMissedDays: number
  recentFoodLogs?: FoodLogEntry[]
  dailyRolls: DailyRollState
  mealSuggest: Partial<Record<MealType, MealSuggestState>>
  customEatOut: Partial<Record<MealType, CustomEatOutSelection[]>>
  dayIndex?: number
  workoutDone: number
  workoutTotal: number
  calorieBank?: CalorieBankRow | null
  onLogFood: (logs: FoodLogEntry[], userMemory: UserMemoryMeta) => void
  onPostureLine?: (line: string) => void
  onDiceApply: (payload: {
    mealType: MealType
    selection: CustomEatOutSelection[]
    dailyRolls: DailyRollState
    mealSuggest: Partial<Record<MealType, MealSuggestState>>
    userMemory: UserMemoryMeta
    logEntry: FoodLogEntry
  }) => void
}

function buildAdherenceContext(
  logs: FoodLogEntry[],
  memory: UserMemoryMeta,
  todayPlan: DayPlan,
  goalSnapshot: GoalSnapshot | null | undefined,
  workoutDone: number,
  workoutTotal: number,
  recentMissedDays: number,
  recentFoodLogs: FoodLogEntry[],
  lastDelta = 0,
  calorieBank?: CalorieBankRow | null
) {
  const dailyPace =
    goalSnapshot?.daily_deficit ??
    Math.max(200, Math.round((goalSnapshot?.total_deficit_kcal ?? 0) / Math.max(1, (goalSnapshot?.weeks_remaining ?? 12) * 7)))
  const todayTarget = todayPlan.daily_targets.calories
  const todayLogged = logs.reduce((s, f) => s + f.calories, 0)

  const adherence = mergeBankIntoAdherence(
    buildAdherenceState(
      {
        workSchedule: memory.work_schedule,
        todayLogs: logs,
        recentLogs: recentFoodLogs,
        todayTargetKcal: todayTarget,
        dailyPaceKcal: dailyPace,
        todayLoggedKcal: todayLogged,
        recentMissedDays,
        workoutDone,
        workoutTotal,
        daysSinceLastLog: recentMissedDays >= 1 ? recentMissedDays : undefined,
      },
      lastDelta
    ),
    calorieBank
  )
  const banks = buildUserBanks(todayPlan, goalSnapshot, logs, workoutDone, workoutTotal, adherence, calorieBank)
  const line = getCorrectionMessage({ banks, adherence, calorieBank, lastLogDeltaKcal: lastDelta })
  return { adherence, banks, line }
}

function CapturedLogRow({
  log,
  onNameSubmit,
}: {
  log: FoodLogEntry
  onNameSubmit: (name: string) => void
}) {
  const [nameDraft, setNameDraft] = useState('')

  return (
    <div className="flex gap-4 w-full">
      {log.photo_data_url && (
        <FoodPhotoThumb photo_url={log.photo_data_url} userUploadedPhoto={log.photo_data_url} size={80} radius={20} />
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-[17px] leading-snug" style={{ color: TODAY.text, fontWeight: 500 }}>
          {log.name}
        </p>

        {log.learning && (
          <p className="text-[14px] flex items-center gap-1.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            <Loader2 className="h-3 w-3 animate-spin shrink-0" strokeWidth={TODAY.iconStroke} />
            正在學習中…
          </p>
        )}

        {!log.learning && log.needs_name && (
          <div className="mt-2 space-y-2">
            <p className="text-[13px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
              沒辨識出來？它其實是：
            </p>
            <input
              type="text"
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              placeholder="例如：阿城雞腿便當"
              className="w-full px-0 py-2 text-[15px] border-b outline-none bg-transparent"
              style={{ color: TODAY.text, fontWeight: 400, borderColor: 'rgba(142, 131, 120, 0.2)' }}
            />
            <button
              type="button"
              disabled={!nameDraft.trim()}
              onClick={() => onNameSubmit(nameDraft.trim())}
              className="text-[13px] px-4 py-1.5 rounded-full disabled:opacity-40"
              style={{ backgroundColor: TODAY.mocha, color: '#FFFFFF', fontWeight: 500 }}
            >
              完成
            </button>
          </div>
        )}

        {!log.learning && !log.needs_name && log.calories > 0 && (
          <p className="text-[15px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            {log.calories} kcal · 蛋白質 {Math.round(log.protein_g)}g
          </p>
        )}

        {!log.learning && !log.needs_name && log.capture_status === 'resolved' && log.source === 'photo' && (
          <p className="text-[13px]" style={{ color: TODAY.mocha, fontWeight: 500 }}>
            已加入今天
          </p>
        )}

        {log.community_verified && (
          <p className="text-[13px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            由社群共同建立
          </p>
        )}
      </div>
    </div>
  )
}

function LogTextRow({ log }: { log: FoodLogEntry }) {
  return (
    <div className="space-y-1.5 w-full">
      <p className="text-[17px] leading-snug" style={{ color: TODAY.text, fontWeight: 500 }}>
        {log.name}
      </p>
      {log.calories > 0 && (
        <p className="text-[15px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          {log.calories} kcal · 蛋白質 {Math.round(log.protein_g)}g
        </p>
      )}
    </div>
  )
}

export default function TodayOS({
  todayPlan,
  profile,
  goalSnapshot,
  userMemory,
  foodDna,
  dayOfWeek,
  recentMissedDays,
  recentFoodLogs = [],
  dailyRolls,
  mealSuggest,
  customEatOut,
  dayIndex = 0,
  workoutDone,
  workoutTotal,
  calorieBank = null,
  onLogFood,
  onPostureLine,
  onDiceApply,
}: Props) {
  const mealSlotLegacy = currentMealSlotForSchedule(userMemory.work_schedule ?? 'standard') as MealType
  const coords = useGeolocation(userMemory.eat_out_prefs?.work_location)
  const memory = memoryFromCheckinMeta({ user_memory: userMemory })

  const foodLogs = userMemory.food_logs_today ?? []
  const adherenceState = useMemo(
    () =>
      buildAdherenceContext(
        foodLogs,
        userMemory,
        todayPlan,
        goalSnapshot,
        workoutDone,
        workoutTotal,
        recentMissedDays,
        recentFoodLogs,
        0,
        calorieBank
      ).adherence,
    [foodLogs, userMemory, todayPlan, goalSnapshot, workoutDone, workoutTotal, recentMissedDays, recentFoodLogs, calorieBank]
  )
  const inferredTrustEvent = useMemo(() => adherenceToTrustEvent(adherenceState), [adherenceState])

  const [activeSlot, setActiveSlot] = useState<FoodSlot>(() =>
    defaultFoodSlot(getTaipeiHour(), mealHoursFromLogs(recentFoodLogs))
  )
  const [moreOpen, setMoreOpen] = useState(false)
  const [query, setQuery] = useState('')
  const foodLogsRef = useRef(foodLogs)
  foodLogsRef.current = foodLogs
  const [rolling, setRolling] = useState(false)
  const [dicePreview, setDicePreview] = useState<MealSuggestion | null>(null)
  const [localDiceRolls, setLocalDiceRolls] = useState(0)
  const [seenDiceStores, setSeenDiceStores] = useState<string[]>([])
  const [seenDiceIds, setSeenDiceIds] = useState<string[]>([])
  const heroBooted = useRef(false)

  useEffect(() => {
    const session = loadDiceSession(mealSlotLegacy)
    if (session.stores.length) setSeenDiceStores(session.stores)
    if (session.ids.length) setSeenDiceIds(session.ids)
  }, [mealSlotLegacy])

  const frequentList = useMemo(() => displayFrequent(foodDna), [foodDna])
  const [selectedFrequentId, setSelectedFrequentId] = useState('')

  const slotLogs = useMemo(
    () =>
      foodLogs
        .map((log, index) => ({ log, index }))
        .filter(({ log }) => (log.slot ?? 'meal2') === activeSlot),
    [foodLogs, activeSlot]
  )

  const slotLogTotals = useMemo(
    () => slotLogs.reduce((acc, { log }) => ({ kcal: acc.kcal + log.calories, protein: acc.protein + log.protein_g }), { kcal: 0, protein: 0 }),
    [slotLogs]
  )

  const lastSlotLog = slotLogs.length > 0 ? slotLogs[slotLogs.length - 1]!.log : null

  useEffect(() => {
    if (frequentList.length === 0) {
      setSelectedFrequentId('')
      return
    }
    if (!selectedFrequentId || !frequentList.some(f => f.id === selectedFrequentId)) {
      setSelectedFrequentId(frequentList[0]!.id)
    }
  }, [frequentList, selectedFrequentId])

  const prediction = useMemo(
    () => getFoodPrediction(frequentList, dayOfWeek),
    [frequentList, dayOfWeek]
  )

  const updatePostureLine = useCallback(
    (logs: FoodLogEntry[], memory: UserMemoryMeta, lastDelta = 0) => {
      if (logs.length === 0) {
        onPostureLine?.(formatPostureLine(prediction ?? getFoodMemoryGreeting()))
        return
      }
      const { line } = buildAdherenceContext(
        logs,
        memory,
        todayPlan,
        goalSnapshot,
        workoutDone,
        workoutTotal,
        recentMissedDays,
        recentFoodLogs,
        lastDelta,
        calorieBank
      )
      onPostureLine?.(formatPostureLine(line))
    },
    [prediction, todayPlan, goalSnapshot, workoutDone, workoutTotal, recentMissedDays, recentFoodLogs, onPostureLine, calorieBank]
  )

  useEffect(() => {
    updatePostureLine(foodLogs, userMemory)
  }, [foodLogs, userMemory, updatePostureLine])

  const mealTargets = useMemo(() => {
    const dailyCalories =
      calorieBank?.internal_target_kcal && calorieBank.internal_target_kcal > 0
        ? calorieBank.internal_target_kcal
        : todayPlan.daily_targets.calories
    const split = mealMacroSplit(
      {
        dailyCalories,
        proteinGrams: todayPlan.daily_targets.protein_g,
        carbsGrams: todayPlan.daily_targets.carbs_g,
        fatGrams: todayPlan.daily_targets.fat_g,
      },
      mealSlotLegacy
    )
    return { calories: split.calories, protein: split.protein }
  }, [todayPlan.daily_targets, mealSlotLegacy, calorieBank?.internal_target_kcal])

  const results = useMemo(() => searchFoodMenu(query, 6), [query])

  const patchLog = useCallback(
    (logId: string, patch: Partial<FoodLogEntry>) => {
      const current = foodLogsRef.current
      const prev = current.find(l => l.id === logId)
      const nextLogs = current.map(l => (l.id === logId ? { ...l, ...patch } : l))
      const updated = nextLogs.find(l => l.id === logId)
      let nextDna = userMemory.food_dna ?? foodDna
      if (updated && patch.capture_status === 'resolved' && updated.name !== '未知食物') {
        nextDna = learnFromLog(nextDna, updated)
      }
      const nextMemory = { ...userMemory, food_logs_today: nextLogs, food_dna: nextDna }
      const delta = updated && prev ? updated.calories - prev.calories : 0
      if (delta !== 0) updatePostureLine(nextLogs, nextMemory, delta)
      onLogFood(nextLogs, nextMemory)
    },
    [userMemory, foodDna, onLogFood, updatePostureLine]
  )

  const commitLog = useCallback(
    (entry: Omit<FoodLogEntry, 'logged_at' | 'user_declared'>) => {
      const full: FoodLogEntry = {
        ...entry,
        slot: entry.slot ?? activeSlot,
        logged_at: new Date().toISOString(),
        user_declared: true,
      }
      const nextLogs = [...foodLogs, full]
      const nextDna = full.learning
        ? (userMemory.food_dna ?? foodDna)
        : learnFromLog(userMemory.food_dna ?? foodDna, full)
      const nextMemory = { ...userMemory, food_logs_today: nextLogs, food_dna: nextDna }
      const delta = full.calories - mealTargets.calories
      updatePostureLine(nextLogs, nextMemory, delta)
      setQuery('')
      setMoreOpen(false)
      onLogFood(nextLogs, nextMemory)
    },
    [foodLogs, userMemory, foodDna, activeSlot, mealTargets.calories, updatePostureLine, onLogFood]
  )

  const removeLog = useCallback(
    (index: number) => {
      const nextLogs = foodLogs.filter((_, i) => i !== index)
      const nextMemory = { ...userMemory, food_logs_today: nextLogs }
      updatePostureLine(nextLogs, nextMemory)
      onLogFood(nextLogs, nextMemory)
    },
    [foodLogs, userMemory, updatePostureLine, onLogFood]
  )

  const handlePhotoCapture = useCallback(
    async (file: File) => {
      const dataUrl = await fileToDataUrl(file)
      const logId = `photo-${Date.now()}`
      commitLog({
        id: logId,
        name: '未知食物',
        calories: 0,
        protein_g: 0,
        source: 'photo',
        photo_data_url: dataUrl,
        learning: true,
        capture_status: 'learning',
      })

      void (async () => {
        try {
          const parsed = await parseFoodPhotoFile(file)
          const dna = userMemory.food_dna ?? foodDna
          const verified = lookupVerifiedFood(parsed.name, dna)

          if (verified) {
            patchLog(logId, {
              name: verified.name,
              store: verified.store,
              calories: verified.calories,
              protein_g: verified.protein_g,
              carbs_g: verified.carbs_g,
              fat_g: verified.fat_g,
              learning: false,
              community_verified: true,
              capture_status: 'resolved',
            })
            return
          }

          if (isLowConfidence(parsed.confidence_pct)) {
            patchLog(logId, {
              learning: false,
              needs_name: true,
              capture_status: 'needs_name',
              ai_confidence_pct: parsed.confidence_pct,
            })
            return
          }

          patchLog(logId, {
            name: parsed.name,
            calories: parsed.calories,
            protein_g: parsed.protein_g,
            carbs_g: parsed.carbs_g,
            fat_g: parsed.fat_g,
            confidence: parsed.confidence,
            learning: false,
            capture_status: 'resolved',
            ai_confidence_pct: parsed.confidence_pct,
          })
        } catch {
          patchLog(logId, {
            learning: false,
            needs_name: true,
            capture_status: 'needs_name',
          })
        }
      })()
    },
    [commitLog, patchLog, userMemory.food_dna, foodDna]
  )

  const handleCaptureName = useCallback(
    (logId: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const dna = userMemory.food_dna ?? foodDna
      const verified = lookupVerifiedFood(trimmed, dna)
      if (verified) {
        patchLog(logId, {
          name: verified.name,
          store: verified.store,
          calories: verified.calories,
          protein_g: verified.protein_g,
          carbs_g: verified.carbs_g,
          fat_g: verified.fat_g,
          needs_name: false,
          community_verified: true,
          capture_status: 'resolved',
        })
        return
      }
      const est = estimateFreeTextMeal(trimmed, mealTargets.calories, mealTargets.protein)
      patchLog(logId, {
        name: est.name,
        calories: est.calories,
        protein_g: est.protein_g,
        needs_name: false,
        capture_status: 'resolved',
      })
    },
    [patchLog, userMemory.food_dna, foodDna, mealTargets.calories, mealTargets.protein]
  )

  const rollDice = useCallback(() => {
    setRolling(true)
    void preloadDiceMenuBulk().then(() => {
      // 預覽骰子只排除「上一個預覽」，不套用今日已確認的 seen_ids（避免選項過少）
      const excludeIds = [...new Set([
        ...seenIdsForMeal(dailyRolls, mealSlotLegacy),
        ...(dailyRolls.seen_suggestion_ids ?? []),
        ...seenDiceIds,
        dicePreview?.id,
      ].filter(Boolean))]
      const previewNames = dicePreview
        ? linesToDisplayItems(dicePreview.lines).map(i => i.name)
        : []
      const excludeNames = [...new Set([...allItemNamesFromLogs(foodLogs), ...previewNames])]
      const loggedStores = foodLogs.flatMap(l => [
        l.store,
        ...storesInText(l.name),
      ].filter(Boolean)) as string[]
      const excludeStores = [...new Set([
        ...seenDiceStores,
        dicePreview?.stores[0],
        ...loggedStores,
      ].filter(Boolean))]

      const result = rollMealSuggestion({
        meal_type: mealSlotLegacy,
        daily_targets: todayPlan.daily_targets,
        profile,
        memory,
        day_index: dayIndex,
        seen_ids: excludeIds,
        exclude_names: excludeNames,
        exclude_stores: excludeStores,
        rolls_used: localDiceRolls,
        user_lat: coords?.lat,
        user_lng: coords?.lng,
        adherence: adherenceState,
        calorie_bank: calorieBank,
      })

      setTimeout(() => {
        setRolling(false)
        setLocalDiceRolls(n => n + 1)
        if (!result.suggestion) {
          toast.message('暫時想不到別的')
          return
        }
        const store = result.suggestion.stores[0]
        const id = result.suggestion.id
        const nextStores = store
          ? [...new Set([...seenDiceStores, store])].slice(-20)
          : seenDiceStores
        const nextIds = [...new Set([...seenDiceIds, id])].slice(-40)
        setSeenDiceStores(nextStores)
        setSeenDiceIds(nextIds)
        saveDiceSession(mealSlotLegacy, nextStores, nextIds)
        setDicePreview(result.suggestion)
      }, 350)
    })
  }, [mealSlotLegacy, dicePreview, foodLogs, todayPlan, profile, memory, dayIndex, coords, localDiceRolls, seenDiceStores, seenDiceIds, dailyRolls, adherenceState, calorieBank])

  const confirmDice = useCallback(() => {
    if (!dicePreview) return
    const items = linesToDisplayItems(dicePreview.lines)
    const logEntry: FoodLogEntry = {
      id: `dice-${dicePreview.id}`,
      name: items.map(i => formatEatOutDiceLabel(i)).join(' + '),
      store: dicePreview.stores[0] ?? (items.length === 1 ? items[0]?.store : undefined),
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
    updatePostureLine(nextLogs, nextMemory, logEntry.calories - mealTargets.calories)
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
    setTimeout(() => rollDice(), 100)
  }, [dicePreview, activeSlot, foodLogs, userMemory, foodDna, mealSlotLegacy, dailyRolls, mealSuggest, mealTargets.calories, updatePostureLine, onDiceApply, rollDice])

  const previewItems = dicePreview ? linesToDisplayItems(dicePreview.lines) : []

  useEffect(() => {
    if (heroBooted.current) return
    heroBooted.current = true
    void preloadDiceMenuBulk().then(() => rollDice())
  }, [rollDice])

  const formatLogTime = (loggedAt: string) => {
    try {
      const d = new Date(loggedAt)
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    } catch {
      return ''
    }
  }

  return (
    <div className="px-5 pb-6 space-y-8 max-w-[640px] mx-auto" style={{ fontFamily: TODAY.font }}>
      <div
        className="p-6 space-y-5"
        style={{
          backgroundColor: TODAY.card,
          borderRadius: TODAY.radiusCard,
          boxShadow: TODAY.cardShadow,
        }}
      >
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
          {FOOD_SLOTS.filter(s => s.id !== 'other').map(s => {
            const active = activeSlot === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSlot(s.id)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-[13px]"
                style={{
                  backgroundColor: active ? TODAY.pillActiveBg : TODAY.pillBg,
                  color: active ? TODAY.pillActiveText : TODAY.text,
                  fontWeight: active ? 500 : 400,
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        {rolling && !dicePreview ? (
          <div className="py-14 text-center text-[14px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            想一下…
          </div>
        ) : dicePreview ? (
          <DiceMealPreview
            items={previewItems}
            mealType={mealSlotLegacy}
            schedule={userMemory.work_schedule ?? 'standard'}
            lifeEvent={inferredTrustEvent}
            prefersCook={profile?.cooking_time_mins != null && profile.cooking_time_mins >= 20}
            highlightKey={dicePreview.highlight_key}
            highlightPriceMeta={dicePreview.highlight_price_meta}
          />
        ) : (
          <div className="py-10 text-center text-[14px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            點下方換一個，或從更多記錄
          </div>
        )}

        <div className="space-y-3 pt-1">
          <button
            type="button"
            disabled={!dicePreview || rolling}
            onClick={confirmDice}
            className="w-full h-16 rounded-[24px] text-[18px] disabled:opacity-40"
            style={{ backgroundColor: TODAY.mocha, color: '#FFFFFF', fontWeight: 500 }}
          >
            吃了
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={rolling}
              onClick={rollDice}
              className="flex-1 h-14 rounded-[22px] text-[14px] flex items-center justify-center gap-2"
              style={{ backgroundColor: TODAY.pillBg, color: TODAY.text, fontWeight: 500 }}
            >
              <RefreshCw className={`h-[16px] w-[16px] ${rolling ? 'animate-spin' : ''}`} strokeWidth={TODAY.iconStroke} />
              換一個
            </button>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex-[1.12] h-14 rounded-[22px] text-[14px] flex items-center justify-center gap-2"
              style={{ backgroundColor: TODAY.pillBg, color: TODAY.text, fontWeight: 500 }}
            >
              <ClipboardList className="h-[16px] w-[16px]" strokeWidth={TODAY.iconStroke} />
              更多記錄
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {slotLogs.length > 0 ? (
          <>
            <div className="flex items-baseline justify-between gap-3 px-0.5">
              <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 500 }}>
                {slotLabel(activeSlot)}已記錄
                {slotLogTotals.kcal > 0 && (
                  <span style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                    {' '}· {slotLogTotals.kcal} kcal
                  </span>
                )}
              </p>
              {lastSlotLog?.logged_at && (
                <p className="text-[11px] shrink-0" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                  {formatLogTime(lastSlotLog.logged_at)}
                </p>
              )}
            </div>

            {lastSlotLog && (
              <button
                type="button"
                onClick={() => {
                  commitLog({
                    id: `repeat-${Date.now()}`,
                    name: lastSlotLog.name,
                    store: lastSlotLog.store,
                    calories: lastSlotLog.calories,
                    protein_g: lastSlotLog.protein_g,
                    carbs_g: lastSlotLog.carbs_g,
                    fat_g: lastSlotLog.fat_g,
                    confidence: lastSlotLog.confidence,
                    slot: activeSlot,
                    source: 'frequent',
                  })
                }}
                className="h-11 px-5 rounded-full text-[13px]"
                style={{ backgroundColor: TODAY.pillBg, color: TODAY.mocha, fontWeight: 500 }}
              >
                再記一次…
              </button>
            )}

            <ul className="space-y-7 pt-2">
              {slotLogs.map(({ log, index }) => (
                <li key={`${log.id}-${index}`} className="px-0.5">
                  {log.source === 'photo' || log.photo_data_url ? (
                    <CapturedLogRow
                      log={log}
                      onNameSubmit={name => handleCaptureName(log.id, name)}
                    />
                  ) : (
                    <LogTextRow log={log} />
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[13px] text-center py-6" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            這餐還沒記錄
          </p>
        )}

        <p className="text-center text-[11px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          {nutritionDayResetLabel()}
        </p>
      </div>

      <TodayFoodMore
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        activeSlot={activeSlot}
        query={query}
        onQueryChange={setQuery}
        searchResults={results}
        onPickSearch={item =>
          commitLog({
            id: item.id,
            name: item.name,
            store: item.store,
            calories: item.calories,
            protein_g: item.protein_g,
            source: 'search',
          })
        }
        frequentList={frequentList}
        selectedFrequentId={selectedFrequentId}
        onSelectFrequent={setSelectedFrequentId}
        onCommitFrequent={(frequentId) => {
          const f = frequentList.find(x => x.id === (frequentId ?? selectedFrequentId))
          if (f) commitLog(frequentToLogEntry(f, activeSlot))
        }}
        onPhotoCapture={handlePhotoCapture}
      />
    </div>
  )
}
