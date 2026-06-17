import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek } from 'date-fns'
import {
  calculateTDEE,
  calculateNutritionTargets,
  getHomeCookedMeal,
  generateWorkoutPlan,
} from '@/lib/plan-engine'
import type { UserProfile, Goal } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 獲取用戶 profile 和 goal
    const [{ data: profile }, { data: goals }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
    ])

    if (!profile || !goals || goals.length === 0) {
      return NextResponse.json({ error: 'Missing profile or goal' }, { status: 400 })
    }

    const goal = goals[0]

    console.log(
      `🤖 Generating plan for ${profile.display_name || 'user'} (${profile.age}y, ${profile.weight_kg}kg, goal: ${goal.goal_type})`
    )

    const nutrition = calculateNutritionTargets(profile, goal)
    console.log(
      `📊 TDEE: ${calculateTDEE(profile)} kcal | Target: ${nutrition.dailyCalories} kcal | Protein: ${nutrition.proteinGrams}g`
    )

    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

    // 生成7天計畫
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      // 每日菜單（自己煮）
      const meals = [
        getHomeCookedMeal('breakfast', dayIndex),
        getHomeCookedMeal('lunch', dayIndex),
        getHomeCookedMeal('dinner', dayIndex),
      ]

      const mealsTotalCalories = meals.reduce((sum, m) => sum + m.total_calories, 0)
      const mealsProtein = meals.reduce((sum, m) => sum + m.protein_g, 0)

      // 運動計畫
      const workout = generateWorkoutPlan(
        dayIndex,
        profile.fitness_level || 'beginner',
        profile.injuries || [],
        goal.goal_type
      )

      return {
        day: dayIndex + 1,
        date: new Date(
          weekStart.getTime() + dayIndex * 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0],
        meals,
        workout,
        daily_targets: {
          calories: nutrition.dailyCalories,
          protein_g: nutrition.proteinGrams,
          carbs_g: nutrition.carbsGrams,
          fat_g: nutrition.fatGrams,
          water_ml: Math.round((profile.weight_kg || 70) * 35), // 35ml per kg
        },
        meal_summary: {
          total_calories: mealsTotalCalories,
          total_protein: mealsProtein,
        },
      }
    })

    const planData = {
      week_number: 1,
      weekly_targets: {
        avg_daily_calories: nutrition.dailyCalories,
        avg_daily_protein_g: nutrition.proteinGrams,
        workout_days: 5,
      },
      days,
      grocery_list: generateGroceryList(days),
      coach_note: generateCoachNote(profile, goal, nutrition),
    }

    // 保存到數據庫
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const { error: upsertError } = await supabase
      .from('weekly_plans')
      .upsert(
        {
          user_id: user.id,
          week_start: weekStartStr,
          week_number: 1,
          plan_data: planData,
          coach_note: planData.coach_note,
          generation_status: 'completed',
        },
        { onConflict: 'user_id,week_start' }
      )

    if (upsertError) {
      console.error('Error saving plan:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save plan to database' },
        { status: 500 }
      )
    }

    console.log(`✅ Plan saved for user ${user.id}, week ${weekStart}`)
    return NextResponse.json({ success: true, data: planData })
  } catch (err) {
    console.error('Error generating plan:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate plan' },
      { status: 500 }
    )
  }
}

function generateGroceryList(
  days: any[]
): Array<{ category: string; items: string[] }> {
  const items = new Set<string>()

  days.forEach(day => {
    day.meals.forEach((meal: any) => {
      meal.items.forEach((item: any) => {
        items.add(item.name_zh)
      })
    })
  })

  return [
    {
      category: '🥚 蛋白質',
      items: Array.from(items).filter(
        i =>
          ['雞蛋', '雞胸肉', '牛肉', '鮭魚', '火雞胸', '鱈魚', '蝦', '優格'].includes(i)
      ),
    },
    {
      category: '🍚 碳水化合物',
      items: Array.from(items).filter(
        i =>
          ['吐司', '白飯', '番薯飯', '地瓜', '麵條', '燕麥', '香蕉', '麥片'].includes(i)
      ),
    },
    {
      category: '🥦 蔬菜與補充',
      items: Array.from(items).filter(i => ['花菜', '蘆筍'].includes(i)),
    },
  ]
}

