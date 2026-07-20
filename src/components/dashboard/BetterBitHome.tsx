'use client'

import { useState, useTransition, useCallback, useEffect, useRef, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Play } from 'lucide-react'
import {
  initWorkoutItems,
  reconcileWorkoutItems,
  workoutItemsNeedSync,
  dailyRollsFromCheckin,
  userMemoryFromCheckin,
  mealSuggestFromCheckin,
  customEatOutFromCheckin,
  type MealType,
  type CustomEatOutSelection,
  type MealSuggestState,
  type UserMemoryMeta,
  type DailyRollState,
  userMemoryForPersist,
} from '@/lib/checkin-utils'
import { toast } from 'sonner'
import TodayV2Dashboard from '@/components/betterbit-v2/TodayV2Dashboard'
import TodayOS from '@/components/dashboard/TodayOS'
import NutritionConfirmationSheet from '@/components/dashboard/today/NutritionConfirmationSheet'
import MealEditSheet from '@/components/dashboard/today/MealEditSheet'
import { patchFoodRecordOnLog } from '@/lib/nutrition/p0-common-foods/apply-to-log'
import type { CommonFoodItem, FoodRecordDraft } from '@/lib/nutrition/p0-common-foods/types'
import PendingNutritionQueueSheet from '@/components/dashboard/today/PendingNutritionQueueSheet'
import { filterPendingNutritionLogs } from '@/lib/nutrition/food-log-display'
import AppOverlay from '@/components/ui/AppOverlay'
import { enrichFoodLog } from '@/lib/food-log-macros'
import type { FoodSlot } from '@/lib/food-slots'
import {
  applyManualNutritionToLog,
  enqueueUnknownFromLog,
  hitToFoodLogPatch,
} from '@/lib/nutrition/unknown-food-flow'
import type { MenuLookupHit } from '@/lib/food-menu-lookup'
import type { ManualNutritionInput } from '@/lib/nutrition/unknown-food-flow'
import {
  applyHomeCookedTotalsToLog,
  calculateHomeCookedMeal,
  type HomeCookedMealDraft,
} from '@/lib/nutrition/home-cooked'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import type { FoodLogEntry } from '@/lib/banks/types'
import type { FoodDna } from '@/lib/food-memory'
import { isRecoveryActive, resolveDailyExcessDriver, calorieFloorFromGender } from '@/lib/engines/calorie-bank-engine'
import { previewCalorieBankFromLogs } from '@/lib/banks/preview-calorie-bank'
import {
  applyCalorieBankUserPrefs,
  isCalorieBankEnabled,
  loadUserPreferencesClient,
} from '@/lib/settings/calorie-bank-user-prefs'
import type { UserSettingsPreferences } from '@/lib/settings/user-settings-types'
import { sumLoggedCalories, sumLoggedProtein, computeTodayMealState } from '@/lib/engines/next-meal-engine'
import { sumLoggedCarbs, sumLoggedFat } from '@/lib/food-log-macros'
import { foodLogsNeedSync, reconcileFoodLogsToday } from '@/lib/food-log-reconcile'
import {
  clearFoodLogsSessionCache,
  foodLogIdsFingerprint,
  resolveFoodLogsFromSession,
  writeFoodLogsSessionCache,
} from '@/lib/food-log-session-cache'
import { clearTodayOfflineSnapshot } from '@/lib/today-offline-cache'
import {
  resolveWorkoutItemsFromSession,
  writeWorkoutItemsSessionCache,
} from '@/lib/workout-items-session-cache'
import { preloadDiceMenuBulk } from '@/lib/dice-menu-pool'
import { getVerifiedExerciseVideo, exerciseVideoPlaceholder } from '@/lib/exercise-video-map'
import { getNutritionDayKey, getPreviousNutritionDayKey, isLocalDateKey } from '@/lib/timezone'
import { filterFoodLogsForNutritionDay } from '@/lib/nutrition-day-food-logs'
import { addWaterMl, resetWaterMl, resolveDailyWaterGoalMl, setWaterMl as applyWaterTotal } from '@/lib/water-log'
import { TODAY } from '@/lib/today-design'
import TodayWaterLog from '@/components/dashboard/today/TodayWaterLog'
import BBCard from '@/components/ui/BBCard'
import {
  dispatchOpenPhotoSheet,
  dispatchOpenTextLogSheet,
  dispatchRollDice,
  dispatchConfirmDice,
  TODAY_OPEN_RECORD_SHEET_EVENT,
  todayActionContextFromSearch,
  todaySheetFromSearch,
  takePendingCaptureContext,
  clearTodaySheetParams,
  foodSlotForCaptureLabel,
  type FoodCaptureContext,
} from '@/lib/today-actions'
import RecordActionSheet from '@/components/dashboard/today/RecordActionSheet'
import Day1GuideBanner, {
  dismissDay1Guide,
  markDay1GuidePending,
  shouldShowDay1Guide,
} from '@/components/dashboard/today/Day1GuideBanner'
import {
  enqueueCheckinMutation,
  OFFLINE_MUTATION_CONFIRMED_EVENT,
  requestOfflineMutationReplay,
  type CheckinMutationPayload,
  type OfflineMutationEntry,
} from '@/lib/offline-mutation-queue'
import { zaijian } from '@/lib/copy/zaijian'
import { invalidateMealMutation } from '@/lib/local-cache/invalidate'
import type { DayPlan, DailyCheckin, WorkoutCheckinItem, UserProfile } from '@/types'
import { apiFetch } from '@/lib/api/client'
import { moveTodayMealLogSlot } from '@/lib/today-meal-overview'
import {
  mergeCapturedFoodLogsForDate,
  patchFoodLogsForDate,
} from '@/lib/record/mutate-today-food-log'
import { traceRecordDate } from '@/lib/record-date-trace'

interface GoalSnapshot {
  current_body_fat?: number | null
  target_body_fat?: number | null
  target_weight?: number | null
  weeks_remaining?: number
  weekly_fat_loss_g?: number
  daily_deficit?: number
}

interface CheckinUiPatch {
  workoutItems?: WorkoutCheckinItem[]
  userMemory?: UserMemoryMeta
  dailyRolls?: DailyRollState
  mealSuggest?: Partial<Record<MealType, MealSuggestState>>
  customEatOut?: Partial<Record<MealType, CustomEatOutSelection[]>>
  waterMl?: number
}

