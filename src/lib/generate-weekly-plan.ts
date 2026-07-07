import type { SupabaseClient } from '@supabase/supabase-js'
import { format, startOfWeek, addMonths, subWeeks } from 'date-fns'
import { buildScaledHomeMeal, generateWorkoutPlan } from '@/lib/plan-engine'
import {
  calculateGoalPlan,
  calculateNutritionTargets,
  mealMacroSplit,
} from '@/lib/goal-calculator'
import { buildMealCombination, comboToSaved } from '@/lib/meal-combo-engine'
import { buildDishFirstConvenienceMealsForDay } from '@/lib/recommendation/dish-first/weekly-plan'
import { getAccessStatus } from '@/lib/subscription-access'
import { SUBSCRIPTION_ACCESS_FIELDS } from '@/lib/subscription-types'
import { withSafeModeAccess } from '@/lib/app-store-safe-mode'
import { applyWeeklyFeedback } from '@/lib/feedback-adjustments'
import {
  getLatestWeeklyFeedback,
  preserveEmbeddedWeeklyFeedback,
} from '@/lib/weekly-feedback-store'
import {
  adjustDayNutritionForWorkout,
  estimateWeeklyWorkoutBurn,
} from '@/lib/workout-nutrition'
import { getLatestActiveCalorieBank } from '@/lib/banks/calorie-bank-store'
import {
  calorieFloorFromGender,
  isRecoveryActive,
  recoveryTargetsForDayOffsets,
} from '@/lib/engines/calorie-bank-engine'
import type { Goal, UserProfile, WeeklyFeedback, WeeklyPlanData } from '@/types'

export type GenerateWeeklyPlanResult =
  | { ok: true; data: WeeklyPlanData }
  | { ok: false; error: string; code: string; status: number }

interface GenerateWeeklyPlanInput {
  userId: string
  userEmail?: string | null
  regenReason?: string | null
  profile?: UserProfile | null
  goal?: Goal | null
  /** Capacitor iOS / review build — unlock plan generation until Apple IAP ships. */
  iosNativeReview?: boolean
}