function generateCoachNote(profile: UserProfile, goal: Goal, nutrition: any): string {
  const tdee = calculateTDEE(profile)
  const deficit = tdee - nutrition.dailyCalories
  const deficitPerWeek = deficit * 7
  const lossPerMonth = (deficitPerWeek / 7700) * 30 // 1 kg fat ≈ 7700 kcal

  let note = `根據你的數據：\n`
  note += `• TDEE: ${tdee} kcal | 目標: ${nutrition.dailyCalories} kcal | 每日赤字: ${deficit} kcal\n`
  note += `• 預計每月減重: ${lossPerMonth.toFixed(1)} kg\n`
  note += `• 蛋白質目標: ${nutrition.proteinGrams}g (保護肌肉)\n`

  if (goal.goal_type === 'lose_fat' || goal.goal_type === 'lose_weight') {
    note += `\n減脂策略：\n`
    note += `✓ 周一三五：重訓 (保持肌肉)\n`
    note += `✓ 周二四六：有氧 (消耗熱量)\n`
    note += `✓ 周日：充分休息\n`
  }

  if (profile.injuries?.length) {
    note += `\n⚠️ 受傷注意事項：\n`
    profile.injuries.forEach(injury => {
      note += `• ${injury}\n`
    })
  }

  return note
}