interface Props {
  userId: string
  todayPlan: DayPlan
  checkin: DailyCheckin | null
  weeklyPlanId: string | null
  goalSnapshot?: GoalSnapshot | null
  dayIndex?: number
  profile?: UserProfile | null
  foodDna: FoodDna
  dayOfWeek: number
  recentMissedDays: number
  recentFoodLogs?: FoodLogEntry[]
  trialDaysLeft?: number | null
  initialFoodLogs?: FoodLogEntry[]
}

function formatExerciseDetail(set: { sets: number; reps: number | null; duration_secs: number | null; rest_secs: number }): string {
  const parts: string[] = []
  if (set.reps != null) parts.push(`${set.sets} 組 × ${set.reps} 下`)
  else if (set.duration_secs != null) parts.push(`${set.sets} 組 × ${Math.round(set.duration_secs / 60) || set.duration_secs} ${set.duration_secs >= 60 ? '分' : '秒'}`)
  else parts.push(`${set.sets} 組`)
  if (set.rest_secs > 0) parts.push(`休息 ${set.rest_secs} 秒`)
  return parts.join(' · ')
}

export default function BetterBitHome({
  userId,
  todayPlan,
  checkin,
  weeklyPlanId,
  goalSnapshot,
  dayIndex = 0,
  profile,
  foodDna,
  dayOfWeek,
  recentMissedDays,
  recentFoodLogs = [],
  trialDaysLeft,
  initialFoodLogs = [],
}: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchString = searchParams.toString()
  const requestedRecordContext = useMemo(() => {
    const context = todayActionContextFromSearch(searchString)
    return context?.intent === 'record' && context.targetDate ? context : null
  }, [searchString])
  const onDashboard = pathname === '/dashboard'
  const [isPending, startTransition] = useTransition()
  const [expandedWorkout, setExpandedWorkout] = useState(false)
  const exercises = todayPlan.workout?.main ?? []
  const [workoutItems, setWorkoutItems] = useState<WorkoutCheckinItem[]>(() => {
    const planList =
      todayPlan.workout?.main?.map(ex => ({
        exercise_id: ex.exercise_id,
        exercise_name_zh: ex.exercise_name_zh,
      })) ?? []
    const fromServer = initWorkoutItems(checkin, planList)
    return resolveWorkoutItemsFromSession(fromServer)
  })
  const [dailyRolls, setDailyRolls] = useState<DailyRollState>(() => dailyRollsFromCheckin(checkin))
  const [mealSuggest, setMealSuggest] = useState<Partial<Record<MealType, MealSuggestState>>>(() =>
    mealSuggestFromCheckin(checkin)
  )
  const [customEatOut, setCustomEatOut] = useState<Partial<Record<MealType, CustomEatOutSelection[]>>>(() =>
    customEatOutFromCheckin(checkin)
  )
  const [userMemory, setUserMemory] = useState<UserMemoryMeta>(() => {
    const mem = userMemoryFromCheckin(checkin)
    const serverLogs = mem.food_logs_today ?? []
    const logs = resolveFoodLogsFromSession(serverLogs)
    return { ...mem, food_logs_today: logs, food_dna: mem.food_dna ?? foodDna }
  })

  const warmup = todayPlan.workout?.warmup ?? []
  const cooldown = todayPlan.workout?.cooldown ?? []
  const planExerciseList = useMemo(
    () => exercises.map(ex => ({ exercise_id: ex.exercise_id, exercise_name_zh: ex.exercise_name_zh })),
    [exercises]
  )
  const planExerciseKey = useMemo(
    () => planExerciseList.map(e => e.exercise_id).join('|'),
    [planExerciseList]
  )
  const workoutDone = workoutItems.filter(w => w.completed).length
  const foodLogs = userMemory.food_logs_today ?? []
  const displayFoodLogs = useMemo(
    () => reconcileFoodLogsToday(foodLogs),
    [foodLogs]
  )
  const didLocalReconcileRef = useRef(false)
  const didSessionHydrateRef = useRef(false)

  const displayUserMemory = useMemo(
    () => ({ ...userMemory, food_logs_today: displayFoodLogs }),
    [userMemory, displayFoodLogs]
  )
  const [postureLine, setPostureLine] = useState('最近忙嗎？回來就好。今天照常。')
  const [trackedDayKey, setTrackedDayKey] = useState(() => getNutritionDayKey())
  const syncUserId = userId
  const [waterMl, setWaterMl] = useState(checkin?.water_ml ?? 0)
  const [calorieBank, setCalorieBank] = useState<CalorieBankRow | null>(null)
  const [previousDayBank, setPreviousDayBank] = useState<CalorieBankRow | null>(null)
  const [userPrefs, setUserPrefs] = useState<UserSettingsPreferences | null>(null)
  const [recordSheetOpen, setRecordSheetOpen] = useState(false)
  const [recordTargetDate, setRecordTargetDate] = useState(trackedDayKey)
  const [recordTargetSlot, setRecordTargetSlot] = useState<FoodSlot | undefined>()
  const [recordCaptureSource, setRecordCaptureSource] = useState<'record' | 'global'>('global')
  const historicalLogDatesRef = useRef(new Map<string, string>())
  const [showDay1Guide, setShowDay1Guide] = useState(false)
  const recordUrlHandledRef = useRef(false)
  const [mealUiState, setMealUiState] = useState({
    hasDicePreview: false,
    rolling: false,
    confirming: false,
    allowDiceAndSuggest: true,
  })
  const calorieBankSyncedRef = useRef(false)
  const persistErrorToastAtRef = useRef(0)
  const userMemoryRef = useRef(userMemory)
  const customEatOutRef = useRef(customEatOut)
  const dailyRollsRef = useRef(dailyRolls)
  const mealSuggestRef = useRef(mealSuggest)
  const workoutItemsRef = useRef(workoutItems)
  const waterMlRef = useRef(waterMl)

  useEffect(() => {
    waterMlRef.current = waterMl
    userMemoryRef.current = userMemory
    customEatOutRef.current = customEatOut
    dailyRollsRef.current = dailyRolls
    mealSuggestRef.current = mealSuggest
    workoutItemsRef.current = workoutItems
  }, [waterMl, userMemory, customEatOut, dailyRolls, mealSuggest, workoutItems])

  const writeFoodCache = useCallback(
    (logs: FoodLogEntry[]) => {
      writeFoodLogsSessionCache(logs, trackedDayKey, {
        calorie_target: todayPlan.daily_targets.calories,
        protein_target: todayPlan.daily_targets.protein_g,
        water_ml: waterMlRef.current,
      })
    },
    [trackedDayKey, todayPlan.daily_targets]
  )

  useEffect(() => {
    void preloadDiceMenuBulk()
  }, [])

  useEffect(() => {
    const refreshPreferences = () => {
      void loadUserPreferencesClient().then(setUserPrefs).catch(() => {})
    }
    refreshPreferences()
    window.addEventListener('betterbit:diet-preferences-changed', refreshPreferences)
    return () => window.removeEventListener('betterbit:diet-preferences-changed', refreshPreferences)
  }, [])

  useEffect(() => {
    if (calorieBankSyncedRef.current) return
    calorieBankSyncedRef.current = true
    const logs = initialFoodLogs.length ? initialFoodLogs : displayFoodLogs
    const targets = todayPlan.daily_targets
    const yesterday = getPreviousNutritionDayKey()

    void Promise.all([
      apiFetch('/api/calorie-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          normal_target_kcal: targets.calories,
          target_protein_g: targets.protein_g,
          target_fat_g: targets.fat_g,
          target_carbs_g: targets.carbs_g,
          actual_kcal: sumLoggedCalories(logs),
          actual_protein_g: sumLoggedProtein(logs),
          actual_carbs_g: sumLoggedCarbs(logs),
          actual_fat_g: sumLoggedFat(logs),
          date: getNutritionDayKey(),
        }),
      }),
      apiFetch(`/api/calorie-bank?date=${yesterday}`),
    ])
      .then(async ([postRes, prevRes]) => {
        const postJson = (await postRes.json()) as { bank?: CalorieBankRow | null }
        if (postJson.bank) setCalorieBank(postJson.bank)
        else if (!postRes.ok) {
          const getRes = await apiFetch('/api/calorie-bank')
          const getJson = (await getRes.json()) as { bank?: CalorieBankRow | null }
          if (getJson.bank) setCalorieBank(getJson.bank)
        }
        const prevJson = (await prevRes.json()) as { bank?: CalorieBankRow | null }
        if (prevJson.bank) setPreviousDayBank(prevJson.bank)
      })
      .catch(() => {})
  }, [todayPlan.daily_targets, initialFoodLogs, displayFoodLogs])

  const effectiveCalorieBank = useMemo(() => {
    if (!profile?.id) return calorieBank
    const raw = previewCalorieBankFromLogs({
      userId: profile.id,
      logs: displayFoodLogs,
      dailyTargets: {
        calories: todayPlan.daily_targets.calories,
        protein_g: todayPlan.daily_targets.protein_g,
        fat_g: todayPlan.daily_targets.fat_g,
        carbs_g: todayPlan.daily_targets.carbs_g,
      },
      profile,
      previousDayBank,
      persistedTodayBank: calorieBank,
    })
    return applyCalorieBankUserPrefs(raw, userPrefs, calorieFloorFromGender(profile.gender))
  }, [profile, displayFoodLogs, todayPlan.daily_targets, previousDayBank, calorieBank, userPrefs])

  const displayCalorieBank = useMemo(
    () => (isCalorieBankEnabled(userPrefs) ? effectiveCalorieBank : null),
    [effectiveCalorieBank, userPrefs]
  )

  const waterTargetMl = useMemo(
    () =>
      resolveDailyWaterGoalMl({
        planWaterMl: todayPlan.daily_targets.water_ml,
        profileWaterMlTarget: profile?.water_ml_target,
      }),
    [todayPlan.daily_targets.water_ml, profile?.water_ml_target]
  )

  useEffect(() => {
    const today = getNutritionDayKey()
    const logs = userMemoryRef.current.food_logs_today ?? []
    const filtered = filterFoodLogsForNutritionDay(logs, today)
    if (filtered.length === logs.length) return
    if (filtered.length === 0) {
      clearFoodLogsSessionCache(today)
      clearTodayOfflineSnapshot()
    }
    const nextMemory = { ...userMemoryRef.current, food_logs_today: filtered }
    userMemoryRef.current = nextMemory
    writeFoodCache(filtered)
    startTransition(() => setUserMemory(nextMemory))
  }, [writeFoodCache])

  useEffect(() => {
    const applyNutritionDayRollover = (nextDay: string) => {
      clearFoodLogsSessionCache(nextDay)
      clearTodayOfflineSnapshot()

      const emptyMemory: UserMemoryMeta = {
        ...userMemoryRef.current,
        food_logs_today: [],
      }
      userMemoryRef.current = emptyMemory
      startTransition(() => {
        setUserMemory(emptyMemory)
        setTrackedDayKey(nextDay)
        setWaterMl(0)
        setCalorieBank(null)
      })
      waterMlRef.current = 0
      calorieBankSyncedRef.current = false
      didSessionHydrateRef.current = false
      didLocalReconcileRef.current = false
      router.refresh()
    }

    const checkRollover = () => {
      const today = getNutritionDayKey()
      if (today === trackedDayKey) return
      applyNutritionDayRollover(today)
    }

    checkRollover()
    const interval = window.setInterval(checkRollover, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkRollover()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [trackedDayKey, router])

  const intakeSummary = useMemo(() => {
    const caloriesLogged = sumLoggedCalories(displayFoodLogs)
    const proteinLogged = sumLoggedProtein(displayFoodLogs)
    const normalTarget = todayPlan.daily_targets.calories
    const proteinTarget = todayPlan.daily_targets.protein_g
    const dayState = computeTodayMealState({
      todayFoodLogs: displayFoodLogs,
      normalTargetKcal: normalTarget,
      internalTargetKcal: effectiveCalorieBank?.internal_target_kcal,
      proteinTargetG: proteinTarget,
      fatTargetG: todayPlan.daily_targets.fat_g,
      carbsTargetG: todayPlan.daily_targets.carbs_g,
      calorieBank: effectiveCalorieBank,
    })
    const recoveryActive = isRecoveryActive(effectiveCalorieBank ?? { recovery_balance_kcal: 0, spread_days_remaining: 0 })
    const excessDriver = resolveDailyExcessDriver(
      {
        kcal: caloriesLogged,
        protein_g: proteinLogged,
        fat_g: sumLoggedFat(displayFoodLogs),
        carbs_g: sumLoggedCarbs(displayFoodLogs),
      },
      {
        kcal: normalTarget,
        protein_g: proteinTarget,
        fat_g: todayPlan.daily_targets.fat_g ?? 0,
        carbs_g: todayPlan.daily_targets.carbs_g ?? 0,
      }
    )
    return {
      caloriesLogged,
      proteinLogged,
      caloriesTarget: dayState.todayTarget,
      proteinTarget,
      overTarget: dayState.overTargetProtection,
      recoveryActive,
      excessDriver,
      remainingCalories: dayState.remainingCalories,
      proteinGap: dayState.proteinGap,
      effectiveMealCalTarget: dayState.effectiveMealCalTarget,
      allowDiceAndSuggest: dayState.allowDiceAndSuggest,
    }
  }, [displayFoodLogs, todayPlan.daily_targets, effectiveCalorieBank])

  useEffect(() => {
    if (!onDashboard) return
    const openRecord = () => {
      setRecordTargetDate(getNutritionDayKey())
      setRecordTargetSlot(undefined)
      setRecordCaptureSource('global')
      setRecordSheetOpen(true)
    }
    window.addEventListener(TODAY_OPEN_RECORD_SHEET_EVENT, openRecord)
    return () => window.removeEventListener(TODAY_OPEN_RECORD_SHEET_EVENT, openRecord)
  }, [onDashboard])

  useEffect(() => {
    if (!onDashboard) return
    if (todaySheetFromSearch(searchString) !== 'record') {
      recordUrlHandledRef.current = false
      return
    }
    if (recordUrlHandledRef.current) return
    const context = todayActionContextFromSearch(searchString)
    const pendingContext = takePendingCaptureContext()
    const source =
      context?.source === 'record' || pendingContext?.source === 'record' ? 'record' : 'global'
    const requestedTargetDate = context?.targetDate ?? pendingContext?.targetDate
    if (source === 'record' && !requestedTargetDate) {
      traceRecordDate('record-entry-rejected', {
        targetDate: null,
        targetMealSlot: context?.targetMealSlot ?? pendingContext?.targetMealSlot,
        reason: 'missing-target-date',
      })
      toast.error('所選日期已遺失，未儲存餐點。請返回記錄頁重試。')
      clearTodaySheetParams()
      recordUrlHandledRef.current = true
      return
    }
    const targetDate = requestedTargetDate ?? getNutritionDayKey()
    const targetSlot = foodSlotForCaptureLabel(
      context?.targetMealSlot ?? pendingContext?.targetMealSlot
    )
    traceRecordDate('dashboard-record-context', {
      targetDate,
      targetMealSlot: context?.targetMealSlot ?? pendingContext?.targetMealSlot,
    })
    recordUrlHandledRef.current = true
    const timer = window.setTimeout(() => {
      setRecordTargetDate(targetDate)
      setRecordTargetSlot(targetSlot)
      setRecordCaptureSource(source)
      setRecordSheetOpen(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [onDashboard, searchString])

  const handleMealUiState = useCallback(
    (state: {
      hasDicePreview: boolean
      rolling: boolean
      confirming: boolean
      allowDiceAndSuggest: boolean
    }) => {
      setMealUiState(prev => {
        if (
          prev.hasDicePreview === state.hasDicePreview &&
          prev.rolling === state.rolling &&
          prev.confirming === state.confirming &&
          prev.allowDiceAndSuggest === state.allowDiceAndSuggest
        ) {
          return prev
        }
        return state
      })
    },
    []
  )

  const handlePrimaryMealAction = useCallback(() => {
    if (mealUiState.hasDicePreview) {
      dispatchConfirmDice()
      return
    }
    if (displayFoodLogs.length === 0) {
      setRecordSheetOpen(true)
      return
    }
    dispatchRollDice()
  }, [mealUiState.hasDicePreview, displayFoodLogs.length])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const timer = window.setTimeout(() => {
      if (shouldShowDay1Guide()) setShowDay1Guide(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('welcome') !== '1') return
    const timer = window.setTimeout(() => {
      markDay1GuidePending()
      setShowDay1Guide(true)
      toast.message('計畫已就緒。先從今天第一餐開始就好。')
      window.history.replaceState({}, '', '/dashboard')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const persist = useCallback(
    (patch: CheckinUiPatch): boolean => {
      if (!syncUserId) {
        toast.error('登入狀態尚未就緒，這次變更無法安全儲存')
        return false
      }

      const payload: CheckinMutationPayload = {
        weekly_plan_id: weeklyPlanId,
      }
      const notesPatch: NonNullable<CheckinMutationPayload['notes_patch']> = {}
      if (patch.workoutItems !== undefined) payload.workout_items = patch.workoutItems
      if (patch.waterMl !== undefined) payload.water_ml = patch.waterMl
      if (patch.userMemory !== undefined) {
        notesPatch.user_memory = userMemoryForPersist(patch.userMemory)
      }
      if (patch.dailyRolls !== undefined) notesPatch.daily_rolls = patch.dailyRolls
      if (patch.mealSuggest !== undefined) notesPatch.meal_suggest = patch.mealSuggest
      if (patch.customEatOut !== undefined) notesPatch.custom_eat_out = patch.customEatOut
      if (Object.keys(notesPatch).length > 0) payload.notes_patch = notesPatch

      const result = enqueueCheckinMutation({
        userId: syncUserId,
        nutritionDate: trackedDayKey,
        payload,
      })
      if (!result.durable) {
        const now = Date.now()
        if (now - persistErrorToastAtRef.current > 8000) {
          persistErrorToastAtRef.current = now
          toast.error('無法安全儲存在此裝置，請保持頁面開啟並稍後重試')
        }
        return false
      }

      requestOfflineMutationReplay(syncUserId)
      return true
    },
    [syncUserId, trackedDayKey, weeklyPlanId]
  )

  useEffect(() => {
    if (syncUserId) requestOfflineMutationReplay(syncUserId)
  }, [syncUserId, trackedDayKey])

  useEffect(() => {
    const onConfirmed = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          entry?: OfflineMutationEntry
          calorieBank?: CalorieBankRow | null
        }>
      ).detail
      const entry = detail?.entry
      if (
        !entry ||
        entry.userId !== syncUserId ||
        entry.nutritionDate !== trackedDayKey
      ) {
        return
      }
      if (entry.payload.notes_patch?.user_memory?.food_logs_today !== undefined) {
        clearFoodLogsSessionCache(entry.nutritionDate)
        writeFoodCache(userMemoryRef.current.food_logs_today ?? [])
      }
      if (entry.payload.workout_items !== undefined) {
        writeWorkoutItemsSessionCache(
          workoutItemsRef.current,
          entry.nutritionDate
        )
      }
      if (detail.calorieBank) setCalorieBank(detail.calorieBank)
      invalidateMealMutation(entry.userId)
    }
    window.addEventListener(OFFLINE_MUTATION_CONFIRMED_EVENT, onConfirmed)
    return () =>
      window.removeEventListener(OFFLINE_MUTATION_CONFIRMED_EVENT, onConfirmed)
  }, [syncUserId, trackedDayKey, writeFoodCache])

  const commitWaterMl = useCallback(
    (nextMl: number) => {
      waterMlRef.current = nextMl
      startTransition(() => setWaterMl(nextMl))
      persist({ waterMl: nextMl })
    },
    [persist]
  )

  const handleAddWater = useCallback(
    (deltaMl: number) => {
      const result = addWaterMl(waterMlRef.current, deltaMl)
      if (!result.ok) {
        toast.message('喝水量不能為負數')
        return
      }
      commitWaterMl(result.value)
    },
    [commitWaterMl]
  )

  const handleSetWater = useCallback(
    (totalMl: number) => {
      const result = applyWaterTotal(totalMl)
      if (!result.ok) {
        toast.message('喝水量不能為負數')
        return
      }
      commitWaterMl(result.value)
    },
    [commitWaterMl]
  )

  const handleResetWater = useCallback(() => {
    commitWaterMl(resetWaterMl())
  }, [commitWaterMl])

  const handleLogFood = useCallback((
    logs: FoodLogEntry[],
    nextMemory: UserMemoryMeta,
    context: Required<Pick<FoodCaptureContext, 'targetDate'>> & FoodCaptureContext
  ) => {
    if (!isLocalDateKey(context.targetDate)) {
      traceRecordDate('dashboard-mutation-rejected', {
        targetDate: context.targetDate,
        targetMealSlot: context.targetMealSlot,
        reason: 'invalid-target-date',
      })
      toast.error('所選日期已遺失，未儲存餐點。請返回記錄頁重試。')
      return
    }
    const candidate = [...logs].reverse().find(log => log.id)
    traceRecordDate('dashboard-mutation-received', {
      targetDate: context.targetDate,
      targetMealSlot: context.targetMealSlot,
      captureTargetDate: context.targetDate,
      nutritionDate: context.targetDate,
      loggedAt: candidate?.logged_at,
      loggedAtLocalDate: candidate
        ? getNutritionDayKey(new Date(candidate.logged_at))
        : null,
      mealSlot: candidate?.slot,
      foodLogId: candidate?.id,
    })
    if (context.targetDate !== trackedDayKey) {
      const incoming = filterFoodLogsForNutritionDay(logs, context.targetDate)
      if (incoming.length === 0) {
        traceRecordDate('dashboard-mutation-rejected', {
          targetDate: context.targetDate,
          targetMealSlot: context.targetMealSlot,
          reason: 'no-log-for-target-date',
        })
        toast.error('餐點日期與所選日期不一致，已停止儲存')
        return
      }
      for (const log of incoming) {
        historicalLogDatesRef.current.set(log.id, context.targetDate)
      }
      void patchFoodLogsForDate(
        context.targetDate,
        existing => mergeCapturedFoodLogsForDate(existing, incoming, context.targetDate),
        null
      ).catch(() => toast.error('歷史餐點暫時無法儲存，請再試一次'))
      return
    }

    userMemoryRef.current = nextMemory
    writeFoodCache(logs)
    startTransition(() => setUserMemory(nextMemory))
    persist({ userMemory: nextMemory })
  }, [persist, trackedDayKey, writeFoodCache])

  useEffect(() => {
    if (didLocalReconcileRef.current) return
    didLocalReconcileRef.current = true
    const logs = userMemoryRef.current.food_logs_today ?? []
    const reconciled = reconcileFoodLogsToday(logs)
    if (!foodLogsNeedSync(logs, reconciled)) return
    const nextMemory = { ...userMemoryRef.current, food_logs_today: reconciled }
    userMemoryRef.current = nextMemory
    writeFoodCache(reconciled)
    startTransition(() => setUserMemory(nextMemory))
  }, [writeFoodCache])

  useEffect(() => {
    if (didSessionHydrateRef.current) return
    didSessionHydrateRef.current = true
    const serverFp = foodLogIdsFingerprint(initialFoodLogs)
    const localFp = foodLogIdsFingerprint(userMemoryRef.current.food_logs_today ?? [])
    if (!syncUserId || serverFp === localFp) return
    persist({ userMemory: userMemoryRef.current })
  }, [initialFoodLogs, persist, syncUserId])

  useEffect(() => {
    const reconciled = reconcileWorkoutItems(workoutItemsRef.current, planExerciseList)
    if (!workoutItemsNeedSync(workoutItemsRef.current, reconciled)) return
    workoutItemsRef.current = reconciled
    setWorkoutItems(reconciled)
    writeWorkoutItemsSessionCache(reconciled)
  }, [planExerciseKey, planExerciseList])

  const handleClearMealSelection = useCallback((mealType: MealType) => {
    const nextCustom = { ...customEatOutRef.current }
    delete nextCustom[mealType]
    const nextSuggest = { ...mealSuggestRef.current }
    delete nextSuggest[mealType]
    customEatOutRef.current = nextCustom
    mealSuggestRef.current = nextSuggest
    startTransition(() => {
      setCustomEatOut(nextCustom)
      setMealSuggest(nextSuggest)
    })
    persist({ customEatOut: nextCustom, mealSuggest: nextSuggest })
  }, [persist])

  const handleDiceApply = useCallback((payload: {
    mealType: MealType
    selection: CustomEatOutSelection[]
    dailyRolls: DailyRollState
    mealSuggest: Partial<Record<MealType, MealSuggestState>>
    userMemory: UserMemoryMeta
    logEntry: FoodLogEntry
    targetDate: string
  }) => {
    if (payload.targetDate !== trackedDayKey) {
      historicalLogDatesRef.current.set(payload.logEntry.id, payload.targetDate)
      void patchFoodLogsForDate(
        payload.targetDate,
        logs => mergeCapturedFoodLogsForDate(logs, [payload.logEntry], payload.targetDate),
        null
      ).catch(() => toast.error('歷史餐點暫時無法儲存，請再試一次'))
      return
    }
    userMemoryRef.current = payload.userMemory
    dailyRollsRef.current = payload.dailyRolls
    mealSuggestRef.current = payload.mealSuggest
    setCustomEatOut(prev => {
      const nextCustom = { ...prev, [payload.mealType]: payload.selection }
      customEatOutRef.current = nextCustom
      persist({
        customEatOut: nextCustom,
        dailyRolls: payload.dailyRolls,
        mealSuggest: payload.mealSuggest,
        userMemory: payload.userMemory,
      })
      return nextCustom
    })
    startTransition(() => {
      setDailyRolls(payload.dailyRolls)
      setMealSuggest(payload.mealSuggest)
      setUserMemory(payload.userMemory)
    })
  }, [persist, trackedDayKey])

  const toggleExercise = useCallback((exerciseId: string) => {
    startTransition(() => {
      const updated = workoutItems.map(w =>
        w.exercise_id === exerciseId ? { ...w, completed: !w.completed } : w
      )
      workoutItemsRef.current = updated
      setWorkoutItems(updated)
      writeWorkoutItemsSessionCache(updated)
      persist({ workoutItems: updated })
    })
  }, [persist, workoutItems])

  const isRestDay = exercises.length === 0
  const deleteLogRef = useRef<(id: string) => void>(() => {})
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const handleDeleteLog = useCallback((id: string) => {
    setDeleteConfirmId(id)
  }, [])
  const registerDeleteLog = useCallback((handler: (id: string) => void) => {
    deleteLogRef.current = handler
  }, [])
  const confirmDeleteLog = useCallback(() => {
    if (!deleteConfirmId) return
    deleteLogRef.current(deleteConfirmId)
    setDeleteConfirmId(null)
  }, [deleteConfirmId])

  const [confirmLog, setConfirmLog] = useState<FoodLogEntry | null>(null)
  const [editLog, setEditLog] = useState<FoodLogEntry | null>(null)
  const [pendingQueueOpen, setPendingQueueOpen] = useState(false)

  const editLogLive = useMemo(() => {
    if (!editLog) return null
    return displayFoodLogs.find(l => l.id === editLog.id) ?? editLog
  }, [editLog, displayFoodLogs])

  const confirmLogLive = useMemo(() => {
    if (!confirmLog) return null
    return displayFoodLogs.find(l => l.id === confirmLog.id) ?? confirmLog
  }, [confirmLog, displayFoodLogs])

  const pendingLogs = useMemo(() => filterPendingNutritionLogs(displayFoodLogs), [displayFoodLogs])

  const patchFoodLog = useCallback(
    (logId: string, patch: Partial<FoodLogEntry>) => {
      const historicalDate = historicalLogDatesRef.current.get(logId)
      if (historicalDate) {
        const applyPatch = (log: FoodLogEntry) =>
          log.id === logId ? enrichFoodLog({ ...log, ...patch }) : log
        setConfirmLog(current => (current ? applyPatch(current) : current))
        setEditLog(current => (current ? applyPatch(current) : current))
        void patchFoodLogsForDate(
          historicalDate,
          logs => logs.map(applyPatch),
          null
        ).catch(() => toast.error('歷史餐點更新失敗，請再試一次'))
        return
      }
      const nextLogs = displayFoodLogs.map(l => {
        if (l.id !== logId) return l
        return enrichFoodLog({ ...l, ...patch })
      })
      handleLogFood(
        nextLogs,
        { ...userMemory, food_logs_today: nextLogs },
        { targetDate: trackedDayKey }
      )
    },
    [displayFoodLogs, userMemory, handleLogFood, trackedDayKey]
  )

  const openNutritionConfirmation = useCallback((log: FoodLogEntry) => {
    setConfirmLog(log)
    enqueueUnknownFromLog(log)
  }, [])

  useEffect(() => {
    for (const log of pendingLogs) {
      enqueueUnknownFromLog(log)
    }
  }, [pendingLogs])

  const handleConfirmVerified = useCallback(
    (hit: MenuLookupHit) => {
      if (!confirmLogLive) return
      patchFoodLog(confirmLogLive.id, hitToFoodLogPatch(hit))
      toast.message('已更新為可信營養資料')
      setConfirmLog(null)
    },
    [confirmLogLive, patchFoodLog]
  )

  const handleManualNutritionSave = useCallback(
    (logId: string, input: ManualNutritionInput) => {
      const log = displayFoodLogs.find(l => l.id === logId) ?? confirmLogLive
      if (!log) return
      patchFoodLog(logId, applyManualNutritionToLog(log, input))
      toast.message('已儲存營養資料', { description: '標記為手動記錄，已計入今日統計。' })
      setConfirmLog(null)
    },
    [displayFoodLogs, confirmLogLive, patchFoodLog]
  )

  const handleEditMealSave = useCallback(
    (logId: string, draft: HomeCookedMealDraft) => {
      const log = displayFoodLogs.find(l => l.id === logId) ?? editLogLive
      if (!log) return
      const totals = calculateHomeCookedMeal(draft)
      if (!totals) {
        toast.error('請至少填一項食材重量')
        return
      }
      patchFoodLog(logId, applyHomeCookedTotalsToLog(log, draft, totals))
      toast.message('已更新餐點，今日狀態已重新計算。')
      setEditLog(null)
    },
    [displayFoodLogs, editLogLive, patchFoodLog]
  )

  const handleEditFoodRecordSave = useCallback(
    (logId: string, item: CommonFoodItem, draft: FoodRecordDraft) => {
      const log = displayFoodLogs.find(l => l.id === logId) ?? editLogLive
      if (!log) return
      patchFoodLog(logId, patchFoodRecordOnLog(log, item, draft))
      toast.message('已更新餐點，今日狀態已重新計算。')
      setEditLog(null)
    },
    [displayFoodLogs, editLogLive, patchFoodLog]
  )

  const handleEditManualSave = useCallback(
    (logId: string, input: ManualNutritionInput) => {
      const log = displayFoodLogs.find(l => l.id === logId) ?? editLogLive
      if (!log) return
      patchFoodLog(logId, applyManualNutritionToLog(log, input))
      toast.message('已更新餐點，今日狀態已重新計算。')
      setEditLog(null)
    },
    [displayFoodLogs, editLogLive, patchFoodLog]
  )

  const handleFoodRecordConfirmSave = useCallback(
    (logId: string, item: CommonFoodItem, draft: FoodRecordDraft) => {
      const log = displayFoodLogs.find(l => l.id === logId) ?? confirmLogLive
      if (!log) return
      const patch = patchFoodRecordOnLog(log, item, draft)
      patchFoodLog(logId, patch)
      toast.message('已依份量估算營養', {
        description: `${patch.calories ?? 0} kcal · 蛋白質 ${patch.protein_g ?? 0}g`,
      })
      setConfirmLog(null)
    },
    [displayFoodLogs, confirmLogLive, patchFoodLog]
  )

  const handleHomeCookedSave = useCallback(
    (logId: string, draft: HomeCookedMealDraft) => {
      const log = displayFoodLogs.find(l => l.id === logId) ?? confirmLogLive
      if (!log) return
      const totals = calculateHomeCookedMeal(draft)
      if (!totals) {
        toast.error('請至少填一項食材重量')
        return
      }
      patchFoodLog(logId, applyHomeCookedTotalsToLog(log, draft, totals))
      toast.message('已依重量估算營養', {
        description: `${totals.calories} kcal · 蛋白質 ${totals.protein_g}g`,
      })
      setConfirmLog(null)
    },
    [displayFoodLogs, confirmLogLive, patchFoodLog]
  )

  const handleKeepTextRecord = useCallback((_logId: string) => {
    setConfirmLog(null)
  }, [])

  const handleMoveLogSlot = useCallback(
    (logId: string, slot: FoodSlot) => {
      const nextLogs = moveTodayMealLogSlot(userMemory.food_logs_today ?? [], logId, slot)
      handleLogFood(
        nextLogs,
        { ...userMemory, food_logs_today: nextLogs },
        { targetDate: trackedDayKey }
      )
      toast.message('已移動餐點')
    },
    [handleLogFood, trackedDayKey, userMemory]
  )

  return (
    <>
      <TodayV2Dashboard
        caloriesLogged={intakeSummary.caloriesLogged}
        caloriesTarget={intakeSummary.caloriesTarget}
        proteinLogged={intakeSummary.proteinLogged}
        proteinTarget={intakeSummary.proteinTarget}
        carbsTarget={todayPlan.daily_targets.carbs_g}
        fatTarget={todayPlan.daily_targets.fat_g}
        remainingCalories={intakeSummary.remainingCalories}
        effectiveMealCalTarget={intakeSummary.effectiveMealCalTarget}
        proteinGap={intakeSummary.proteinGap}
        overTarget={intakeSummary.overTarget}
        calorieBank={displayCalorieBank}
        excessDriver={intakeSummary.excessDriver}
        calorieFloor={calorieFloorFromGender(profile?.gender)}
        onCalorieBankPreferencesChange={setUserPrefs}
        day1Guide={
          showDay1Guide && onDashboard ? (
            <Day1GuideBanner
              onDismiss={() => {
                dismissDay1Guide()
                setShowDay1Guide(false)
              }}
            />
          ) : undefined
        }
        foodLogs={displayFoodLogs}
        hasDicePreview={mealUiState.hasDicePreview}
        mealActionsLoading={mealUiState.rolling || mealUiState.confirming}
        rerollDisabled={mealUiState.rolling || mealUiState.confirming || !mealUiState.allowDiceAndSuggest}
        textPhotoDisabled={mealUiState.rolling || mealUiState.confirming}
        onPrimaryMealAction={onDashboard ? handlePrimaryMealAction : undefined}
        onTextLog={onDashboard ? dispatchOpenTextLogSheet : undefined}
        onPhotoLog={onDashboard ? dispatchOpenPhotoSheet : undefined}
        onReroll={onDashboard ? dispatchRollDice : undefined}
        showReroll={mealUiState.hasDicePreview}
        onMoveLog={handleMoveLogSlot}
        onEditLog={setEditLog}
        onDeleteLog={handleDeleteLog}
        onOpenPendingQueue={() => setPendingQueueOpen(true)}
        interstitial={
          onDashboard ? (
            <TodayOS
              key={`today-os:${(userPrefs?.diet_extras?.diet_restrictions ?? []).join(',')}:${(userPrefs?.diet_extras?.blocked_foods ?? []).join(',')}`}
              todayPlan={todayPlan}
              profile={profile}
              userPreferences={userPrefs}
              goalSnapshot={goalSnapshot}
              userMemory={displayUserMemory}
              foodDna={userMemory.food_dna ?? foodDna}
              dayOfWeek={dayOfWeek}
              recentMissedDays={recentMissedDays}
              recentFoodLogs={recentFoodLogs}
              dailyRolls={dailyRolls}
              mealSuggest={mealSuggest}
              customEatOut={customEatOut}
              dayIndex={dayIndex}
              workoutDone={workoutDone}
              workoutTotal={workoutItems.length}
              calorieBank={effectiveCalorieBank}
              onLogFood={handleLogFood}
              onClearMealSelection={handleClearMealSelection}
              onPostureLine={setPostureLine}
              onDiceApply={handleDiceApply}
              registerDeleteLog={registerDeleteLog}
              onOpenNutritionConfirmation={openNutritionConfirmation}
              onMealUiState={handleMealUiState}
            />
          ) : undefined
        }
      />

      {onDashboard ? (
      <div className="px-5 pb-6 max-w-[640px] mx-auto space-y-6" style={{ fontFamily: TODAY.font }}>
        <TodayWaterLog
          loggedMl={waterMl}
          targetMl={waterTargetMl}
          onAdd={handleAddWater}
          onSetTotal={handleSetWater}
          onReset={handleResetWater}
        />

        {isPending && (
          <p className="text-center text-[11px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>{zaijian.saving}</p>
        )}

        {todayPlan.workout && isRestDay ? (
          <BBCard padding="20px 24px">
            <p className="text-[16px]" style={{ color: TODAY.text, fontWeight: 500 }}>
              {todayPlan.workout.type_zh || '今日休息'}
            </p>
            <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
              今天不安排主訓練，好好恢復。想動的話可以輕度伸展。
            </p>
          </BBCard>
        ) : null}

        {todayPlan.workout && !isRestDay ? (
          <BBCard className="overflow-hidden" padding={0}>
            <button
              type="button"
              className="w-full p-6 flex items-start justify-between gap-4 text-left"
              onClick={() => setExpandedWorkout(!expandedWorkout)}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[16px]" style={{ color: TODAY.text, fontWeight: 500 }}>
                  {todayPlan.workout.type_zh}
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                  約 {todayPlan.workout.estimated_duration_mins} 分鐘
                  {todayPlan.workout.calories_burned_est > 0 && ` · 預估 ${todayPlan.workout.calories_burned_est} kcal`}
                </p>
                {!expandedWorkout && exercises[0] && (
                  <div className="pt-3 space-y-1" style={{ borderTop: '1px solid rgba(47, 36, 29, 0.06)' }}>
                    <p className="text-[13px] pt-3" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                      首項：{exercises[0].exercise_name_zh}
                    </p>
                    {exercises[0].sets && (
                      <p className="text-[13px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                        {formatExerciseDetail(exercises[0])}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {expandedWorkout ? (
                <ChevronUp className="h-[18px] w-[18px] shrink-0 mt-1" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.textSecondary }} />
              ) : (
                <ChevronDown className="h-[18px] w-[18px] shrink-0 mt-1" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.textSecondary }} />
              )}
            </button>
            {expandedWorkout && (
              <div className="px-6 pb-6 space-y-5" style={{ borderTop: '1px solid rgba(47, 36, 29, 0.06)' }}>
                {warmup.length > 0 && (
                  <div>
                    <p className="text-[12px] mb-3" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>熱身</p>
                    <div className="space-y-3">
                      {warmup.map(ex => (
                        <div key={`w-${ex.exercise_id}`} className="py-2">
                          <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 500 }}>{ex.exercise_name_zh}</p>
                          <p className="text-[13px] mt-0.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>{formatExerciseDetail(ex)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[12px] mb-3" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>主訓練</p>
                  <div className="space-y-4">
                    {workoutItems.map(ex => {
                      const planEx = exercises.find(e => e.exercise_id === ex.exercise_id)
                      return (
                        <div key={ex.exercise_id} className="space-y-2">
                          <div className="flex items-start gap-3">
                            <button type="button" onClick={() => toggleExercise(ex.exercise_id)} className="mt-0.5 shrink-0">
                              {ex.completed ? (
                                <CheckCircle2 className="h-5 w-5" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.mocha }} />
                              ) : (
                                <Circle className="h-5 w-5" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.textSecondary }} />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 500 }}>
                                {planEx?.exercise_name_zh ?? ex.exercise_name}
                              </p>
                              {planEx && (
                                <p className="text-[13px] mt-0.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                                  {formatExerciseDetail(planEx)}
                                </p>
                              )}
                              {planEx?.notes && (
                                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                                  {planEx.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          {(() => {
                            const verified = getVerifiedExerciseVideo(ex.exercise_id)
                            if (verified?.video_url) {
                              return (
                                <a
                                  href={verified.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 ml-8 px-3 py-1.5 text-[11px] rounded-full"
                                  style={{ backgroundColor: TODAY.pillBg, color: TODAY.mocha, fontWeight: 500 }}
                                >
                                  <Play className="h-3 w-3" strokeWidth={TODAY.iconStroke} /> 動作教學
                                </a>
                              )
                            }
                            return (
                              <p className="ml-8 text-[11px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                                {exerciseVideoPlaceholder(ex.exercise_name)}
                              </p>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {cooldown.length > 0 && (
                  <div>
                    <p className="text-[12px] mb-3" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>收操</p>
                    <div className="space-y-3">
                      {cooldown.map(ex => (
                        <div key={`c-${ex.exercise_id}`} className="py-2">
                          <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 500 }}>{ex.exercise_name_zh}</p>
                          <p className="text-[13px] mt-0.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>{formatExerciseDetail(ex)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </BBCard>
        ) : null}
      </div>
      ) : null}

      <RecordActionSheet
        open={recordSheetOpen || requestedRecordContext != null}
        targetDate={requestedRecordContext?.targetDate ?? recordTargetDate}
        targetSlot={
          foodSlotForCaptureLabel(requestedRecordContext?.targetMealSlot) ?? recordTargetSlot
        }
        captureSource={requestedRecordContext?.source ?? recordCaptureSource}
        onClose={() => {
          setRecordSheetOpen(false)
          setRecordTargetDate(getNutritionDayKey())
          setRecordTargetSlot(undefined)
          setRecordCaptureSource('global')
          clearTodaySheetParams()
        }}
      />

      <PendingNutritionQueueSheet
        open={pendingQueueOpen}
        logs={pendingLogs}
        onClose={() => setPendingQueueOpen(false)}
        onSelectLog={log => openNutritionConfirmation(log)}
      />

      <NutritionConfirmationSheet
        open={!!confirmLogLive}
        log={confirmLogLive}
        onClose={() => setConfirmLog(null)}
        onConfirmVerified={handleConfirmVerified}
        onManualSave={handleManualNutritionSave}
        onHomeCookedSave={handleHomeCookedSave}
        onFoodRecordSave={handleFoodRecordConfirmSave}
        onKeepTextRecord={handleKeepTextRecord}
      />

      <MealEditSheet
        open={!!editLogLive}
        log={editLogLive}
        onClose={() => setEditLog(null)}
        onHomeCookedSave={handleEditMealSave}
        onManualSave={handleEditManualSave}
        onFoodRecordSave={handleEditFoodRecordSave}
      />

      <AppOverlay
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        variant="dialog"
      >
        <div
          className="app-overlay-dialog-card p-6 space-y-5"
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
      </AppOverlay>
    </>
  )
}
