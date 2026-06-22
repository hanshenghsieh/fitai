'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, Loader2, RefreshCw, Camera, Trash2 } from 'lucide-react'
import { format, subDays, parseISO } from 'date-fns'
import { searchFoodMenu } from '@/lib/food-search'
import { estimateFreeTextMeal } from '@/lib/food-estimate'
import {
  fileToDataUrl,
  isLowConfidence,
  lookupVerifiedFood,
  parseFoodPhotoDataUrl,
} from '@/lib/food-capture'
import { buildUserBanks } from '@/lib/banks/build-banks'
import { formatPostureLine } from '@/lib/copy/zaijian'
import { getCorrectionMessage } from '@/lib/engines/correction-engine'
import { buildAdherenceState, adherenceToTrustEvent } from '@/lib/engines/adherence-engine'
import { mergeBankIntoAdherence } from '@/lib/engines/calorie-bank-engine'
import {
  avgDailyKcalFromLogs,
  computeTodayMealState,
} from '@/lib/engines/next-meal-engine'
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
import { preloadDiceMenuBulk, isDiceMenuBulkReady } from '@/lib/dice-menu-pool'
import { storesInText } from '@/lib/dice-store-names'
import { linesToDisplayItems } from '@/lib/meal-suggest'
import { formatEatOutDiceLabel, deserializeCustomCombo, selectedToDisplayItems } from '@/lib/eat-out-builder'
import { eatOutMenu, type ConvenienceItem } from '@/lib/convenience-store-menu'
import DiceMealPreview from '@/components/dashboard/DiceMealPreview'
import TodayFoodMore from '@/components/dashboard/today/TodayFoodMore'
import PhotoLogSheet, { type PhotoLogDraft } from '@/components/dashboard/today/PhotoLogSheet'
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
import type { DayPlan, UserProfile } from '@/types'
import FoodPhotoThumb from '@/components/dashboard/today/FoodPhotoThumb'
import { mealMacroSplit } from '@/lib/goal-calculator'
import { currentMealSlotForSchedule, type WorkSchedule } from '@/lib/human-mode'
import { TODAY } from '@/lib/today-design'
import { toast } from 'sonner'
import { isNearDailyTarget, nearTargetRollMessage } from '@/lib/light-snack-suggest'

interface GoalSnapshot {
  daily_deficit?: number
  total_deficit_kcal?: number
  weeks_remaining?: number
}

function allItemNamesFromLogs(logs: FoodLogEntry[]): string[] {
  return [...new Set(logs.flatMap(l => l.name.split(/\s*\+\s*/).map(s => s.trim()).filter(Boolean)))]
}

function logToDisplayItems(log: FoodLogEntry): ConvenienceItem[] {
  const names = log.name.split(/\s*\+\s*/).map(s => s.trim()).filter(Boolean)
  if (!names.length) return []
  const store = log.store ?? '已記錄'
  if (names.length === 1) {
    return [
      {
        id: `${log.id}-0`,
        name: names[0]!,
        store,
        source: 'convenience',
        category: 'lunch',
        role: 'main',
        portionable: false,
        tags: [],
        calories: log.calories,
        protein_g: log.protein_g,
        carbs_g: log.carbs_g ?? 0,
        fat_g: log.fat_g ?? 0,
        price: 0,
        photo_url: '',
        description: '',
      },
    ]
  }
  const perCal = Math.round(log.calories / names.length)
  const perPro = Math.round(log.protein_g / names.length)
  return names.map((name, i) => ({
    id: `${log.id}-${i}`,
    name,
    store,
    source: 'convenience' as const,
    category: 'lunch' as const,
    role: 'main' as const,
    portionable: false,
    tags: [],
    calories: perCal,
    protein_g: perPro,
    carbs_g: 0,
    fat_g: 0,
    price: 0,
    photo_url: '',
    description: '',
  }))
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

function mealTypeForFoodSlot(slot: FoodSlot, schedule: WorkSchedule): MealType {
  if (slot === 'meal1') return 'breakfast'
  if (slot === 'meal2') return 'lunch'
  if (slot === 'meal3') return 'dinner'
  return currentMealSlotForSchedule(schedule) as MealType
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
  onDelete,
}: {
  log: FoodLogEntry
  onNameSubmit: (name: string) => void
  onDelete?: () => void
}) {
  const [nameDraft, setNameDraft] = useState('')

  return (
    <div className="flex gap-4 w-full">
      {log.photo_data_url && (
        <FoodPhotoThumb photo_url={log.photo_data_url} userUploadedPhoto={log.photo_data_url} size={80} radius={20} />
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[17px] leading-snug flex-1 min-w-0" style={{ color: TODAY.text, fontWeight: 500 }}>
            {log.name}
          </p>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 -mr-1 shrink-0 rounded-full active:opacity-70"
              aria-label="移除紀錄"
            >
              <Trash2 className="h-4 w-4" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.textSecondary }} />
            </button>
          )}
        </div>

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

