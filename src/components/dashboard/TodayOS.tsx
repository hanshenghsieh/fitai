'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Camera, ClipboardList, RefreshCw } from 'lucide-react'
import { format, subDays, parseISO } from 'date-fns'
import { searchFoodMenu } from '@/lib/food-search'
import {
  createUnknownFreeTextMeal,
  resolveOrEstimateFreeTextMeal,
} from '@/lib/food-estimate'
import { enrichFoodLog, sumItemMacros } from '@/lib/food-log-macros'
import {
  fileToDataUrl,
  prepareFoodPhotoFile,
  uploadFoodPhotoFile,
  fetchPhotoMatch,
} from '@/lib/food-capture'
import { storesInText } from '@/lib/dice-store-names'
import { isNativeIOS } from '@/lib/capacitor-native'
import { isNutritionAccuracyV1 } from '@/lib/nutrition-accuracy-flag'
import {
  buildPhotoLogCommitFromAccuracy,
  createPhotoAccuracyState,
  photoAccuracyStateFromV2,
  photoAccuracyDisplayMacros,
  photoAccuracyReadyForLog,
  updatePhotoAccuracyState,
} from '@/lib/nutrition/photo-log-accuracy'
import { resolvePhotoOfficialRecord, updatePhotoV2State } from '@/lib/nutrition/search-v2/photo-pipeline'
import type { UserConfirmationAnswers } from '@/lib/nutrition/types'
import { buildUserBanks } from '@/lib/banks/build-banks'
import { formatPostureLine } from '@/lib/copy/zaijian'
import { getCorrectionMessage } from '@/lib/engines/correction-engine'
import { buildAdherenceState } from '@/lib/engines/adherence-engine'
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
import {
  defaultFoodSlot,
  mealHoursFromLogs,
  logMatchesFoodSlot,
  normalizeFoodLogSlot,
  customEatOutMealTypeForSlot,
  type FoodSlot,
} from '@/lib/food-slots'
import { getTaipeiHour, getNutritionDayKey } from '@/lib/timezone'
import {
  rollMealSuggestion,
  suggestionToSelections,
  memoryFromCheckinMeta,
  type MealSuggestion,
} from '@/lib/meal-engine'
import { USE_RECOMMENDATION_V2 } from '@/lib/recommendation/v2/engine'
import type { RecommendationQueueState } from '@/lib/recommendation/v2/types'
import { preloadDiceMenuBulk, isDiceMenuBulkReady, getDiceMenuSource } from '@/lib/dice-menu-pool'
import {
  clearTodaySheetParams,
  dispatchOpenPhotoSheet,
  todaySheetFromSearch,
  TODAY_OPEN_PHOTO_EVENT,
  TODAY_OPEN_TEXT_LOG_EVENT,
} from '@/lib/today-actions'
import { linesToDisplayItems } from '@/lib/meal-suggest'
import { formatEatOutDiceLabel, deserializeCustomCombo, selectedToDisplayItems } from '@/lib/eat-out-builder'
import DiceMealPreview, { type MealPreviewItem } from '@/components/dashboard/DiceMealPreview'
import TodayFoodMore from '@/components/dashboard/today/TodayFoodMore'
import PhotoLogSheet, { type PhotoLogDraft } from '@/components/dashboard/today/PhotoLogSheet'
import ManualPhotoCorrectionSheet from '@/components/dashboard/today/ManualPhotoCorrectionSheet'
import {
  buildFoodLogFromManualPhotoCorrection,
  buildPhotoAiMeta,
  type ManualPhotoCorrectionResult,
} from '@/lib/nutrition/photo-manual-correction'
import { buildPhotoVisualParse } from '@/lib/nutrition/photo-visual-parse'
import { isNutritionPendingConfirmation } from '@/lib/nutrition/food-log-display'
import { enqueueUnknownFromLog } from '@/lib/nutrition/unknown-food-flow'
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
import { mealMacroSplit } from '@/lib/goal-calculator'
import { currentMealSlotForSchedule, type WorkSchedule } from '@/lib/human-mode'
import { TODAY } from '@/lib/today-design'
import BBCard from '@/components/ui/BBCard'
import { toast } from 'sonner'
import { isNearDailyTarget, nearTargetRollMessage } from '@/lib/light-snack-suggest'

interface GoalSnapshot {
  daily_deficit?: number
  total_deficit_kcal?: number
  weeks_remaining?: number
}


function parseDiceLogSegment(segment: string): { store?: string; name: string } {
  const trimmed = segment.trim()
  const sep = trimmed.indexOf(' · ')
  if (sep === -1) return { name: trimmed }
  return { store: trimmed.slice(0, sep).trim(), name: trimmed.slice(sep + 3).trim() }
}

