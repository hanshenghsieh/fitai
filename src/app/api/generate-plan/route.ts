import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { profile, goal, preferences } = await req.json()
    if (!profile || !goal) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const hasKneeInjury = profile.injuries?.some((i: any) => String(i).toLowerCase().includes('膝') || String(i).toLowerCase().includes('knee'))
    const hasBackInjury = profile.injuries?.some((i: any) => String(i).toLowerCase().includes('腰') || String(i).toLowerCase().includes('back'))

    console.log(`🤖 Plan: ${profile.age}y, injuries: ${profile.injuries?.join(', ') || 'none'}`)

    // Return fast fallback plan (no Claude call)
    const planData = generateDefaultPlan(profile, goal, hasKneeInjury, hasBackInjury)

    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

    planData.days = planData.days.map((day, idx) => ({
      ...day,
      day: idx + 1,
      date: new Date(weekStart.getTime() + idx * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }))

    console.log('✅ Plan ready')
    return NextResponse.json(planData)
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 400 })
  }
}

function generateDefaultPlan(profile: any, goal: any, hasKneeInjury: boolean, hasBackInjury: boolean) {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

  return {
    week_number: 1,
    weekly_targets: { avg_daily_calories: 2300, avg_daily_protein_g: 160, workout_days: 5 },
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      date: new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      meals: [
        {
          type: 'breakfast',
          type_zh: '早餐',
          items: [
            { id: '1', name: 'Eggs', name_zh: '雞蛋', calories: 160, protein_g: 14, carbs_g: 2, fat_g: 12, portion: '2個', preparation: '炒', photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop', quantity: '2個', portionDesc: '約麻將牌大小' },
            { id: '2', name: 'Toast', name_zh: '吐司', calories: 120, protein_g: 5, carbs_g: 20, fat_g: 2, portion: '2片', preparation: '烤', photo_url: 'https://images.unsplash.com/photo-1599599810694-b5ac4dd0alec?w=200&h=200&fit=crop', quantity: '2片', portionDesc: '標準切片吐司' },
          ],
          total_calories: 280,
        },
        {
          type: 'lunch',
          type_zh: '午餐',
          items: [
            { id: 'l1', name: 'Chicken', name_zh: '雞胸肉', calories: 320, protein_g: 55, carbs_g: 0, fat_g: 8, portion: '160g', preparation: '烤', photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop', quantity: '1塊', portionDesc: '約一個手掌大小' },
            { id: 'l2', name: 'Rice', name_zh: '白飯', calories: 220, protein_g: 5, carbs_g: 50, fat_g: 1, portion: '1碗', preparation: '煮', photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=200&h=200&fit=crop', quantity: '1碗', portionDesc: '標準飯碗8分滿' },
          ],
          total_calories: 540,
        },
        {
          type: 'dinner',
          type_zh: '晚餐',
          items: [
            { id: 'd1', name: 'Salmon', name_zh: '鮭魚', calories: 300, protein_g: 42, carbs_g: 0, fat_g: 16, portion: '130g', preparation: '烤', photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop', quantity: '1片', portionDesc: '約信用卡大小厚度1指' },
            { id: 'd2', name: 'Sweet Potato', name_zh: '地瓜', calories: 120, protein_g: 2, carbs_g: 27, fat_g: 0, portion: '120g', preparation: '烤', photo_url: 'https://images.unsplash.com/photo-1596535542636-922503f663d7?w=200&h=200&fit=crop', quantity: '中等1個', portionDesc: '約拳頭大小' },
          ],
          total_calories: 420,
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
    })),
    grocery_list: [
      { category: '🥚 蛋白質', items: ['雞胸肉', '鮭魚', '蛋'] },
      { category: '🍚 碳水', items: ['白米', '地瓜', '吐司'] },
      { category: '🥦 蔬菜', items: ['花菜', '菠菜'] },
    ],
    coach_note: `根據你的需求調整的計畫${hasKneeInjury ? '（避免膝蓋禁忌運動）' : ''}`,
  }
}
