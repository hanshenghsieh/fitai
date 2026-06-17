import type { UserProfile, Goal, WeeklyFeedback } from '@/types'
import { format, addDays } from 'date-fns'

const GOAL_LABELS: Record<string, string> = {
  lose_fat: '減脂',
  lose_weight: '減重',
  gain_muscle: '增肌',
  maintain: '維持體態',
  body_recomp: '體態重組（減脂+增肌）',
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: '久坐少動（辦公室工作，幾乎不運動）',
  light: '輕度活動（每週運動1-2次）',
  moderate: '中度活動（每週運動3-4次）',
  active: '積極活動（每週運動5-6次）',
  very_active: '非常活躍（每天高強度運動）',
}

export function buildWeeklyPlanPrompt(params: {
  profile: UserProfile
  goal: Goal
  weekNumber: number
  weekStart: Date
  exercises: { id: string; name: string; name_zh: string; category: string; youtube_id: string | null; sets_default: number | null; reps_default: number | null; duration_secs: number | null; equipment_required: string[]; contraindications: string[]; instructions: string; difficulty: string }[]
  previousFeedback?: WeeklyFeedback | null
  previousDietRate?: number
  previousWorkoutRate?: number
}) {
  const { profile, goal, weekNumber, weekStart, exercises, previousFeedback, previousDietRate, previousWorkoutRate } = params

  const days = Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    date: format(addDays(weekStart, i), 'yyyy-MM-dd'),
  }))

  const restrictions: string[] = []
  if (profile.is_vegan) restrictions.push('純素食（無蛋奶）')
  else if (profile.is_vegetarian) restrictions.push('素食（可蛋奶）')
  if (profile.is_halal) restrictions.push('清真食品')
  if (profile.is_gluten_free) restrictions.push('無麩質')
  if (profile.allergens.length) restrictions.push(`過敏原：${profile.allergens.join('、')}`)
  if (profile.disliked_foods.length) restrictions.push(`不喜歡的食物：${profile.disliked_foods.join('、')}`)

  const availableExercises = exercises.filter(ex => {
    const hasContraindication = ex.contraindications.some(c => profile.injuries.includes(c))
    if (hasContraindication) return false
    if (ex.equipment_required.length === 0) return true
    return ex.equipment_required.some(eq => profile.equipment.includes(eq))
  })

  const exerciseList = availableExercises.map(ex =>
    `- ID:${ex.id} | ${ex.name_zh}(${ex.name}) | 部位:${ex.category} | 難度:${ex.difficulty} | YT:${ex.youtube_id ?? 'null'} | 預設:${ex.sets_default ?? '-'}組${ex.reps_default ?? '-'}次${ex.duration_secs ? `/${ex.duration_secs}秒` : ''} | 說明:${ex.instructions}`
  ).join('\n')

  const progressContext = weekNumber > 1 && (previousDietRate !== undefined || previousWorkoutRate !== undefined)
    ? `
【上週執行狀況】
- 飲食完成率：${previousDietRate?.toFixed(0) ?? '未知'}%
- 運動完成率：${previousWorkoutRate?.toFixed(0) ?? '未知'}%
${previousFeedback ? `
- 最難完成的部分：${previousFeedback.hardest_part ?? '未填寫'}
- 飲食滿意度：${previousFeedback.diet_satisfaction ?? '未填寫'}/5
- 訓練強度感受：${previousFeedback.workout_intensity === 'too_easy' ? '太輕鬆' : previousFeedback.workout_intensity === 'too_hard' ? '太難' : '剛好'}
- 生病天數：${previousFeedback.had_sick_days ? '有' : '無'}
- 出差/旅行：${previousFeedback.had_travel ? '有' : '無'}
- 其他備註：${previousFeedback.additional_notes ?? '無'}
` : ''}
【調整策略】
${(previousDietRate ?? 100) < 60 ? '- 飲食完成率偏低，本週菜單應更簡單易執行，減少備餐複雜度' : ''}
${(previousWorkoutRate ?? 100) < 60 ? '- 運動完成率偏低，適度降低訓練量，優先建立習慣' : ''}
${previousFeedback?.workout_intensity === 'too_hard' ? '- 訓練強度過高，本週應降低重量/組數/次數約10-15%' : ''}
${previousFeedback?.workout_intensity === 'too_easy' ? '- 訓練強度偏低，本週可增加漸進超負荷（增加組數或重量5-10%）' : ''}
${previousFeedback?.had_sick_days ? '- 上週有生病，本週前3天以輕度恢復訓練為主' : ''}
` : ''

  const bmr = calculateBMR(profile)
  const tdee = bmr * getActivityMultiplier(profile.activity_level)
  const { targetCalories, proteinG } = calculateNutritionTargets(goal, profile, tdee)

  return `你是一位專業健身教練兼營養師，請為這位台灣用戶生成第${weekNumber}週的個人化健身飲食計畫。

【用戶基本資料】
- 性別：${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '其他'}
- 年齡：${profile.age}歲
- 身高：${profile.height_cm}cm
- 體重：${profile.weight_kg}kg
- 體脂率：${profile.body_fat_pct}%
- 肌肉量：${profile.muscle_mass_kg ?? '未知'}kg
- 活動程度：${ACTIVITY_LABELS[profile.activity_level]}
- 健身程度：${profile.fitness_level === 'beginner' ? '初學者' : profile.fitness_level === 'intermediate' ? '中階' : '進階'}
- TDEE估算：約${Math.round(tdee)}kcal/天

【目標】
- 類型：${GOAL_LABELS[goal.goal_type]}
- 截止日期：${goal.end_date}
- ${goal.target_weight_kg ? `目標體重：${goal.target_weight_kg}kg` : ''}
- ${goal.target_body_fat_pct ? `目標體脂：${goal.target_body_fat_pct}%` : ''}

【飲食限制與偏好】
- ${restrictions.length ? restrictions.join('\n- ') : '無特殊限制'}
- 飲食偏好：${profile.cuisine_preference === 'asian' ? '亞洲飲食為主' : profile.cuisine_preference === 'western' ? '西式飲食' : '中西混合'}
- 每餐備餐時間：${profile.cooking_time_mins}分鐘以內
- 飲食預算：${profile.food_budget === 'low' ? '低（平價食材）' : profile.food_budget === 'high' ? '高（可使用精緻食材）' : '中等'}

【健身設備】
- 可用器材：${profile.equipment.length ? profile.equipment.join('、') : '無器材（徒手訓練）'}
- 傷病限制：${profile.injuries.length ? profile.injuries.join('、') : '無'}
- 健康狀況：${profile.health_conditions.length ? profile.health_conditions.join('、') : '良好'}
${progressContext}

【計算參數】
- 建議每日熱量攝取：${Math.round(targetCalories)}kcal
- 建議每日蛋白質：${Math.round(proteinG)}g
- 本週日期對應：
${days.map(d => `  第${d.day}天 = ${d.date}`).join('\n')}

【可用運動資料庫】（只能從以下清單選擇exercise_id，不可自創）
${exerciseList}

【重要規則】
1. 每餐熱量女性不得低於300kcal，男性不得低於350kcal
2. 全天熱量女性不得低於1200kcal，男性不得低於1500kcal
3. workout中只能使用上方運動資料庫的exercise_id和youtube_id，不可自創ID
4. rest日的workout.main可以為空陣列，warmup/cooldown給伸展動作
5. 菜單食物要台灣化，可以是便利商店、自助餐、家常菜等實際可取得的食物
6. 蛋白質目標優先：每公斤體重至少${goal.goal_type === 'gain_muscle' ? '1.8' : '1.6'}g蛋白質
7. 採購清單按照食材分類，不重複列出

請輸出完整的JSON，格式如下：
{
  "week_number": ${weekNumber},
  "weekly_targets": {
    "avg_daily_calories": number,
    "avg_daily_protein_g": number,
    "workout_days": number
  },
  "days": [7個DayPlan物件],
  "grocery_list": [{"category": string, "items": string[]}],
  "coach_note": "給用戶的本週重點提醒（繁體中文，100-200字）"
}

每個DayPlan格式：
{
  "day": 1-7,
  "date": "yyyy-MM-dd",
  "meals": [DailyMeal],
  "workout": DailyWorkout,
  "daily_targets": {"calories": n, "protein_g": n, "carbs_g": n, "fat_g": n, "water_ml": n}
}

只輸出JSON，不要任何說明文字。`
}

function calculateBMR(profile: UserProfile): number {
  if (!profile.weight_kg || !profile.height_cm || !profile.age) return 1800
  if (profile.gender === 'male') {
    return 88.362 + (13.397 * profile.weight_kg) + (4.799 * profile.height_cm) - (5.677 * profile.age)
  }
  return 447.593 + (9.247 * profile.weight_kg) + (3.098 * profile.height_cm) - (4.330 * profile.age)
}

function getActivityMultiplier(level: string): number {
  const map: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  }
  return map[level] ?? 1.55
}

function calculateNutritionTargets(goal: Goal, profile: UserProfile, tdee: number) {
  let deficit = 0
  if (goal.goal_type === 'lose_fat' || goal.goal_type === 'lose_weight') deficit = -500
  if (goal.goal_type === 'gain_muscle') deficit = 300
  if (goal.goal_type === 'body_recomp') deficit = -200
  const targetCalories = Math.max(profile.gender === 'female' ? 1200 : 1500, tdee + deficit)
  const proteinMultiplier = goal.goal_type === 'gain_muscle' ? 1.8 : 1.6
  const proteinG = (profile.weight_kg ?? 70) * proteinMultiplier
  return { targetCalories, proteinG }
}