export async function generateWeeklyPlanForUser(
  supabase: SupabaseClient,
  input: GenerateWeeklyPlanInput
): Promise<GenerateWeeklyPlanResult> {
  let profile = input.profile ?? null
  let goal = input.goal ?? null
  const regenReason = input.regenReason ?? null

  if (!profile || !goal) {
    const [{ data: dbProfile }, { data: goals }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', input.userId).single(),
      supabase
        .from('goals')
        .select('*')
        .eq('user_id', input.userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1),
    ])
    profile = dbProfile as UserProfile
    goal = (goals?.[0] ?? null) as Goal | null
    if (!profile || !goal) {
      return {
        ok: false,
        error: '請先完成設定：需要體重資料與目標',
        code: profile ? 'MISSING_GOAL' : 'MISSING_PROFILE',
        status: 400,
      }
    }
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_ACCESS_FIELDS)
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const access = withSafeModeAccess(
    getAccessStatus(profile.created_at, subscription, { userEmail: input.userEmail }),
    { iosNativeReview: input.iosNativeReview }
  )
  if (!access.hasFullAccess) {
    return {
      ok: false,
      error: '試用期已結束，請訂閱以繼續生成計畫',
      code: 'SUBSCRIPTION_REQUIRED',
      status: 403,
    }
  }

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const currentWeekStart = format(weekStart, 'yyyy-MM-dd')
  const lastWeekStart = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const latestFeedback = await getLatestWeeklyFeedback(supabase, input.userId)

  const feedbackForAdjust =
    latestFeedback &&
    (latestFeedback.week_start === lastWeekStart || latestFeedback.week_start === currentWeekStart)
      ? (latestFeedback as WeeklyFeedback)
      : null

  const goalPlan = calculateGoalPlan(profile, goal)
  const baseNutrition = calculateNutritionTargets(profile, goal)
  const { nutrition, coachNoteExtra, workoutModifier } = applyWeeklyFeedback(
    baseNutrition,
    feedbackForAdjust
  )

  const usedByCategory: Record<'breakfast' | 'lunch' | 'dinner', Set<string>> = {
    breakfast: new Set(),
    lunch: new Set(),
    dinner: new Set(),
  }

  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const workout = generateWorkoutPlan(
      dayIndex,
      profile!.fitness_level || 'beginner',
      profile!.injuries || [],
      goal!.goal_type,
      profile!.equipment || [],
      workoutModifier
    )

    const dayNutrition = adjustDayNutritionForWorkout(nutrition, workout, goalPlan.dailyDeficit)

    const breakfastTargets = mealMacroSplit(dayNutrition, 'breakfast')
    const lunchTargets = mealMacroSplit(dayNutrition, 'lunch')
    const dinnerTargets = mealMacroSplit(dayNutrition, 'dinner')

    const breakfast = buildScaledHomeMeal(
      'breakfast',
      dayIndex,
      breakfastTargets.calories,
      breakfastTargets.protein,
      profile!
    )
    const lunch = buildScaledHomeMeal(
      'lunch',
      dayIndex,
      lunchTargets.calories,
      lunchTargets.protein,
      profile!
    )
    const dinner = buildScaledHomeMeal(
      'dinner',
      dayIndex,
      dinnerTargets.calories,
      dinnerTargets.protein,
      profile!
    )

    const meals = [breakfast, lunch, dinner]

    const dishMeals = buildDishFirstConvenienceMealsForDay({
      nutrition: dayNutrition,
      dayIndex,
      weekSeed: dayIndex + nutrition.dailyCalories,
    })

    const convenience_meals =
      dishMeals.length === 3
        ? dishMeals
        : (['breakfast', 'lunch', 'dinner'] as const).map(mt => {
            const t = mealMacroSplit(dayNutrition, mt)
            const combo = buildMealCombination(
              mt,
              t.calories,
              t.protein,
              dayIndex,
              profile!,
              [...usedByCategory[mt]]
            )
            if (combo.items[0]) usedByCategory[mt].add(combo.items[0].name)
            return comboToSaved(mt, combo)
          })

    const mealsTotalCalories = meals.reduce((s, m) => s + m.total_calories, 0)
    const mealsProtein = meals.reduce((s, m) => s + m.protein_g, 0)

    return {
      day: dayIndex + 1,
      date: format(new Date(weekStart.getTime() + dayIndex * 86400000), 'yyyy-MM-dd'),
      meals,
      convenience_meals,
      workout,
      daily_targets: {
        calories: dayNutrition.dailyCalories,
        protein_g: dayNutrition.proteinGrams,
        carbs_g: dayNutrition.carbsGrams,
        fat_g: dayNutrition.fatGrams,
        water_ml: Math.round((profile!.weight_kg || 70) * 35),
        exercise_burn_kcal: dayNutrition.exercise_burn_kcal,
        intake_adjustment_kcal: dayNutrition.intake_adjustment_kcal,
        net_deficit_kcal: dayNutrition.net_deficit_kcal,
      },
      meal_summary: {
        total_calories: mealsTotalCalories,
        total_protein: mealsProtein,
        target_calories: dayNutrition.dailyCalories,
        target_protein: dayNutrition.proteinGrams,
      },
    }
  })

  const activeBank = await getLatestActiveCalorieBank(supabase, input.userId)
  const calFloor = calorieFloorFromGender(profile!.gender)
  if (activeBank && isRecoveryActive(activeBank)) {
    const recoveryCals = recoveryTargetsForDayOffsets(
      nutrition.dailyCalories,
      activeBank.spread_days_remaining,
      activeBank.daily_adjust_kcal,
      calFloor,
      days.length
    )
    days.forEach((day, i) => {
      const targetCal = recoveryCals[i] ?? nutrition.dailyCalories
      if (targetCal >= day.daily_targets.calories) return
      const ratio = targetCal / day.daily_targets.calories
      day.daily_targets.calories = targetCal
      day.daily_targets.carbs_g = Math.max(0, Math.round(day.daily_targets.carbs_g * ratio))
      day.meal_summary.target_calories = targetCal
    })
  }

  const workoutBurn = estimateWeeklyWorkoutBurn(days.map(d => d.workout))
  const workoutDays = days.filter(d => d.workout.type !== 'rest').length
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const [{ data: existingPlan }, { data: maxPlan }] = await Promise.all([
    supabase
      .from('weekly_plans')
      .select('week_number, plan_data')
      .eq('user_id', input.userId)
      .eq('week_start', weekStartStr)
      .maybeSingle(),
    supabase
      .from('weekly_plans')
      .select('week_number')
      .eq('user_id', input.userId)
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  const weekNumber = existingPlan?.week_number ?? ((maxPlan?.week_number ?? 0) + 1)

  const planData = preserveEmbeddedWeeklyFeedback(existingPlan?.plan_data, {
    week_number: weekNumber,
    weekly_targets: {
      avg_daily_calories: nutrition.dailyCalories,
      avg_daily_protein_g: nutrition.proteinGrams,
      workout_days: workoutDays,
      weekly_exercise_burn_kcal: workoutBurn.totalBurn,
      avg_exercise_burn_kcal: workoutBurn.avgBurn,
    },
    goal_snapshot: {
      tdee: goalPlan.tdee,
      daily_deficit: goalPlan.dailyDeficit,
      current_body_fat: profile!.body_fat_pct,
      target_body_fat: goal!.target_body_fat_pct,
      target_weight: goal!.target_weight_kg,
      fat_to_lose_kg: goalPlan.fatToLoseKg,
      total_deficit_kcal: goalPlan.totalDeficitKcal,
      weeks_remaining: goalPlan.weeksRemaining,
      weekly_fat_loss_g: Math.round(goalPlan.weeklyChangeKg * 1000),
      lean_mass_kg: goalPlan.leanMassKg,
      weekly_exercise_burn_kcal: workoutBurn.totalBurn,
    },
    days,
    grocery_list: generateGroceryList(days),
    coach_note:
      (regenReason ? `【已依最新數據重算】${regenReason}\n\n` : '') +
      buildCoachNote(profile!, goal!, goalPlan, nutrition, workoutBurn) +
      (coachNoteExtra ? `\n\n${coachNoteExtra}` : ''),
  }) as WeeklyPlanData

  const { error: upsertError } = await supabase.from('weekly_plans').upsert(
    {
      user_id: input.userId,
      week_start: weekStartStr,
      week_number: weekNumber,
      plan_data: planData,
      coach_note: planData.coach_note,
      generation_status: 'completed',
    },
    { onConflict: 'user_id,week_start' }
  )

  if (upsertError) {
    return {
      ok: false,
      error: 'Failed to save plan',
      code: 'SAVE_FAILED',
      status: 500,
    }
  }

  return { ok: true, data: planData }
}

function generateGroceryList(days: { meals: { items: { name_zh: string }[] }[] }[]) {
  const items = new Set<string>()
  days.forEach(day => {
    day.meals.forEach(meal => meal.items.forEach(item => items.add(item.name_zh)))
  })
  const all = Array.from(items)
  return [
    { category: '蛋白質', items: all.filter(i => /雞|牛|鮭|蝦|蛋|豆腐/.test(i)) },
    { category: '碳水', items: all.filter(i => /飯|地瓜|燕麥|吐司/.test(i)) },
    { category: '蔬菜', items: all.filter(i => /花椰|菠菜/.test(i)) },
  ].filter(c => c.items.length > 0)
}

function buildCoachNote(
  profile: UserProfile,
  goal: Goal,
  goalPlan: ReturnType<typeof calculateGoalPlan>,
  nutrition: ReturnType<typeof calculateNutritionTargets>,
  workoutBurn: ReturnType<typeof estimateWeeklyWorkoutBurn>
) {
  const weekPhrase = goalPlan.coachSummary?.replace(/TDEE|赤字|kcal/gi, '').trim() || '本週照著吃就好。'
  let note = `本週重點：${weekPhrase}\n\n`
  note += `每日目標 ${nutrition.dailyCalories} kcal、蛋白質 ${nutrition.proteinGrams}g。\n`
  if (workoutBurn.totalBurn > 0) {
    note += `本週運動預估消耗約 ${workoutBurn.totalBurn} kcal（${workoutBurn.activeDays} 天），運動日已自動調整攝取量，維持淨赤字。\n`
  }
  note += `照著每天的餐與運動做就好。不喜歡可以換同熱量組合。\n`
  if (goalPlan.projectedEndDate) {
    note += `照這個節奏，${goalPlan.projectedEndDate} 前會慢慢靠近目標。\n`
  }
  if (profile.injuries?.length) {
    note += `\n受傷的話動作有調整過：${profile.injuries.join('、')}。不舒服就休息。`
  }
  return note
}
