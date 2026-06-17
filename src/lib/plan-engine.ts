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
  // 確保每個 dayIndex 拿到不同的菜單
  // breakfast: day0→0, day1→1, day2→2, day3→0, day4→1, day5→2, day6→0
  // lunch: day0→1, day1→2, day2→0, day3→1, day4→2, day5→0, day6→1
  // dinner: day0→2, day1→0, day2→1, day3→2, day4→0, day5→1, day6→2
  let mealIndex = dayIndex % meals.length

  if (mealType === 'lunch') {
    mealIndex = (dayIndex + 1) % meals.length
  } else if (mealType === 'dinner') {
    mealIndex = (dayIndex + 2) % meals.length
  }

  const meal = meals[mealIndex]

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

// 重訓動作庫
const strengthExercises = {
  upper: [
    {
      id: 'bench-press',
      name: 'Bench Press',
      name_zh: '臥推',
      youtube_id: '4YnVV_Ksb1E',
      reps: 8,
      sets: 4,
      rest: 120,
      hasEquipment: true,
      noEquipment: false,
    },
    {
      id: 'dumbbell-rows',
      name: 'Dumbbell Rows',
      name_zh: '啞鈴划船',
      youtube_id: 'w-PL77Umd28',
      reps: 10,
      sets: 3,
      rest: 90,
      hasEquipment: true,
      noEquipment: false,
    },
    {
      id: 'shoulder-press',
      name: 'Shoulder Press',
      name_zh: '肩推',
      youtube_id: 'GbnXvEaso8s',
      reps: 8,
      sets: 3,
      rest: 90,
      hasEquipment: true,
      noEquipment: false,
    },
    {
      id: 'dumbbell-flyes',
      name: 'Dumbbell Flyes',
      name_zh: '飛鳥',
      youtube_id: 'eozdVT5pDcQ',
      reps: 12,
      sets: 3,
      rest: 60,
      hasEquipment: true,
      noEquipment: false,
    },
    {
      id: 'push-ups',
      name: 'Push-ups',
      name_zh: '伏地挺身',
      youtube_id: 'IODxDxX7oi4',
      reps: 15,
      sets: 3,
      rest: 60,
      hasEquipment: false,
      noEquipment: true,
    },
    {
      id: 'pike-push-ups',
      name: 'Pike Push-ups',
      name_zh: '倒V伏地挺身',
      youtube_id: 'T4rnpJhyxLY',
      reps: 12,
      sets: 3,
      rest: 60,
      hasEquipment: false,
      noEquipment: true,
    },
  ],
  lower: [
    {
      id: 'squat',
      name: 'Squat',
      name_zh: '深蹲',
      youtube_id: 'aclHktwnyYs',
      reps: 8,
      sets: 4,
      rest: 120,
      hasEquipment: true,
      noEquipment: true,
    },
    {
      id: 'deadlift',
      name: 'Deadlift',
      name_zh: '硬舉',
      youtube_id: 'V1Y_CziDszo',
      reps: 6,
      sets: 4,
      rest: 120,
      hasEquipment: true,
      noEquipment: false,
    },
    {
      id: 'leg-press',
      name: 'Leg Press',
      name_zh: '腿部推蹬',
      youtube_id: 'IZxyjW7MIAI',
      reps: 10,
      sets: 3,
      rest: 90,
      hasEquipment: true,
      noEquipment: false,
    },
    {
      id: 'lunges',
      name: 'Lunges',
      name_zh: '弓步',
      youtube_id: 'Z2ECwLW4Alk',
      reps: 10,
      sets: 3,
      rest: 90,
      hasEquipment: false,
      noEquipment: true,
    },
    {
      id: 'pistol-squats',
      name: 'Pistol Squats',
      name_zh: '單腿深蹲',
      youtube_id: 'WKOwMw7qOv8',
      reps: 5,
      sets: 3,
      rest: 90,
      hasEquipment: false,
      noEquipment: true,
    },
  ],
}

