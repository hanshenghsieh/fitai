import type { UserProfile, Goal } from '@/types'
import { convenienceStoreMenu } from './convenience-store-menu'

// TDEE 計算
export function calculateTDEE(profile: UserProfile): number {
  if (!profile.weight_kg || !profile.height_cm || !profile.age) return 2200

  // Mifflin-St Jeor formula for BMR
  const isMale = profile.gender === 'male'
  const bmr = isMale
    ? 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5
    : 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 161

  // Activity multipliers
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }

  const multiplier = activityMultipliers[profile.activity_level] || 1.55
  return Math.round(bmr * multiplier)
}

// 營養目標計算
export interface NutritionTargets {
  dailyCalories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

export function calculateNutritionTargets(
  profile: UserProfile,
  goal: Goal
): NutritionTargets {
  const tdee = calculateTDEE(profile)
  let dailyCalories = tdee

  // 根據目標調整熱量缺口/盈餘
  if (goal.goal_type === 'lose_fat' || goal.goal_type === 'lose_weight') {
    // 減脂：每天缺口 500-750 kcal = 每週減 0.5-0.75 kg
    // 3個月減 5.6kg 脂肪 ≈ 每天缺口 645 kcal
    dailyCalories = Math.round(tdee - 650)
  } else if (goal.goal_type === 'gain_muscle') {
    // 增肌：每天盈餘 300-500 kcal
    dailyCalories = Math.round(tdee + 400)
  }
  // maintain 和 body_recomp 用 TDEE

  // 蛋白質：減脂 2.2-2.4g/kg，增肌 1.8-2.2g/kg，維持 1.6-2.0g/kg
  let proteinPerKg = 1.8
  if (goal.goal_type === 'lose_fat' || goal.goal_type === 'lose_weight') {
    proteinPerKg = 2.3
  } else if (goal.goal_type === 'gain_muscle') {
    proteinPerKg = 2.0
  }
  const proteinGrams = Math.round((profile.weight_kg || 70) * proteinPerKg)

  // 脂肪：熱量的 25-35%
  const fatGrams = Math.round((dailyCalories * 0.3) / 9)

  // 碳水：剩餘熱量
  const carbsGrams = Math.round(
    (dailyCalories - proteinGrams * 4 - fatGrams * 9) / 4
  )

  return {
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
  }
}

// 便利店菜單篩選
export function selectConvenienceItemForMeal(
  mealType: 'breakfast' | 'lunch' | 'dinner',
  targetCalories: number,
  targetProtein: number,
  excludeStore?: string
) {
  let items = convenienceStoreMenu.filter(
    item =>
      item.category === mealType &&
      (!excludeStore || item.store !== excludeStore)
  )

  // 找最接近目標熱量且蛋白質最高的
  let best = items[0]
  let bestScore = Infinity

  for (const item of items) {
    const caloriesDiff = Math.abs(item.calories - targetCalories)
    const proteinScore = Math.max(0, targetProtein - item.protein_g) * 2 // 蛋白質不足懲罰加倍

    const score = caloriesDiff + proteinScore
    if (score < bestScore) {
      bestScore = score
      best = item
    }
  }

  return best
}

// 生成每日菜單（自己煮用虛擬菜單）
export interface DayMeal {
  type: 'breakfast' | 'lunch' | 'dinner'
  type_zh: string
  name_zh: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  items: any[]
  total_calories: number
}

const cookMealDatabase = {
  breakfast: [
    {
      name_zh: '雞蛋 + 吐司',
      items: [
        {
          id: '1',
          name: 'Eggs',
          name_zh: '雞蛋',
          calories: 160,
          protein_g: 14,
          carbs_g: 2,
          fat_g: 12,
          portion: '2個',
          preparation: '炒',
          portionDesc: '約麻將牌大小',
        },
        {
          id: '2',
          name: 'Toast',
          name_zh: '吐司',
          calories: 120,
          protein_g: 5,
          carbs_g: 20,
          fat_g: 2,
          portion: '2片',
          preparation: '烤',
          portionDesc: '標準切片吐司',
        },
      ],
      calories: 280,
      protein_g: 19,
      carbs_g: 22,
      fat_g: 14,
    },
    {
      name_zh: '燕麥 + 香蕉',
      items: [
        {
          id: 'b1a',
          name: 'Oatmeal',
          name_zh: '燕麥',
          calories: 150,
          protein_g: 5,
          carbs_g: 27,
          fat_g: 3,
          portion: '50g',
          preparation: '煮',
          portionDesc: '即食燕麥片',
        },
        {
          id: 'b1b',
          name: 'Banana',
          name_zh: '香蕉',
          calories: 105,
          protein_g: 1,
          carbs_g: 27,
          fat_g: 0,
          portion: '1根',
          preparation: '生',
          portionDesc: '中等大小',
        },
      ],
      calories: 255,
      protein_g: 6,
      carbs_g: 54,
      fat_g: 3,
    },
    {
      name_zh: '優格 + 麥片',
      items: [
        {
          id: 'b2a',
          name: 'Yogurt',
          name_zh: '優格',
          calories: 100,
          protein_g: 10,
          carbs_g: 8,
          fat_g: 3,
          portion: '100g',
          preparation: '-',
          portionDesc: '原味優格',
        },
        {
          id: 'b2b',
          name: 'Granola',
          name_zh: '麥片',
          calories: 120,
          protein_g: 3,
          carbs_g: 20,
          fat_g: 4,
          portion: '30g',
          preparation: '-',
          portionDesc: '堅果麥片',
        },
      ],
      calories: 220,
      protein_g: 13,
      carbs_g: 28,
      fat_g: 7,
    },
  ],
  lunch: [
    {
      name_zh: '雞胸肉 + 白飯',
      items: [
        {
          id: 'l1',
          name: 'Chicken',
          name_zh: '雞胸肉',
          calories: 320,
          protein_g: 55,
          carbs_g: 0,
          fat_g: 8,
          portion: '160g',
          preparation: '烤',
          portionDesc: '約一個手掌大小',
        },
        {
          id: 'l2',
          name: 'Rice',
          name_zh: '白飯',
          calories: 220,
          protein_g: 5,
          carbs_g: 50,
          fat_g: 1,
          portion: '1碗',
          preparation: '煮',
          portionDesc: '標準飯碗8分滿',
        },
      ],
      calories: 540,
      protein_g: 60,
      carbs_g: 50,
      fat_g: 9,
    },
    {
      name_zh: '牛肉 + 番薯飯',
      items: [
        {
          id: 'l1b',
          name: 'Beef',
          name_zh: '牛肉',
          calories: 350,
          protein_g: 52,
          carbs_g: 0,
          fat_g: 15,
          portion: '150g',
          preparation: '炒',
          portionDesc: '里肌肉片',
        },
        {
          id: 'l2b',
          name: 'Sweet Potato',
          name_zh: '番薯飯',
          calories: 200,
          protein_g: 4,
          carbs_g: 45,
          fat_g: 1,
          portion: '150g',
          preparation: '煮',
          portionDesc: '黃色番薯',
        },
      ],
      calories: 550,
      protein_g: 56,
      carbs_g: 45,
      fat_g: 16,
    },
    {
      name_zh: '鱈魚 + 麵條',
      items: [
        {
          id: 'l1c',
          name: 'Fish',
          name_zh: '鱈魚',
          calories: 280,
          protein_g: 50,
          carbs_g: 0,
          fat_g: 6,
          portion: '150g',
          preparation: '蒸',
          portionDesc: '白肉魚',
        },
        {
          id: 'l2c',
          name: 'Noodles',
          name_zh: '麵條',
          calories: 280,
          protein_g: 8,
          carbs_g: 54,
          fat_g: 2,
          portion: '100g',
          preparation: '煮',
          portionDesc: '全麥麵條',
        },
      ],
      calories: 560,
      protein_g: 58,
      carbs_g: 54,
      fat_g: 8,
    },
  ],
  dinner: [
    {
      name_zh: '鮭魚 + 地瓜',
      items: [
        {
          id: 'd1',
          name: 'Salmon',
          name_zh: '鮭魚',
          calories: 300,
          protein_g: 42,
          carbs_g: 0,
          fat_g: 16,
          portion: '130g',
          preparation: '烤',
          portionDesc: '約信用卡大小厚度1指',
        },
        {
          id: 'd2',
          name: 'Sweet Potato',
          name_zh: '地瓜',
          calories: 120,
          protein_g: 2,
          carbs_g: 27,
          fat_g: 0,
          portion: '120g',
          preparation: '烤',
          portionDesc: '約拳頭大小',
        },
      ],
      calories: 420,
      protein_g: 44,
      carbs_g: 27,
      fat_g: 16,
    },
    {
      name_zh: '火雞胸 + 花菜',
      items: [
        {
          id: 'd1b',
          name: 'Turkey',
          name_zh: '火雞胸',
          calories: 280,
          protein_g: 48,
          carbs_g: 0,
          fat_g: 8,
          portion: '140g',
          preparation: '烤',
          portionDesc: '低脂肉類',
        },
        {
          id: 'd2b',
          name: 'Broccoli',
          name_zh: '花菜',
          calories: 55,
          protein_g: 4,
          carbs_g: 11,
          fat_g: 1,
          portion: '200g',
          preparation: '蒸',
          portionDesc: '新鮮綠花菜',
        },
      ],
      calories: 335,
      protein_g: 52,
      carbs_g: 11,
      fat_g: 9,
    },
    {
      name_zh: '蝦 + 蘆筍',
      items: [
        {
          id: 'd1c',
          name: 'Shrimp',
          name_zh: '蝦',
          calories: 250,
          protein_g: 48,
          carbs_g: 0,
          fat_g: 5,
          portion: '150g',
          preparation: '炒',
          portionDesc: '中蝦',
        },
        {
          id: 'd2c',
          name: 'Asparagus',
          name_zh: '蘆筍',
          calories: 65,
          protein_g: 5,
          carbs_g: 12,
          fat_g: 1,
          portion: '150g',
          preparation: '炒',
          portionDesc: '新鮮蘆筍',
        },
      ],
      calories: 315,
      protein_g: 53,
      carbs_g: 12,
      fat_g: 6,
    },
  ],
}

export function getHomeCookedMeal(
  mealType: 'breakfast' | 'lunch' | 'dinner',
  dayIndex: number
) {
  const meals = cookMealDatabase[mealType]
  const meal = meals[dayIndex % meals.length]

  return {
    type: mealType,
    type_zh:
      mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐',
    items: meal.items,
    total_calories: meal.calories,
    name_zh: meal.name_zh,
    calories: meal.calories,
    protein_g: meal.protein_g,
    carbs_g: meal.carbs_g,
    fat_g: meal.fat_g,
  }
}

// 運動計畫生成
export interface ExerciseSet {
  exercise_id: string
  exercise_name: string
  exercise_name_zh: string
  youtube_id: string | null
  sets: number
  reps: number | null
  duration_secs: number | null
  rest_secs: number
  notes: string
}

export function generateWorkoutPlan(
  dayIndex: number,
  fitnessLevel: string,
  injuries: string[] = [],
  goalType: string = 'lose_fat'
) {
  const hasKneeInjury = injuries.some(
    i => String(i).toLowerCase().includes('膝') || String(i).toLowerCase().includes('knee')
  )
  const hasBackInjury = injuries.some(
    i => String(i).toLowerCase().includes('腰') || String(i).toLowerCase().includes('back')
  )

  // 週期模式：減脂時 Mon/Wed/Fri 重訓，Tue/Thu/Sat 有氧，Sun 休息
  const dayOfWeek = dayIndex % 7
  const isStrengthDay = [0, 2, 4].includes(dayOfWeek) // Mon, Wed, Fri
  const isCardioDay = [1, 3, 5].includes(dayOfWeek) // Tue, Thu, Sat
  const isRestDay = dayOfWeek === 6 // Sun

  if (isRestDay) {
    return {
      type: 'rest',
      type_zh: '休息日',
      warmup: [],
      main: [],
      cooldown: [
        {
          exercise_id: 'stretch-1',
          exercise_name: 'Light Stretching',
          exercise_name_zh: '輕度伸展',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 600,
          rest_secs: 0,
          notes: '全身放鬆伸展',
        },
      ],
      estimated_duration_mins: 10,
      calories_burned_est: 50,
    }
  }

  if (isStrengthDay) {
    // 根據fitness_level調整
    const isBeginner = fitnessLevel === 'beginner'

    return {
      type: 'strength',
      type_zh: '重訓',
      warmup: [
        {
          exercise_id: 'warmup-1',
          exercise_name: 'Cardio Warm-up',
          exercise_name_zh: '熱身有氧',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 300,
          rest_secs: 0,
          notes: '跑步機或跳繩',
        },
        {
          exercise_id: 'warmup-2',
          exercise_name: 'Dynamic Stretching',
          exercise_name_zh: '動態伸展',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 180,
          rest_secs: 0,
          notes: '關節活動',
        },
      ],
      main: [
        {
          exercise_id: dayIndex % 3 === 0 ? 'bench-press' : dayIndex % 3 === 1 ? 'squat' : 'deadlift',
          exercise_name:
            dayIndex % 3 === 0 ? 'Bench Press' : dayIndex % 3 === 1 ? 'Squat' : 'Deadlift',
          exercise_name_zh:
            dayIndex % 3 === 0 ? '臥推' : dayIndex % 3 === 1 ? '深蹲' : '硬舉',
          youtube_id:
            dayIndex % 3 === 0
              ? '4YnVV_Ksb1E'
              : dayIndex % 3 === 1
                ? 'aclHktwnyYs'
                : 'V1Y_CziDszo',
          sets: isBeginner ? 3 : 4,
          reps: 8,
          duration_secs: null,
          rest_secs: 120,
          notes: hasBackInjury ? '控制重量，避免過度負荷' : '',
        },
        {
          exercise_id: 'assistance-1',
          exercise_name: 'Dumbbell Rows',
          exercise_name_zh: '啞鈴划船',
          youtube_id: 'w-PL77Umd28',
          sets: isBeginner ? 3 : 3,
          reps: 10,
          duration_secs: null,
          rest_secs: 90,
          notes: '背部輔助運動',
        },
      ],
      cooldown: [
        {
          exercise_id: 'cooldown-1',
          exercise_name: 'Static Stretching',
          exercise_name_zh: '靜態伸展',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 300,
          rest_secs: 0,
          notes: '放鬆訓練肌群',
        },
      ],
      estimated_duration_mins: 60,
      calories_burned_est: 400,
    }
  }

  if (isCardioDay) {
    // 有氧 - 根據膝蓋傷害調整
    const cardioType = hasKneeInjury ? 'rowing' : dayIndex % 2 === 0 ? 'running' : 'cycling'
    const cardioTypeZh = hasKneeInjury ? '划船' : dayIndex % 2 === 0 ? '跑步' : '騎車'

    return {
      type: 'cardio',
      type_zh: '有氧運動',
      warmup: [
        {
          exercise_id: 'warmup-cardio',
          exercise_name: 'Light Jog',
          exercise_name_zh: '輕慢跑',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 300,
          rest_secs: 0,
          notes: '逐步升溫',
        },
      ],
      main: [
        {
          exercise_id: `cardio-${cardioType}`,
          exercise_name: cardioTypeZh,
          exercise_name_zh: cardioTypeZh,
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 1800, // 30分鐘中等強度
          rest_secs: 0,
          notes: hasKneeInjury ? '低衝擊運動' : '保持心率在 130-150 BPM',
        },
      ],
      cooldown: [
        {
          exercise_id: 'cooldown-cardio',
          exercise_name: 'Cool Down Walk',
          exercise_name_zh: '緩和步行',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 300,
          rest_secs: 0,
          notes: '心率逐步恢復',
        },
      ],
      estimated_duration_mins: 40,
      calories_burned_est: 350,
    }
  }

  return {
    type: 'rest',
    type_zh: '休息日',
    warmup: [],
    main: [],
    cooldown: [],
    estimated_duration_mins: 0,
    calories_burned_est: 0,
  }
}