function generateDefaultPlan(profile: any, goal: any, hasKneeInjury: boolean, hasBackInjury: boolean) {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

  // 3 套早午晚菜單輪換
  const breakfastOptions = [
    [
      { id: '1', name: 'Eggs', name_zh: '雞蛋', calories: 160, protein_g: 14, carbs_g: 2, fat_g: 12, portion: '2個', preparation: '炒', photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop', portionDesc: '約麻將牌大小' },
      { id: '2', name: 'Toast', name_zh: '吐司', calories: 120, protein_g: 5, carbs_g: 20, fat_g: 2, portion: '2片', preparation: '烤', photo_url: 'https://images.unsplash.com/photo-1599599810694-b5ac4dd0alec?w=200&h=200&fit=crop', portionDesc: '標準切片吐司' },
    ],
    [
      { id: 'b1a', name: 'Oatmeal', name_zh: '燕麥', calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3, portion: '50g', preparation: '煮', photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop', portionDesc: '即食燕麥片' },
      { id: 'b1b', name: 'Banana', name_zh: '香蕉', calories: 105, protein_g: 1, carbs_g: 27, fat_g: 0, portion: '1根', preparation: '生', photo_url: 'https://images.unsplash.com/photo-1587859211519-2d0a825f2f43?w=200&h=200&fit=crop', portionDesc: '中等大小' },
    ],
    [
      { id: 'b2a', name: 'Yogurt', name_zh: '優格', calories: 100, protein_g: 10, carbs_g: 8, fat_g: 3, portion: '100g', preparation: '-', photo_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291840?w=200&h=200&fit=crop', portionDesc: '原味優格' },
      { id: 'b2b', name: 'Granola', name_zh: '麥片', calories: 120, protein_g: 3, carbs_g: 20, fat_g: 4, portion: '30g', preparation: '-', photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop', portionDesc: '堅果麥片' },
    ],
  ]

  const lunchOptions = [
    [
      { id: 'l1', name: 'Chicken', name_zh: '雞胸肉', calories: 320, protein_g: 55, carbs_g: 0, fat_g: 8, portion: '160g', preparation: '烤', photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop', portionDesc: '約一個手掌大小' },
      { id: 'l2', name: 'Rice', name_zh: '白飯', calories: 220, protein_g: 5, carbs_g: 50, fat_g: 1, portion: '1碗', preparation: '煮', photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop', portionDesc: '標準飯碗8分滿' },
    ],
    [
      { id: 'l1b', name: 'Beef', name_zh: '牛肉', calories: 350, protein_g: 52, carbs_g: 0, fat_g: 15, portion: '150g', preparation: '炒', photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop', portionDesc: '里肌肉片' },
      { id: 'l2b', name: 'Sweet Potato', name_zh: '番薯飯', calories: 200, protein_g: 4, carbs_g: 45, fat_g: 1, portion: '150g', preparation: '煮', photo_url: 'https://images.unsplash.com/photo-1596535542636-922503f663d7?w=200&h=200&fit=crop', portionDesc: '黃色番薯' },
    ],
    [
      { id: 'l1c', name: 'Fish', name_zh: '鱈魚', calories: 280, protein_g: 50, carbs_g: 0, fat_g: 6, portion: '150g', preparation: '蒸', photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop', portionDesc: '白肉魚' },
      { id: 'l2c', name: 'Noodles', name_zh: '麵條', calories: 280, protein_g: 8, carbs_g: 54, fat_g: 2, portion: '100g', preparation: '煮', photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop', portionDesc: '全麥麵條' },
    ],
  ]

  const dinnerOptions = [
    [
      { id: 'd1', name: 'Salmon', name_zh: '鮭魚', calories: 300, protein_g: 42, carbs_g: 0, fat_g: 16, portion: '130g', preparation: '烤', photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop', portionDesc: '約信用卡大小厚度1指' },
      { id: 'd2', name: 'Sweet Potato', name_zh: '地瓜', calories: 120, protein_g: 2, carbs_g: 27, fat_g: 0, portion: '120g', preparation: '烤', photo_url: 'https://images.unsplash.com/photo-1596535542636-922503f663d7?w=200&h=200&fit=crop', portionDesc: '約拳頭大小' },
    ],
    [
      { id: 'd1b', name: 'Turkey', name_zh: '火雞胸', calories: 280, protein_g: 48, carbs_g: 0, fat_g: 8, portion: '140g', preparation: '烤', photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop', portionDesc: '低脂肉類' },
      { id: 'd2b', name: 'Broccoli', name_zh: '花菜', calories: 55, protein_g: 4, carbs_g: 11, fat_g: 1, portion: '200g', preparation: '蒸', photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop', portionDesc: '新鮮綠花菜' },
    ],
    [
      { id: 'd1c', name: 'Shrimp', name_zh: '蝦', calories: 250, protein_g: 48, carbs_g: 0, fat_g: 5, portion: '150g', preparation: '炒', photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop', portionDesc: '中蝦' },
      { id: 'd2c', name: 'Asparagus', name_zh: '蘆筍', calories: 65, protein_g: 5, carbs_g: 12, fat_g: 1, portion: '150g', preparation: '炒', photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop', portionDesc: '新鮮蘆筍' },
    ],
  ]

  return {
    week_number: 1,
    weekly_targets: { avg_daily_calories: 2300, avg_daily_protein_g: 160, workout_days: 5 },
    days: Array.from({ length: 7 }, (_, i) => {
      const bIdx = i % 3
      const lIdx = (i + 1) % 3
      const dIdx = (i + 2) % 3

      return {
        day: i + 1,
        date: new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        meals: [
          {
            type: 'breakfast',
            type_zh: '早餐',
            items: breakfastOptions[bIdx],
            total_calories: breakfastOptions[bIdx].reduce((sum, item) => sum + item.calories, 0),
          },
          {
            type: 'lunch',
            type_zh: '午餐',
            items: lunchOptions[lIdx],
            total_calories: lunchOptions[lIdx].reduce((sum, item) => sum + item.calories, 0),
          },
          {
            type: 'dinner',
            type_zh: '晚餐',
            items: dinnerOptions[dIdx],
            total_calories: dinnerOptions[dIdx].reduce((sum, item) => sum + item.calories, 0),
          },
        ],
        workout: {
          type: i % 2 === 0 ? 'strength' : 'cardio',
          type_zh: i % 2 === 0 ? '重訓' : hasKneeInjury ? '上肢有氧' : '有氧',
          warmup: [{ exercise_id: '1', exercise_name: 'Warm up', exercise_name_zh: '熱身', youtube_id: 'dQw4w9WgXcQ', sets: 1, reps: 15, duration_secs: null, rest_secs: 30, notes: '' }],
          main: i % 2 === 0
            ? [{ exercise_id: '2', exercise_name: 'Bench Press', exercise_name_zh: '臥推', youtube_id: '4YnVV_Ksb1E', sets: 4, reps: 6, duration_secs: null, rest_secs: 120, notes: hasKneeInjury ? '下肢受限' : '' }]
            : [{ exercise_id: '4', exercise_name: hasKneeInjury ? 'Upper Body Cardio' : 'Running', exercise_name_zh: hasKneeInjury ? '上肢訓練' : '跑步', youtube_id: null, sets: 1, reps: null, duration_secs: hasKneeInjury ? 1800 : 2400, rest_secs: 0, notes: hasKneeInjury ? '低衝擊訓練' : '' }],
          cooldown: [{ exercise_id: '5', exercise_name: 'Stretching', exercise_name_zh: '伸展', youtube_id: 'J8epyPNR-x0', sets: 1, reps: null, duration_secs: 300, rest_secs: 0, notes: '' }],
          estimated_duration_mins: i % 2 === 0 ? 60 : 40,
          calories_burned_est: 400,
        },
        daily_targets: { calories: 2300, protein_g: 160, carbs_g: 300, fat_g: 80, water_ml: 3500 },
      }
    }),
    grocery_list: [
      { category: '🥚 蛋白質', items: ['雞胸肉', '鮭魚', '蛋'] },
      { category: '🍚 碳水', items: ['白米', '地瓜', '吐司'] },
      { category: '🥦 蔬菜', items: ['花菜', '菠菜'] },
    ],
    coach_note: `根據你的需求調整的計畫${hasKneeInjury ? '（避免膝蓋禁忌運動）' : ''}`,
  }
}