// 有氧選項
const cardioExercises = [
  {
    id: 'running',
    name: 'Running',
    name_zh: '跑步',
    duration: 1800,
    intensity: '中等 (130-150 BPM)',
    lowImpact: false,
  },
  {
    id: 'cycling',
    name: 'Cycling',
    name_zh: '騎車',
    duration: 1800,
    intensity: '中等 (100-120 RPM)',
    lowImpact: true,
  },
  {
    id: 'rowing',
    name: 'Rowing',
    name_zh: '划船',
    duration: 1800,
    intensity: '中等 (24-28 strokes/min)',
    lowImpact: true,
  },
  {
    id: 'jump-rope',
    name: 'Jump Rope',
    name_zh: '跳繩',
    duration: 1200,
    intensity: '中等-高強度 (140-160 BPM)',
    lowImpact: false,
  },
  {
    id: 'swimming',
    name: 'Swimming',
    name_zh: '游泳',
    duration: 1800,
    intensity: '中等',
    lowImpact: true,
  },
]

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
          exercise_name: 'Stretching',
          exercise_name_zh: '伸展',
          youtube_id: 'J8epyPNR-x0',
          sets: 1,
          reps: null,
          duration_secs: 600,
          rest_secs: 0,
          notes: '全身放鬆伸展 10 分鐘',
        },
      ],
      estimated_duration_mins: 10,
      calories_burned_est: 50,
    }
  }

  if (isStrengthDay) {
    // 在 upper 和 lower 之間輪換，每天選不同的動作
    const isUpperDay = dayIndex % 2 === 0
    const exercises = isUpperDay
      ? strengthExercises.upper
      : strengthExercises.lower

    // 選擇 2 個動作組成訓練
    const exerciseIndex1 = (dayIndex * 2) % exercises.length
    const exerciseIndex2 = (dayIndex * 2 + 1) % exercises.length

    const exercise1 = exercises[exerciseIndex1]
    const exercise2 = exercises[exerciseIndex2]

    return {
      type: 'strength',
      type_zh: isUpperDay ? '上肢重訓' : '下肢重訓',
      warmup: [
        {
          exercise_id: 'warmup-cardio',
          exercise_name: 'Warm-up',
          exercise_name_zh: '5分鐘熱身',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 300,
          rest_secs: 0,
          notes: '輕度有氧或動態伸展',
        },
      ],
      main: [
        {
          exercise_id: exercise1.id,
          exercise_name: exercise1.name,
          exercise_name_zh: exercise1.name_zh,
          youtube_id: exercise1.youtube_id,
          sets: exercise1.sets,
          reps: exercise1.reps,
          duration_secs: null,
          rest_secs: exercise1.rest,
          notes: hasBackInjury ? '控制重量' : '',
        },
        {
          exercise_id: exercise2.id,
          exercise_name: exercise2.name,
          exercise_name_zh: exercise2.name_zh,
          youtube_id: exercise2.youtube_id,
          sets: exercise2.sets,
          reps: exercise2.reps,
          duration_secs: null,
          rest_secs: exercise2.rest,
          notes: '',
        },
      ],
      cooldown: [
        {
          exercise_id: 'cooldown-stretch',
          exercise_name: 'Stretching',
          exercise_name_zh: '伸展',
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
    // 選擇有氧方式，避免膝蓋傷害
    const availableCardio = hasKneeInjury
      ? cardioExercises.filter(c => c.lowImpact)
      : cardioExercises

    const cardioIndex = dayIndex % availableCardio.length
    const cardio = availableCardio[cardioIndex]

    return {
      type: 'cardio',
      type_zh: '有氧運動',
      warmup: [
        {
          exercise_id: 'warmup-light',
          exercise_name: 'Light Warm-up',
          exercise_name_zh: '輕度熱身',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 300,
          rest_secs: 0,
          notes: '逐步升溫 5 分鐘',
        },
      ],
      main: [
        {
          exercise_id: cardio.id,
          exercise_name: cardio.name,
          exercise_name_zh: cardio.name_zh,
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: cardio.duration,
          rest_secs: 0,
          notes: `強度：${cardio.intensity}`,
        },
      ],
      cooldown: [
        {
          exercise_id: 'cooldown-cardio',
          exercise_name: 'Cool Down',
          exercise_name_zh: '緩和',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 300,
          rest_secs: 0,
          notes: '步行 5 分鐘，心率恢復',
        },
      ],
      estimated_duration_mins: Math.round(cardio.duration / 60 + 10),
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