function lookupMenuItemForLog(name: string, store?: string) {
  const menu = getDiceMenuSource()
  const byName = menu.filter(i => i.name === name)
  if (store && store !== '已記錄') {
    const hit = byName.find(i => i.store === store)
    if (hit) return hit
  }
  return byName[0]
}

function logToDisplayItems(log: FoodLogEntry): MealPreviewItem[] {
  const names = log.name.split(/\s*\+\s*/).map(s => s.trim()).filter(Boolean)
  if (!names.length) return []
  const store = log.store ?? '已記錄'
  const unknown = isNutritionPendingConfirmation(log)
  if (names.length === 1) {
    const parsed = parseDiceLogSegment(names[0]!)
    const menuHit = lookupMenuItemForLog(parsed.name, parsed.store ?? store)
    if (menuHit && !unknown) {
      return [
        {
          ...menuHit,
          id: `${log.id}-0`,
          calories: menuHit.calories,
          protein_g: menuHit.protein_g,
          nutrition_status: log.nutrition_status,
        },
      ]
    }
    return [
      {
        id: `${log.id}-0`,
        name: parsed.name,
        store: parsed.store ?? store,
        source: 'convenience',
        category: 'lunch',
        role: 'main',
        portionable: false,
        tags: [],
        calories: unknown ? null : log.calories,
        protein_g: unknown ? null : log.protein_g,
        carbs_g: log.carbs_g ?? 0,
        fat_g: log.fat_g ?? 0,
        price: 0,
        photo_url: '',
        description: '',
        nutrition_status: log.nutrition_status,
      },
    ]
  }
  if (unknown || log.calories == null || log.protein_g == null) {
    return names.map((segment, i) => {
      const parsed = parseDiceLogSegment(segment)
      return {
        id: `${log.id}-${i}`,
        name: parsed.name,
        store: parsed.store ?? store,
        source: 'convenience' as const,
        category: 'lunch' as const,
        role: 'main' as const,
        portionable: false,
        tags: [],
        calories: null,
        protein_g: null,
        carbs_g: 0,
        fat_g: 0,
        price: 0,
        photo_url: '',
        description: '',
        nutrition_status: log.nutrition_status,
      }
    })
  }

  const resolved = names.map((segment, i) => {
    const parsed = parseDiceLogSegment(segment)
    const menuHit = lookupMenuItemForLog(parsed.name, parsed.store ?? store)
    if (menuHit) {
      return {
        ...menuHit,
        id: `${log.id}-${i}`,
        nutrition_status: log.nutrition_status,
      } satisfies MealPreviewItem
    }
    return null
  })

  if (resolved.every(Boolean)) {
    return resolved as MealPreviewItem[]
  }

  const perCal = Math.round(log.calories / names.length)
  const perPro = Math.round(log.protein_g / names.length)
  return names.map((segment, i) => {
    const parsed = parseDiceLogSegment(segment)
    return {
      id: `${log.id}-${i}`,
      name: parsed.name,
      store: parsed.store ?? store,
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
      nutrition_status: log.nutrition_status,
    }
  })
}

function diceSessionKey(mealType: MealType): string {
  return `dice-session-${getNutritionDayKey(new Date())}-${mealType}`
}

function loadDiceSession(mealType: MealType): {
  stores: string[]
  ids: string[]
  queue?: RecommendationQueueState
} {
  if (typeof window === 'undefined') return { stores: [], ids: [] }
  try {
    const raw = sessionStorage.getItem(diceSessionKey(mealType))
    if (!raw) return { stores: [], ids: [] }
    const parsed = JSON.parse(raw) as {
      stores?: string[]
      ids?: string[]
      queue?: RecommendationQueueState
    }
    return { stores: parsed.stores ?? [], ids: parsed.ids ?? [], queue: parsed.queue }
  } catch {
    return { stores: [], ids: [] }
  }
}