function LogTextRow({ log, onDelete }: { log: FoodLogEntry; onDelete?: () => void }) {
  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[17px] leading-snug flex-1 min-w-0" style={{ color: TODAY.text, fontWeight: 500 }}>
          {log.name}
        </p>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 -mr-1 shrink-0 rounded-full active:opacity-70"
            aria-label="移除紀錄"
          >
            <Trash2 className="h-4 w-4" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.textSecondary }} />
          </button>
        )}
      </div>
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
  const coords = useGeolocation(userMemory.eat_out_prefs?.work_location)
  const memory = memoryFromCheckinMeta({ user_memory: userMemory })

  const foodLogs = userMemory.food_logs_today ?? []

  const [activeSlot, setActiveSlot] = useState<FoodSlot>(() =>
    defaultFoodSlot(getTaipeiHour(), mealHoursFromLogs(recentFoodLogs))
  )
  const mealSlotLegacy = useMemo(
    () => mealTypeForFoodSlot(activeSlot, userMemory.work_schedule ?? 'standard'),
    [activeSlot, userMemory.work_schedule]
  )
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

  const dayState = useMemo(() => {
    const todayStr = getNutritionDayKey()
    const dayKeys7 = Array.from({ length: 7 }, (_, i) =>
      format(subDays(parseISO(todayStr), i), 'yyyy-MM-dd')
    )
    const allLogs = [...recentFoodLogs, ...foodLogs]
    const maintenance =
      (goalSnapshot as { tdee?: number } | undefined)?.tdee ??
      todayPlan.daily_targets.calories + (goalSnapshot?.daily_deficit ?? 0)
    return computeTodayMealState({
      todayFoodLogs: foodLogs,
      normalTargetKcal: todayPlan.daily_targets.calories,
      internalTargetKcal: calorieBank?.internal_target_kcal,
      proteinTargetG: todayPlan.daily_targets.protein_g,
      calorieBank,
      mealSlot: mealSlotLegacy,
      hourOfDay: getTaipeiHour(),
      maintenanceKcal: maintenance,
      avg7DayKcal: avgDailyKcalFromLogs(allLogs, dayKeys7),
      weightPlateauDays: adherenceState.events.includes('plateau') ? 15 : 0,
      adherencePct: foodLogs.length > 0 ? Math.min(100, 80 + foodLogs.length * 3) : 70,
      sleepDebt: adherenceState.events.includes('sleep_debt'),
    })
  }, [
    foodLogs,
    recentFoodLogs,
    todayPlan.daily_targets,
    calorieBank,
    mealSlotLegacy,
    goalSnapshot,
    adherenceState.events,
  ])

  const [rolling, setRolling] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [repeating, setRepeating] = useState(false)
  const rollingRef = useRef(false)
  const confirmingRef = useRef(false)
  const loggingRef = useRef(false)
  const initialRollDone = useRef(false)
  const lastPostureLineRef = useRef('')
  const photoPreviewUrlRef = useRef<string | null>(null)
  const [dicePreviewByMeal, setDicePreviewByMeal] = useState<Partial<Record<MealType, MealSuggestion>>>({})
  const dicePreview = dicePreviewByMeal[mealSlotLegacy] ?? null
  const [localDiceRolls, setLocalDiceRolls] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoDraft, setPhotoDraft] = useState<PhotoLogDraft | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const foodLogsRef = useRef(foodLogs)
  foodLogsRef.current = foodLogs
  const dayStateRef = useRef(dayState)
  dayStateRef.current = dayState

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

  const slotLoggedItems = useMemo(
    () => (lastSlotLog ? logToDisplayItems(lastSlotLog) : []),
    [lastSlotLog]
  )

  const slotContentFlags = useMemo(() => {
    const flags: Partial<Record<FoodSlot, boolean>> = {}
    const schedule = userMemory.work_schedule ?? 'standard'
    for (const s of FOOD_SLOTS) {
      if (s.id === 'other') continue
      const mt = mealTypeForFoodSlot(s.id, schedule)
      flags[s.id] =
        (customEatOut[mt]?.length ?? 0) > 0 ||
        foodLogs.some(l => (l.slot ?? 'meal2') === s.id)
    }
    return flags
  }, [customEatOut, foodLogs, userMemory.work_schedule])

  const slotSelectedItems = useMemo(() => {
    const custom = customEatOut[mealSlotLegacy]
    if (!custom?.length) return []
    return selectedToDisplayItems(deserializeCustomCombo(custom, eatOutMenu))
  }, [customEatOut, mealSlotLegacy])

  const slotMealSuggest = mealSuggest[mealSlotLegacy]

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
      let line: string
      if (logs.length === 0) {
        line = formatPostureLine(prediction ?? getFoodMemoryGreeting())
      } else {
        line = formatPostureLine(
          buildAdherenceContext(
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
          ).line
        )
      }
      if (line !== lastPostureLineRef.current) {
        lastPostureLineRef.current = line
        onPostureLine?.(line)
      }
    },
    [prediction, todayPlan, goalSnapshot, workoutDone, workoutTotal, recentMissedDays, recentFoodLogs, onPostureLine, calorieBank]
  )

  const schedulePostureLine = useCallback(
    (logs: FoodLogEntry[], memory: UserMemoryMeta, lastDelta = 0) => {
      const run = () => updatePostureLine(logs, memory, lastDelta)
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(run, { timeout: 120 })
      } else {
        queueMicrotask(run)
      }
    },
    [updatePostureLine]
  )

  useEffect(() => {
    if (!dicePreview) {
      confirmingRef.current = false
      setConfirming(false)
    }
  }, [dicePreview])

  useEffect(() => {
    updatePostureLine(foodLogs, userMemory)
  }, [foodLogs, userMemory, updatePostureLine])

  const mealTargets = useMemo(() => {
    const dailyCalories = dayState.todayTarget
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
  }, [todayPlan.daily_targets, mealSlotLegacy, dayState.todayTarget])

  const results = useMemo(() => searchFoodMenu(query, 6), [query])

  const patchLog = useCallback(
    (logId: string, patch: Partial<FoodLogEntry>) => {
      if (loggingRef.current) return
      loggingRef.current = true
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
      onLogFood(nextLogs, nextMemory)
      if (delta !== 0) schedulePostureLine(nextLogs, nextMemory, delta)
      queueMicrotask(() => {
        loggingRef.current = false
      })
    },
    [userMemory, foodDna, onLogFood, schedulePostureLine]
  )

  const commitLog = useCallback(
    (entry: Omit<FoodLogEntry, 'logged_at' | 'user_declared'>) => {
      if (loggingRef.current) return
      loggingRef.current = true
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
      setQuery('')
      setMoreOpen(false)
      onLogFood(nextLogs, nextMemory)
      schedulePostureLine(nextLogs, nextMemory, full.calories - mealTargets.calories)
      queueMicrotask(() => {
        loggingRef.current = false
      })
    },
    [foodLogs, userMemory, foodDna, activeSlot, mealTargets.calories, schedulePostureLine, onLogFood]
  )

  const removeLogById = useCallback(
    (logId: string) => {
      const prevLogs = foodLogs
      const prevMemory = userMemory
      const nextLogs = foodLogs.filter(l => l.id !== logId)
      const nextMemory = { ...userMemory, food_logs_today: nextLogs }
      onLogFood(nextLogs, nextMemory)
      schedulePostureLine(nextLogs, nextMemory)
      toast('已移除這筆紀錄', {
        duration: 5000,
        action: {
          label: '復原',
          onClick: () => {
            onLogFood(prevLogs, prevMemory)
            schedulePostureLine(prevLogs, prevMemory)
          },
        },
      })
    },
    [foodLogs, userMemory, schedulePostureLine, onLogFood]
  )

  const requestDeleteLog = useCallback((logId: string) => {
    setDeleteConfirmId(logId)
  }, [])

  const confirmDeleteLog = useCallback(() => {
    if (!deleteConfirmId) return
    removeLogById(deleteConfirmId)
    setDeleteConfirmId(null)
  }, [deleteConfirmId, removeLogById])

  const parsePhotoDraft = useCallback(
    async (file: File, previewUrl: string, dataUrl: string) => {
      setPhotoDraft({
        file,
        previewUrl,
        dataUrl,
        name: '',
        calories: 0,
        protein_g: 0,
        loading: true,
      })
      try {
        const parsed = await parseFoodPhotoDataUrl(dataUrl, file.type || 'image/jpeg')
        const dna = userMemory.food_dna ?? foodDna
        const verified = lookupVerifiedFood(parsed.name, dna)
        if (verified) {
          setPhotoDraft(prev =>
            prev
              ? {
                  ...prev,
                  name: verified.name,
                  calories: verified.calories,
                  protein_g: verified.protein_g,
                  loading: false,
                }
              : prev
          )
          return
        }
        if (isLowConfidence(parsed.confidence_pct)) {
          setPhotoDraft(prev =>
            prev
              ? {
                  ...prev,
                  name: parsed.name || '',
                  calories: parsed.calories || 0,
                  protein_g: parsed.protein_g || 0,
                  loading: false,
                }
              : prev
          )
          return
        }
        setPhotoDraft(prev =>
          prev
            ? {
                ...prev,
                name: parsed.name,
                calories: parsed.calories,
                protein_g: parsed.protein_g,
                loading: false,
              }
            : prev
        )
      } catch {
        setPhotoDraft(prev =>
          prev ? { ...prev, name: '', calories: 0, protein_g: 0, loading: false } : prev
        )
      }
    },
    [userMemory.food_dna, foodDna]
  )

  const handlePhotoPick = useCallback(
    (file: File) => {
      if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current)
      const previewUrl = URL.createObjectURL(file)
      photoPreviewUrlRef.current = previewUrl
      setPhotoOpen(true)
      void fileToDataUrl(file).then(dataUrl => parsePhotoDraft(file, previewUrl, dataUrl))
    },
    [parsePhotoDraft]
  )

  const closePhotoSheet = useCallback(() => {
    setPhotoOpen(false)
    setPhotoDraft(null)
    setPhotoSaving(false)
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current)
      photoPreviewUrlRef.current = null
    }
  }, [])

  const savePhotoDraft = useCallback(() => {
    if (!photoDraft || photoSaving || photoDraft.loading) return
    setPhotoSaving(true)
    const dataUrl = photoDraft.dataUrl
    if (!dataUrl) {
      void fileToDataUrl(photoDraft.file).then(url => {
        commitLog({
          id: `photo-${Date.now()}`,
          name: photoDraft.name.trim() || '未知食物',
          calories: photoDraft.calories,
          protein_g: photoDraft.protein_g,
          source: 'photo',
          photo_data_url: url,
          capture_status: 'resolved',
        })
        closePhotoSheet()
      })
      return
    }
    commitLog({
      id: `photo-${Date.now()}`,
      name: photoDraft.name.trim() || '未知食物',
      calories: photoDraft.calories,
      protein_g: photoDraft.protein_g,
      source: 'photo',
      photo_data_url: dataUrl,
      capture_status: 'resolved',
    })
    closePhotoSheet()
  }, [photoDraft, photoSaving, commitLog, closePhotoSheet])

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
    if (!dayStateRef.current.allowDiceAndSuggest || rollingRef.current) return
    rollingRef.current = true
    setRolling(true)

    const slot = mealSlotLegacy
    const session = loadDiceSession(slot)
    const preview = dicePreviewByMeal[slot] ?? null

    const runRoll = () => {
      try {
        const excludeIds = [...new Set([
          ...seenIdsForMeal(dailyRolls, slot),
          ...(dailyRolls.seen_suggestion_ids ?? []),
          ...session.ids,
          preview?.id,
        ].filter(Boolean))]
        const previewNames = preview ? linesToDisplayItems(preview.lines).map(i => i.name) : []
        const excludeNames = [...new Set([...allItemNamesFromLogs(foodLogs), ...previewNames])]
        const loggedStores = foodLogs.flatMap(l => [
          l.store,
          ...storesInText(l.name),
        ].filter(Boolean)) as string[]
        const excludeStores = [...new Set([
          ...session.stores,
          preview?.stores[0],
          ...loggedStores,
        ].filter(Boolean))]

        const result = rollMealSuggestion({
          meal_type: slot,
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
          day_state: dayStateRef.current,
        })

        setLocalDiceRolls(n => n + 1)
        if (!result.suggestion) {
          const ds = dayStateRef.current
          if (isNearDailyTarget(ds) || ds.skipMealRecommendation) {
            toast.message(nearTargetRollMessage(ds.remainingCalories))
          } else {
            toast.message('暫時想不到別的')
          }
          return
        }
        const store = result.suggestion.stores[0]
        const id = result.suggestion.id
        const nextStores = store ? [...new Set([...session.stores, store])].slice(-20) : session.stores
        const nextIds = [...new Set([...session.ids, id])].slice(-40)
        saveDiceSession(slot, nextStores, nextIds)
        setDicePreviewByMeal(prev => ({ ...prev, [slot]: result.suggestion! }))
      } finally {
        rollingRef.current = false
        setRolling(false)
      }
    }

    const scheduleRoll = () => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => runRoll(), { timeout: 80 })
      } else {
        requestAnimationFrame(() => runRoll())
      }
    }

    if (isDiceMenuBulkReady()) {
      scheduleRoll()
    } else {
      void preloadDiceMenuBulk().finally(scheduleRoll)
    }
  }, [mealSlotLegacy, dicePreviewByMeal, foodLogs, todayPlan, profile, memory, dayIndex, coords, localDiceRolls, dailyRolls, adherenceState, calorieBank])

  const confirmDice = useCallback(() => {
    if (!dicePreview || confirmingRef.current) return
    confirmingRef.current = true
    setConfirming(true)
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
    setDicePreviewByMeal(prev => {
      const next = { ...prev }
      delete next[mealSlotLegacy]
      return next
    })
    schedulePostureLine(nextLogs, nextMemory, logEntry.calories - mealTargets.calories)
  }, [dicePreview, activeSlot, foodLogs, userMemory, foodDna, mealSlotLegacy, dailyRolls, mealSuggest, mealTargets.calories, schedulePostureLine, onDiceApply])

  const previewItems = dicePreview ? linesToDisplayItems(dicePreview.lines) : []
  const displayItems =
    previewItems.length > 0
      ? previewItems
      : slotSelectedItems.length > 0
        ? slotSelectedItems
        : slotLoggedItems
  const showingConfirmedSelection = !dicePreview && slotSelectedItems.length > 0
  const showingLoggedOnly =
    !dicePreview && slotSelectedItems.length === 0 && slotLoggedItems.length > 0
  const highlightKey =
    dicePreview?.highlight_key ?? slotMealSuggest?.current_highlight_key ?? 'balanced'

  useEffect(() => {
    if (initialRollDone.current) return
    initialRollDone.current = true
    if (dayState.overTargetProtection) return
    if (customEatOut[mealSlotLegacy]?.length) return
    if (dicePreviewByMeal[mealSlotLegacy]) return
    rollDice()
  }, [rollDice, dayState.overTargetProtection, mealSlotLegacy, customEatOut, dicePreviewByMeal])

  useEffect(() => {
    if (dayState.overTargetProtection) {
      setDicePreviewByMeal({})
      setRolling(false)
      rollingRef.current = false
    }
  }, [dayState.overTargetProtection])

  const formatLogTime = (loggedAt: string) => {
    try {
      const d = new Date(loggedAt)
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    } catch {
      return ''
    }
  }

  const openMore = useCallback(() => setMoreOpen(true), [])
  const closeMore = useCallback(() => setMoreOpen(false), [])
  const openPhoto = useCallback(() => setPhotoOpen(true), [])
  const handleDraftChange = useCallback(
    (patch: Partial<Pick<PhotoLogDraft, 'name' | 'calories' | 'protein_g'>>) => {
      setPhotoDraft(prev => (prev ? { ...prev, ...patch } : prev))
    },
    []
  )
  const handlePickSearch = useCallback(
    (item: { id: string; name: string; store?: string; calories: number; protein_g: number }) => {
      commitLog({
        id: item.id,
        name: item.name,
        store: item.store,
        calories: item.calories,
        protein_g: item.protein_g,
        source: 'search',
      })
    },
    [commitLog]
  )
  const handleCommitFrequent = useCallback(
    (frequentId?: string) => {
      const f = frequentList.find(x => x.id === (frequentId ?? selectedFrequentId))
      if (f) commitLog(frequentToLogEntry(f, activeSlot))
    },
    [frequentList, selectedFrequentId, activeSlot, commitLog]
  )
  const handleMorePhotoCapture = useCallback(
    (file: File) => {
      setMoreOpen(false)
      handlePhotoPick(file)
    },
    [handlePhotoPick]
  )
  const repeatLastLog = useCallback(() => {
    if (!lastSlotLog || repeating) return
    setRepeating(true)
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
    queueMicrotask(() => setRepeating(false))
  }, [lastSlotLog, repeating, commitLog, activeSlot])

  useEffect(() => {
    void preloadDiceMenuBulk()
  }, [])

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
            const hasContent = slotContentFlags[s.id]
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSlot(s.id)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-[13px] flex items-center gap-1.5"
                style={{
                  backgroundColor: active ? TODAY.pillActiveBg : TODAY.pillBg,
                  color: active ? TODAY.pillActiveText : TODAY.text,
                  fontWeight: active ? 500 : 400,
                }}
              >
                {s.label}
                {hasContent && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: active ? TODAY.pillActiveText : TODAY.mocha,
                      opacity: active ? 0.85 : 0.55,
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {rolling && !dicePreview && displayItems.length === 0 ? (
          <div className="py-14 text-center text-[14px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            想一下…
          </div>
        ) : displayItems.length > 0 ? (
          <>
            {(showingConfirmedSelection || showingLoggedOnly) && (
              <p className="text-[12px] px-0.5" style={{ color: TODAY.mocha, fontWeight: 500 }}>
                {showingConfirmedSelection ? '這餐已選' : '這餐已記錄'}
              </p>
            )}
            <DiceMealPreview
              items={displayItems}
              mealType={mealSlotLegacy}
              schedule={userMemory.work_schedule ?? 'standard'}
              lifeEvent={inferredTrustEvent}
              prefersCook={profile?.cooking_time_mins != null && profile.cooking_time_mins >= 20}
              highlightKey={highlightKey}
              highlightPriceMeta={dicePreview?.highlight_price_meta}
            />
            {showingConfirmedSelection && slotMealSuggest?.current_highlight && (
              <p className="text-[13px] px-0.5 leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                {slotMealSuggest.current_highlight}
              </p>
            )}
          </>
        ) : (
          <div className="py-10 text-center text-[14px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            點下方換一個，或從更多記錄
          </div>
        )}

        <div className="space-y-3 pt-1">
          {dicePreview && dayState.allowDiceAndSuggest && (
            <button
              type="button"
              disabled={rolling || confirming}
              onClick={confirmDice}
              className="w-full h-16 rounded-[24px] text-[18px] disabled:opacity-40"
              style={{ backgroundColor: TODAY.mocha, color: '#FFFFFF', fontWeight: 500 }}
            >
              {confirming ? '記錄中…' : '就決定是它了'}
            </button>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={rolling || !dayState.allowDiceAndSuggest}
              onClick={rollDice}
              className="flex-1 h-14 rounded-[22px] text-[14px] flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ backgroundColor: TODAY.pillBg, color: TODAY.text, fontWeight: 500 }}
            >
              <RefreshCw className={`h-[16px] w-[16px] ${rolling ? 'animate-spin' : ''}`} strokeWidth={TODAY.iconStroke} />
              {rolling ? '想一下…' : '換一個'}
            </button>
            <button
              type="button"
              onClick={openMore}
              className="flex-[1.12] h-14 rounded-[22px] text-[14px] flex items-center justify-center gap-2"
              style={{ backgroundColor: TODAY.pillBg, color: TODAY.text, fontWeight: 500 }}
            >
              <ClipboardList className="h-[16px] w-[16px]" strokeWidth={TODAY.iconStroke} />
              更多記錄
            </button>
          </div>

          <button
            type="button"
            onClick={openPhoto}
            className="w-full h-12 rounded-[20px] text-[14px] flex items-center justify-center gap-2 active:opacity-90"
            style={{ backgroundColor: TODAY.surface, color: TODAY.mocha, fontWeight: 500 }}
          >
            <Camera className="h-[16px] w-[16px]" strokeWidth={TODAY.iconStroke} />
            拍今天吃的
          </button>
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
                disabled={repeating}
                onClick={repeatLastLog}
                className="h-11 px-5 rounded-full text-[13px] disabled:opacity-40"
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
                      onDelete={() => requestDeleteLog(log.id)}
                    />
                  ) : (
                    <LogTextRow log={log} onDelete={() => requestDeleteLog(log.id)} />
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
        onClose={closeMore}
        activeSlot={activeSlot}
        query={query}
        onQueryChange={setQuery}
        searchResults={results}
        onPickSearch={handlePickSearch}
        frequentList={frequentList}
        selectedFrequentId={selectedFrequentId}
        onSelectFrequent={setSelectedFrequentId}
        onCommitFrequent={handleCommitFrequent}
        onPhotoCapture={handleMorePhotoCapture}
      />

      <PhotoLogSheet
        open={photoOpen}
        draft={photoDraft}
        onClose={closePhotoSheet}
        onPickFile={handlePhotoPick}
        onDraftChange={handleDraftChange}
        onSave={savePhotoDraft}
        onBackToCapture={() => setPhotoDraft(null)}
        saving={photoSaving}
      />

      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center px-5 pb-8"
          style={{ backgroundColor: 'rgba(47, 36, 29, 0.22)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-md p-6 space-y-5"
            style={{
              backgroundColor: TODAY.card,
              borderRadius: TODAY.radiusCard,
              boxShadow: TODAY.cardShadow,
              fontFamily: TODAY.font,
            }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[16px] leading-relaxed" style={{ color: TODAY.text, fontWeight: 500 }}>
              要移除這筆紀錄嗎？
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 h-12 rounded-[20px] text-[14px]"
                style={{ backgroundColor: TODAY.pillBg, color: TODAY.text, fontWeight: 500 }}
              >
                先留著
              </button>
              <button
                type="button"
                onClick={confirmDeleteLog}
                className="flex-1 h-12 rounded-[20px] text-[14px]"
                style={{ backgroundColor: TODAY.mocha, color: '#FFFFFF', fontWeight: 500 }}
              >
                移除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
