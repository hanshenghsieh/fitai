'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, Loader2, RefreshCw, Camera } from 'lucide-react'
import { format, subDays, parseISO } from 'date-fns'
import { searchFoodMenu } from '@/lib/food-search'
import { estimateFreeTextMeal } from '@/lib/food-estimate'
import { enrichFoodLog, sumItemMacros } from '@/lib/food-log-macros'
import {
  fileToDataUrl,
  isLowConfidence,
  lookupVerifiedFood,
  parseFoodPhotoDataUrl,
} from '@/lib/food-capture'
import { isNutritionAccuracyV1 } from '@/lib/nutrition-accuracy-flag'
import {
  buildPhotoLogCommitFromAccuracy,
  createPhotoAccuracyState,
  photoAccuracyReadyForLog,
  updatePhotoAccuracyState,
} from '@/lib/nutrition/photo-log-accuracy'
import type { UserConfirmationAnswers } from '@/lib/nutrition/types'
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
import { preloadDiceMenuBulk, isDiceMenuBulkReady, getDiceMenuSource } from '@/lib/dice-menu-pool'
import { storesInText } from '@/lib/dice-store-names'
import { linesToDisplayItems } from '@/lib/meal-suggest'
import { formatEatOutDiceLabel, deserializeCustomCombo, selectedToDisplayItems } from '@/lib/eat-out-builder'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
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
}: Props) {
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
      schedulePostureLine(nextLogs, nextMemory, full.calories - mealTargets.calories)
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

  const requestDeleteLog = useCallback((logId: string) => {
    setDeleteConfirmId(logId)
  }, [])

  useEffect(() => {
    registerDeleteLog?.(requestDeleteLog)
  }, [registerDeleteLog, requestDeleteLog])

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
        if (isNutritionAccuracyV1()) {
          const accuracy = createPhotoAccuracyState(parsed.name || '', { store: storesInText(parsed.name)?.[0] })
          setPhotoDraft({
            file,
            previewUrl,
            dataUrl,
            name: accuracy.draft.candidate.display_name,
            calories: accuracy.final.ready_for_food_log ? accuracy.final.calories : 0,
            protein_g: accuracy.final.ready_for_food_log ? accuracy.final.protein_g : 0,
            loading: false,
            accuracy,
          })
          return
        }
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

  const handleAccuracyChange = useCallback((patch: Partial<UserConfirmationAnswers>) => {
    setPhotoDraft(prev => {
      if (!prev?.accuracy) return prev
      const accuracy = updatePhotoAccuracyState(prev.accuracy, patch)
      return {
        ...prev,
        name: accuracy.draft.candidate.display_name,
        calories: accuracy.final.ready_for_food_log ? accuracy.final.calories : 0,
        protein_g: accuracy.final.ready_for_food_log ? accuracy.final.protein_g : 0,
        accuracy,
      }
    })
  }, [])

  const savePhotoDraft = useCallback(() => {
    if (!photoDraft || photoSaving || photoDraft.loading) return
    if (isNutritionAccuracyV1() && photoDraft.accuracy) {
      if (!photoAccuracyReadyForLog(photoDraft.accuracy)) return
      setPhotoSaving(true)
      const logId = `photo-${Date.now()}`
      const finish = (url: string) => {
        const { payload, meta } = buildPhotoLogCommitFromAccuracy(photoDraft.accuracy!, {
          id: logId,
          photo_data_url: url,
        })
        if (!payload) {
          setPhotoSaving(false)
          return
        }
        commitLog({
          ...payload,
          photo_data_url: url,
          capture_status: 'resolved',
          nutrition_accuracy_meta: meta ?? undefined,
        })
        closePhotoSheet()
      }
      const dataUrl = photoDraft.dataUrl
      if (!dataUrl) {
        void fileToDataUrl(photoDraft.file).then(finish)
        return
      }
      finish(dataUrl)
      return
    }
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
  const highlightKey =
    dicePreview?.highlight_key ?? slotMealSuggest?.current_highlight_key ?? 'balanced'

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
  const openPhoto = useCallback(() => setPhotoOpen(true), [])
  const handleDraftChange = useCallback(
    (patch: Partial<Pick<PhotoLogDraft, 'name' | 'calories' | 'protein_g'>>) => {
      setPhotoDraft(prev => (prev ? { ...prev, ...patch } : prev))
    },
    []
  )
  const handlePickSearch = useCallback(
    (item: { id: string; name: string; store?: string; calories: number; protein_g: number; carbs_g?: number; fat_g?: number }) => {
      commitLog({
        id: item.id,
        name: item.name,
        store: item.store,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        source: 'search',
      })
    },
    [commitLog]
  )
  const handleCreateFreeText = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const est = estimateFreeTextMeal(trimmed, mealTargets.calories, mealTargets.protein)
      commitLog({
        id: est.id,
        name: est.name,
        calories: est.calories,
        protein_g: est.protein_g,
        source: 'search',
      })
    },
    [commitLog, mealTargets.calories, mealTargets.protein]
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
    window.addEventListener('betterbit:open-photo', openPhoto)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('photo') === '1') {
        setPhotoOpen(true)
        window.history.replaceState({}, '', '/dashboard')
      }
    }
    return () => window.removeEventListener('betterbit:open-photo', openPhoto)
  }, [])

  return (
    <div className="pb-2 space-y-8 max-w-[640px] mx-auto" style={{ fontFamily: TODAY.font }}>
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
              mealType={mealSlotLegacy}
              schedule={userMemory.work_schedule ?? 'standard'}
              lifeEvent={inferredTrustEvent}
              prefersCook={profile?.cooking_time_mins != null && profile.cooking_time_mins >= 20}
              highlightKey={highlightKey}
              highlightPriceMeta={dicePreview?.highlight_price_meta}
              debugReason={dicePreview?.recommendation_debug_reason}
            />
            {showingConfirmedSelection && slotMealSuggest?.current_highlight && (
              <p className="text-[13px] px-0.5 leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                {slotMealSuggest.current_highlight}
              </p>
            )}
          </>
        ) : (
          <div className="py-10 text-center text-[14px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            點下方換一個，或從文字紀錄
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
              文字紀錄
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
        accuracyEnabled={isNutritionAccuracyV1()}
        onClose={closePhotoSheet}
        onPickFile={handlePhotoPick}
        onDraftChange={handleDraftChange}
        onAccuracyChange={handleAccuracyChange}
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