function saveDiceSession(
  mealType: MealType,
  stores: string[],
  ids: string[],
  queue?: RecommendationQueueState
) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      diceSessionKey(mealType),
      JSON.stringify({ stores, ids, queue })
    )
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
  onClearMealSelection?: (mealType: MealType) => void
  onPostureLine?: (line: string) => void
  onDiceApply: (payload: {
    mealType: MealType
    selection: CustomEatOutSelection[]
    dailyRolls: DailyRollState
    mealSuggest: Partial<Record<MealType, MealSuggestState>>
    userMemory: UserMemoryMeta
    logEntry: FoodLogEntry
  }) => void
  registerDeleteLog?: (handler: (logId: string) => void) => void
  onOpenNutritionConfirmation?: (log: FoodLogEntry) => void
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
  onClearMealSelection,
  onPostureLine,
  onDiceApply,
  registerDeleteLog,
  onOpenNutritionConfirmation,
}: Props) {
  const pathname = usePathname()
  const onDashboard = pathname === '/dashboard'
  const coords = useGeolocation(userMemory.eat_out_prefs?.work_location)
  const memory = memoryFromCheckinMeta({ user_memory: userMemory })

  const foodLogs = userMemory.food_logs_today ?? []

  const activeSlot = useMemo<FoodSlot>(
    () => defaultFoodSlot(getTaipeiHour(), mealHoursFromLogs(recentFoodLogs)),
    [recentFoodLogs]
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
  const rollingRef = useRef(false)
  const confirmingRef = useRef(false)
  const loggingRef = useRef(false)
  const autoRollKeyRef = useRef('')
  const lastPostureLineRef = useRef('')
  const photoPreviewUrlRef = useRef<string | null>(null)
  const [dicePreviewByMeal, setDicePreviewByMeal] = useState<Partial<Record<MealType, MealSuggestion>>>({})
  const dicePreview = dicePreviewByMeal[mealSlotLegacy] ?? null
  const [localDiceRolls, setLocalDiceRolls] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoDraft, setPhotoDraft] = useState<PhotoLogDraft | null>(null)
  const [photoProcessing, setPhotoProcessing] = useState(false)
  const [photoSaving, setPhotoSaving] = useState(false)
  const [manualPhotoOpen, setManualPhotoOpen] = useState(false)

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
        .filter(({ log }) => logMatchesFoodSlot(log, activeSlot)),
    [foodLogs, activeSlot]
  )

  const lastSlotLog = slotLogs.length > 0 ? slotLogs[slotLogs.length - 1]!.log : null

  const slotLoggedItems = useMemo(
    () => (lastSlotLog ? logToDisplayItems(lastSlotLog) : []),
    [lastSlotLog]
  )

  const slotSelectedItems = useMemo(() => {
    const customMealType = customEatOutMealTypeForSlot(activeSlot)
    if (!customMealType) return []
    const custom = customEatOut[customMealType]
    if (!custom?.length) return []
    return selectedToDisplayItems(deserializeCustomCombo(custom, getDiceMenuSource()))
  }, [customEatOut, activeSlot])

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
      const nextLogs = current.map(l => {
        if (l.id !== logId) return l
        return enrichFoodLog({ ...l, ...patch })
      })
      const updated = nextLogs.find(l => l.id === logId)
      let nextDna = userMemory.food_dna ?? foodDna
      if (updated && patch.capture_status === 'resolved' && updated.name !== '未知食物') {
        nextDna = learnFromLog(nextDna, updated)
      }
      const nextMemory = { ...userMemory, food_logs_today: nextLogs, food_dna: nextDna }
      const delta =
        updated && prev ? (updated.calories ?? 0) - (prev.calories ?? 0) : 0
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
      const full: FoodLogEntry = enrichFoodLog({
        ...entry,
        slot: entry.slot ?? activeSlot,
        logged_at: new Date().toISOString(),
        user_declared: true,
      })
      const nextLogs = [...foodLogs, full]
      const nextDna = full.learning
        ? (userMemory.food_dna ?? foodDna)
        : learnFromLog(userMemory.food_dna ?? foodDna, full)
      const nextMemory = { ...userMemory, food_logs_today: nextLogs, food_dna: nextDna }
      setQuery('')
      setMoreOpen(false)
      onLogFood(nextLogs, nextMemory)
      schedulePostureLine(nextLogs, nextMemory, (full.calories ?? 0) - mealTargets.calories)
      queueMicrotask(() => {
        loggingRef.current = false
      })
    },
    [foodLogs, userMemory, foodDna, activeSlot, mealTargets.calories, schedulePostureLine, onLogFood]
  )

  const removeLogById = useCallback(
    (logId: string) => {
      const removed = foodLogs.find(l => l.id === logId)
      const prevLogs = foodLogs
      const prevMemory = userMemory
      const nextLogs = foodLogs.filter(l => l.id !== logId)
      const nextMemory = { ...userMemory, food_logs_today: nextLogs }
      onLogFood(nextLogs, nextMemory)
      if (removed) {
        const mt = customEatOutMealTypeForSlot(normalizeFoodLogSlot(removed))
        if (mt) onClearMealSelection?.(mt)
        const slot = normalizeFoodLogSlot(removed)
        const legacy =
          slot === 'meal1' ? 'breakfast' : slot === 'meal2' ? 'lunch' : slot === 'meal3' ? 'dinner' : null
        if (legacy) {
          saveDiceSession(legacy, [], [])
          setDicePreviewByMeal(prev => {
            if (!prev[legacy]) return prev
            const next = { ...prev }
            delete next[legacy]
            return next
          })
        }
      }
      autoRollKeyRef.current = ''
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
    [foodLogs, userMemory, schedulePostureLine, onLogFood, onClearMealSelection]
  )

  useLayoutEffect(() => {
    registerDeleteLog?.(removeLogById)
  }, [registerDeleteLog, removeLogById])

  const parsePhotoDraft = useCallback(async (file: File, previewUrl: string) => {
    let parsedName = ''
    try {
      const parsed = await uploadFoodPhotoFile(file)
      parsedName = parsed.name.trim() || '未知食物'
      const photoId = `photo-parse-${Date.now()}`

      if (isNativeIOS()) {
        setPhotoDraft(prev =>
          prev
            ? {
                ...prev,
                previewUrl,
                file,
                name: parsedName,
                calories: null,
                protein_g: null,
                carbs_g: null,
                fat_g: null,
                loading: false,
                matchingNutrition: false,
                photo_v2: undefined,
                accuracy: undefined,
              }
            : prev
        )
        return
      }

      setPhotoDraft(prev =>
        prev
          ? {
              ...prev,
              previewUrl,
              file,
              name: parsedName,
              loading: false,
              matchingNutrition: true,
            }
          : prev
      )

      const store = storesInText(parsedName)?.[0]
      let accuracy
      try {
        const photo_v2 = await fetchPhotoMatch(parsedName, {
          store,
          photo_id: photoId,
        })
        accuracy = photoAccuracyStateFromV2(photo_v2)
      } catch (matchErr) {
        console.warn('Photo match API failed, using client fallback', matchErr)
        accuracy = createPhotoAccuracyState(parsedName, { store, photo_id: photoId })
      }

      const resolved = accuracy.v2.outcome.official_record
      const display = photoAccuracyDisplayMacros(accuracy)

      setPhotoDraft(prev =>
        prev
          ? {
              ...prev,
              previewUrl,
              file,
              name: resolved?.name ?? accuracy.label,
              calories: display.calories,
              protein_g: display.protein_g,
              carbs_g: display.carbs_g,
              fat_g: display.fat_g,
              loading: false,
              matchingNutrition: false,
              photo_v2: undefined,
              accuracy,
            }
          : prev
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : '辨識失敗，請稍後再試'
      toast.error('無法完成辨識', { description: message })
      setPhotoDraft(prev =>
        prev
          ? {
              ...prev,
              name: parsedName || '未知食物',
              calories: null,
              protein_g: null,
              carbs_g: null,
              fat_g: null,
              loading: false,
              accuracy: undefined,
            }
          : prev
      )
    }
  }, [])

  const handlePhotoPick = useCallback(
    (file: File) => {
      if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current)
      photoPreviewUrlRef.current = null
      setPhotoOpen(true)
      setPhotoDraft(null)
      setPhotoProcessing(true)

      void (async () => {
        try {
          const prepared = await prepareFoodPhotoFile(file)
          if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current)
          photoPreviewUrlRef.current = prepared.previewUrl
          setPhotoProcessing(false)
          setPhotoDraft({
            file: prepared.file,
            previewUrl: prepared.previewUrl,
            name: '',
            calories: null,
            protein_g: null,
            carbs_g: null,
            fat_g: null,
            loading: true,
          })
          await parsePhotoDraft(prepared.file, prepared.previewUrl)
        } catch (err) {
          setPhotoProcessing(false)
          const message = err instanceof Error ? err.message : '無法處理照片'
          toast.error('照片無法使用', { description: message })
          setPhotoDraft(null)
        }
      })()
    },
    [parsePhotoDraft]
  )

  const closePhotoSheet = useCallback(() => {
    setPhotoOpen(false)
    setPhotoDraft(null)
    setPhotoProcessing(false)
    setPhotoSaving(false)
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current)
      photoPreviewUrlRef.current = null
    }
  }, [])

  const handleAccuracyChange = useCallback((patch: Partial<UserConfirmationAnswers>) => {
    setPhotoDraft(prev => {
      if (!prev?.accuracy) return prev
      const accuracy = updatePhotoAccuracyState(prev.accuracy, patch)
      const picked = resolvePhotoOfficialRecord(accuracy.v2)
      const display = photoAccuracyDisplayMacros(accuracy)
      return {
        ...prev,
        name: picked?.name ?? accuracy.label,
        calories: display.calories,
        protein_g: display.protein_g,
        carbs_g: display.carbs_g,
        fat_g: display.fat_g,
        accuracy,
      }
    })
  }, [])

  const handlePhotoV2Select = useCallback((candidateId: string) => {
    setPhotoDraft(prev => {
      if (!prev?.photo_v2) return prev
      const v2 = updatePhotoV2State(prev.photo_v2, {
        selected_candidate_id: candidateId,
        user_confirmed: true,
      })
      const picked = resolvePhotoOfficialRecord(v2)
      return {
        ...prev,
        photo_v2: v2,
        name: picked?.name ?? prev.name,
      }
    })
  }, [])

  const savePhotoOnly = useCallback(() => {
    if (!photoDraft || photoSaving || photoDraft.loading) return
    const label = photoDraft.name.trim()
    if (!label) return
    setPhotoSaving(true)
    const logId = `photo-${Date.now()}`
    const finish = (url: string) => {
      const visual = buildPhotoVisualParse(label)
      const entry = buildFoodLogFromManualPhotoCorrection(
        {
          mode: 'unknown_photo',
          label,
          category: visual.visual_category,
          photoAi: buildPhotoAiMeta(visual, []),
        },
        { id: logId, photo_data_url: url, slot: activeSlot }
      )
      commitLog({
        id: entry.id,
        name: entry.display_label ?? entry.name,
        display_label: entry.display_label ?? entry.name,
        user_input_label: entry.user_input_label,
        matched_item_label: entry.matched_item_label,
        matched_restaurant: entry.matched_restaurant,
        match_type: entry.match_type,
        store: entry.store,
        calories: entry.calories,
        protein_g: entry.protein_g,
        carbs_g: entry.carbs_g,
        fat_g: entry.fat_g,
        source: entry.source,
        photo_data_url: entry.photo_data_url,
        photo_ai_meta: entry.photo_ai_meta,
        photo_correction_meta: entry.photo_correction_meta,
        capture_status: entry.capture_status,
        nutrition_status: entry.nutrition_status,
        nutrition_confidence: entry.nutrition_confidence,
      })
      closePhotoSheet()
      setPhotoSaving(false)
    }
    void fileToDataUrl(photoDraft.file).then(finish)
  }, [photoDraft, photoSaving, commitLog, closePhotoSheet, activeSlot])

  const savePhotoDraft = useCallback(() => {
    if (!photoDraft || photoSaving || photoDraft.loading) return

    const accuracy =
      photoDraft.accuracy ??
      (photoDraft.photo_v2 ? photoAccuracyStateFromV2(photoDraft.photo_v2) : null)
    if (!accuracy) return
    if (!photoAccuracyReadyForLog(accuracy)) return
    setPhotoSaving(true)
    const logId = `photo-${Date.now()}`
    const finish = (url: string) => {
      const { payload, meta } = buildPhotoLogCommitFromAccuracy(accuracy, {
        id: logId,
        photo_data_url: url,
      })
      if (!payload) {
        setPhotoSaving(false)
        return
      }
      commitLog({
        id: payload.id,
        name: payload.display_label ?? payload.name,
        display_label: payload.display_label ?? payload.name,
        user_input_label: payload.user_input_label,
        matched_item_label: payload.matched_item_label,
        matched_restaurant: payload.matched_restaurant,
        match_type: payload.match_type,
        store: payload.store,
        calories: payload.calories,
        protein_g: payload.protein_g,
        carbs_g: payload.carbs_g ?? undefined,
        fat_g: payload.fat_g ?? undefined,
        source: 'photo',
        photo_data_url: url,
        photo_ai_meta: payload.photo_ai_meta,
        capture_status: payload.capture_status,
        nutrition_status: payload.nutrition_status,
        nutrition_confidence: payload.nutrition_confidence,
        nutrition_accuracy_meta: meta
          ? {
              accuracy_level: meta.accuracy_level,
              source_type: meta.source_type,
              user_confirmed: meta.user_confirmed,
              portion_adjustments: {},
              candidate_label: meta.candidate_label,
            }
          : undefined,
      })
      closePhotoSheet()
    }
    void fileToDataUrl(photoDraft.file).then(finish)
  }, [photoDraft, photoSaving, commitLog, closePhotoSheet])

  const handleManualPhotoCorrection = useCallback(
    (result: ManualPhotoCorrectionResult) => {
      if (!photoDraft) return
      setPhotoSaving(true)
      const logId = `photo-${Date.now()}`
      const finish = (url: string) => {
        const entry = buildFoodLogFromManualPhotoCorrection(result, {
          id: logId,
          photo_data_url: url,
          slot: activeSlot,
        })
        commitLog({
          id: entry.id,
          name: entry.display_label ?? entry.name,
          display_label: entry.display_label ?? entry.name,
          user_input_label: entry.user_input_label,
          matched_item_label: entry.matched_item_label,
          matched_restaurant: entry.matched_restaurant,
          match_type: entry.match_type,
          store: entry.store,
          calories: entry.calories,
          protein_g: entry.protein_g,
          carbs_g: entry.carbs_g,
          fat_g: entry.fat_g,
          source: entry.source,
          photo_data_url: entry.photo_data_url,
          photo_ai_meta: entry.photo_ai_meta,
          photo_correction_meta: entry.photo_correction_meta,
          capture_status: entry.capture_status,
          nutrition_status: entry.nutrition_status,
          nutrition_confidence: entry.nutrition_confidence,
          user_nutrition_meta: entry.user_nutrition_meta,
        })
        setManualPhotoOpen(false)
        closePhotoSheet()
        setPhotoSaving(false)
        if (entry.nutrition_status === 'unknown') {
          enqueueUnknownFromLog(entry)
          onOpenNutritionConfirmation?.(entry)
        }
      }
      void fileToDataUrl(photoDraft.file).then(finish)
    },
    [photoDraft, commitLog, activeSlot, closePhotoSheet, onOpenNutritionConfirmation]
  )

  const rollDice = useCallback(() => {
    if (!dayStateRef.current.allowDiceAndSuggest || rollingRef.current) return
    if (customEatOut[mealSlotLegacy]?.length) {
      onClearMealSelection?.(mealSlotLegacy)
    }
    rollingRef.current = true
    setRolling(true)

    const slot = mealSlotLegacy
    const session = loadDiceSession(slot)
    const preview = dicePreviewByMeal[slot] ?? null

    const runRoll = () => {
      try {
        const excludeIds = [...new Set([
          ...seenIdsForMeal(dailyRolls, slot),
          preview?.id,
        ].filter(Boolean))]
        const excludeNames = preview
          ? [...new Set(preview.lines.map(l => l.item.name))]
          : []

        const result = rollMealSuggestion({
          meal_type: slot,
          daily_targets: todayPlan.daily_targets,
          profile,
          memory,
          day_index: dayIndex,
          seen_ids: excludeIds,
          exclude_names: excludeNames,
          exclude_stores: [],
          rolls_used: localDiceRolls,
          user_lat: coords?.lat,
          user_lng: coords?.lng,
          adherence: adherenceState,
          calorie_bank: calorieBank,
          day_state: dayStateRef.current,
          today_food_logs: foodLogs,
          queue_state: session.queue,
          seed: Date.now() + localDiceRolls * 9973,
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
        saveDiceSession(slot, nextStores, nextIds, result.queue_state ?? undefined)
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

    if (USE_RECOMMENDATION_V2) {
      scheduleRoll()
    } else if (isDiceMenuBulkReady()) {
      scheduleRoll()
    } else {
      void preloadDiceMenuBulk().finally(scheduleRoll)
    }
  }, [mealSlotLegacy, dicePreviewByMeal, foodLogs, customEatOut, todayPlan, profile, memory, dayIndex, coords, localDiceRolls, dailyRolls, adherenceState, calorieBank, onClearMealSelection])

  const confirmDice = useCallback(() => {
    if (!dicePreview || confirmingRef.current) return
    confirmingRef.current = true
    setConfirming(true)
    const items = linesToDisplayItems(dicePreview.lines)
    const totals = sumItemMacros(items)
    const logEntry: FoodLogEntry = {
      id: `dice-${dicePreview.id}`,
      name: items.map(i => formatEatOutDiceLabel(i)).join(' + '),
      store: dicePreview.stores[0] ?? (items.length === 1 ? items[0]?.store : undefined),
      calories: totals.calories,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
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
  const hasSlotLogs = slotLogs.length > 0
  const displayItems =
    previewItems.length > 0
      ? previewItems
      : hasSlotLogs && slotLoggedItems.length > 0
        ? slotLoggedItems
        : slotSelectedItems.length > 0
          ? slotSelectedItems
          : []
  const showingConfirmedSelection = !dicePreview && slotSelectedItems.length > 0 && !hasSlotLogs
  const showingLoggedOnly =
    !dicePreview && slotSelectedItems.length === 0 && slotLoggedItems.length > 0

  useEffect(() => {
    if (dayState.overTargetProtection) return
    if (customEatOut[mealSlotLegacy]?.length) return
    if (dicePreviewByMeal[mealSlotLegacy]) return
    if (slotLogs.length > 0) return
    const key = `${mealSlotLegacy}:empty`
    if (autoRollKeyRef.current === key) return
    autoRollKeyRef.current = key
    rollDice()
  }, [
    rollDice,
    dayState.overTargetProtection,
    mealSlotLegacy,
    customEatOut,
    dicePreviewByMeal,
    slotLogs.length,
  ])

  useEffect(() => {
    if (slotLogs.length > 0 || customEatOut[mealSlotLegacy]?.length) {
      autoRollKeyRef.current = ''
    }
  }, [slotLogs.length, customEatOut, mealSlotLegacy])

  useEffect(() => {
    if (dayState.overTargetProtection) {
      setDicePreviewByMeal({})
      setRolling(false)
      rollingRef.current = false
    }
  }, [dayState.overTargetProtection])

  const openMore = useCallback(() => setMoreOpen(true), [])
  const closeMore = useCallback(() => setMoreOpen(false), [])
  const closeAllOverlays = useCallback(() => {
    setMoreOpen(false)
    setPhotoOpen(false)
    setManualPhotoOpen(false)
    setPhotoDraft(null)
    setPhotoSaving(false)
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current)
      photoPreviewUrlRef.current = null
    }
  }, [])
  const handleDraftChange = useCallback(
    (patch: Partial<Pick<PhotoLogDraft, 'name' | 'calories' | 'protein_g'>>) => {
      setPhotoDraft(prev => (prev ? { ...prev, ...patch } : prev))
    },
    []
  )
  const handlePickSearch = useCallback(
    (item: { id: string; name: string; store?: string; calories: number; protein_g: number; carbs_g?: number; fat_g?: number }) => {
      const trimmedQuery = query.trim()
      commitLog({
        id: item.id,
        name: item.name,
        display_label: item.name,
        user_input_label: trimmedQuery || item.name,
        matched_item_label: item.name,
        matched_restaurant: item.store,
        match_type: 'user_selected_verified_item',
        store: item.store,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        source: 'search',
        nutrition_status: 'official',
        nutrition_confidence: 'A',
        capture_status: 'resolved',
      })
      setQuery('')
      closeMore()
    },
    [commitLog, query, closeMore]
  )
  const handleCreateFreeText = useCallback(
    (name: string, options?: { forceUnknown?: boolean }) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const est = options?.forceUnknown
        ? createUnknownFreeTextMeal(trimmed)
        : resolveOrEstimateFreeTextMeal(trimmed)
      if (est.blocked) {
        toast.message('需要再確認一下', {
          description: est.explanation ?? '請從搜尋建議選擇正確品項，或輸入更明確的菜名。',
        })
        return
      }
      const displayLabel = est.display_label ?? est.name
      const pending: Omit<FoodLogEntry, 'logged_at' | 'user_declared'> = {
        id: est.id,
        name: displayLabel,
        display_label: displayLabel,
        user_input_label: est.user_input_label ?? trimmed,
        matched_item_label: est.matched_item_label,
        matched_restaurant: est.matched_restaurant,
        match_type: est.match_type,
        store: est.store,
        calories: est.calories,
        protein_g: est.protein_g,
        carbs_g: est.carbs_g ?? undefined,
        fat_g: est.fat_g ?? undefined,
        source: est.source,
        nutrition_status: est.nutrition_status,
        nutrition_confidence: est.nutrition_confidence,
        capture_status: est.capture_status,
      }
      commitLog(pending)
      setQuery('')
      closeMore()
      if (est.nutrition_status === 'unknown') {
        const full: FoodLogEntry = enrichFoodLog({
          ...pending,
          slot: activeSlot,
          logged_at: new Date().toISOString(),
          user_declared: true,
        })
        enqueueUnknownFromLog(full)
        onOpenNutritionConfirmation?.(full)
      }
    },
    [commitLog, activeSlot, onOpenNutritionConfirmation, closeMore]
  )
  const handleCommitFrequent = useCallback(
    (frequentId?: string) => {
      const f = frequentList.find(x => x.id === (frequentId ?? selectedFrequentId))
      if (f) commitLog(frequentToLogEntry(f, activeSlot))
    },
    [frequentList, selectedFrequentId, activeSlot, commitLog]
  )

  useEffect(() => {
    void preloadDiceMenuBulk()
  }, [])

  useEffect(() => {
    const openPhoto = () => setPhotoOpen(true)
    const openTextLog = () => setMoreOpen(true)
    const handleRollDice = () => {
      if (onDashboard) rollDice()
    }
    const handleRouteChange = () => {
      if (todaySheetFromSearch(window.location.search)) return
      closeAllOverlays()
    }

    window.addEventListener(TODAY_OPEN_PHOTO_EVENT, openPhoto)
    window.addEventListener(TODAY_OPEN_TEXT_LOG_EVENT, openTextLog)
    window.addEventListener('betterbit:roll-dice', handleRollDice)
    window.addEventListener('betterbit:route-change', handleRouteChange)

    if (typeof window !== 'undefined' && onDashboard) {
      const intent = todaySheetFromSearch(window.location.search)
      if (intent === 'photo') {
        setPhotoOpen(true)
        clearTodaySheetParams()
      } else if (intent === 'text') {
        setMoreOpen(true)
        clearTodaySheetParams()
      }
    }

    return () => {
      window.removeEventListener(TODAY_OPEN_PHOTO_EVENT, openPhoto)
      window.removeEventListener(TODAY_OPEN_TEXT_LOG_EVENT, openTextLog)
      window.removeEventListener('betterbit:roll-dice', handleRollDice)
      window.removeEventListener('betterbit:route-change', handleRouteChange)
    }
  }, [closeAllOverlays, onDashboard, rollDice])

  useEffect(() => {
    if (!onDashboard) closeAllOverlays()
  }, [onDashboard, closeAllOverlays])

  if (!onDashboard) return null

  return (
    <div className="pb-2 space-y-4 max-w-[640px] mx-auto" style={{ fontFamily: TODAY.font }}>
      <BBCard className="space-y-5">
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
              recommendationReasons={dicePreview?.recommendation_reason}
              benefitPoints={dicePreview?.recommendation_benefit_points}
              confidenceLevel={dicePreview?.confidence_level}
            />
            {showingConfirmedSelection && slotMealSuggest?.current_highlight && (
              <p className="text-[13px] px-0.5 leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                {slotMealSuggest.current_highlight}
              </p>
            )}
          </>
        ) : (
          <div className="py-10 text-center text-[14px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            點下方換一個，或改用文字紀錄
          </div>
        )}

        <div className="space-y-3 pt-1 relative z-10">
          {dicePreview && dayState.allowDiceAndSuggest && (
            <button
              type="button"
              disabled={rolling || confirming}
              onClick={confirmDice}
              className="w-full h-16 rounded-[24px] text-[18px] disabled:opacity-40 touch-manipulation"
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
              className="flex-1 h-14 rounded-[22px] text-[14px] flex items-center justify-center gap-2 disabled:opacity-40 touch-manipulation"
              style={{ backgroundColor: TODAY.pillBg, color: TODAY.text, fontWeight: 500 }}
            >
              <RefreshCw className={`h-[16px] w-[16px] ${rolling ? 'animate-spin' : ''}`} strokeWidth={TODAY.iconStroke} />
              {rolling ? '想一下…' : '換一個'}
            </button>
            <button
              type="button"
              onClick={openMore}
              className="flex-[1.12] h-14 rounded-[22px] text-[14px] flex items-center justify-center gap-2 touch-manipulation"
              style={{ backgroundColor: TODAY.pillBg, color: TODAY.text, fontWeight: 500 }}
            >
              <ClipboardList className="h-[16px] w-[16px]" strokeWidth={TODAY.iconStroke} />
              文字紀錄
            </button>
          </div>

          <button
            type="button"
            onClick={() => dispatchOpenPhotoSheet()}
            className="w-full h-12 rounded-[20px] text-[14px] flex items-center justify-center gap-2 active:opacity-90 touch-manipulation"
            style={{ backgroundColor: TODAY.surface, color: TODAY.mocha, fontWeight: 500 }}
          >
            <Camera className="h-[16px] w-[16px]" strokeWidth={TODAY.iconStroke} />
            拍今天吃的
          </button>
        </div>
      </BBCard>

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
        onCreateFreeText={handleCreateFreeText}
      />

      <PhotoLogSheet
        open={photoOpen}
        draft={photoDraft}
        processing={photoProcessing}
        accuracyEnabled={isNutritionAccuracyV1()}
        onClose={closePhotoSheet}
        onPickFile={handlePhotoPick}
        onDraftChange={handleDraftChange}
        onAccuracyChange={handleAccuracyChange}
        onSave={savePhotoDraft}
        onBackToCapture={() => setPhotoDraft(null)}
        onOpenManualCorrection={() => setManualPhotoOpen(true)}
        onPhotoV2Select={handlePhotoV2Select}
        onSavePhotoOnly={savePhotoOnly}
        saving={photoSaving}
      />

      {photoDraft && (photoDraft.accuracy || photoDraft.photo_v2 || (isNativeIOS() && photoDraft.name)) && (
        <ManualPhotoCorrectionSheet
          open={manualPhotoOpen}
          initialLabel={photoDraft.accuracy?.label ?? photoDraft.photo_v2?.detected_label ?? photoDraft.name}
          initialRestaurant={photoDraft.accuracy?.store ?? photoDraft.photo_v2?.store}
          visualParse={
            photoDraft.accuracy?.visual_parse ??
            photoDraft.photo_v2?.visual_parse ??
            buildPhotoVisualParse(photoDraft.name)
          }
          originalCandidates={
            photoDraft.accuracy?.photo_ai_original_candidates ??
            photoDraft.photo_v2?.photo_ai_original_candidates ??
            []
          }
          onClose={() => setManualPhotoOpen(false)}
          onCommit={handleManualPhotoCorrection}
        />
      )}

    </div>
  )
}
