import { buildMealCombination, comboToSaved } from '@/lib/meal-combo-engine'
import { buildHomeCombo, comboToDailyMeal } from '@/lib/home-combo-engine'
import { isValidMealLines } from '@/lib/meal-combo-validity'
import type { DayPlan, ConvenienceMealCombination } from '@/types'
import type { UserProfile } from '@/types'

const MEAL_RATIOS = { breakfast: 0.25, lunch: 0.4, dinner: 0.35 } as const

export interface HomeMealRollOptions {
  rollOffset?: number
  weekSeed?: number
  excludeComboIds?: string[]
}

/** 取得當日外食菜單：優先用計畫內已儲存資料，否則即時依目標配餐 */
export function getConvenienceMealsForDay(
  dayPlan: DayPlan,
  dayIndex: number
): ConvenienceMealCombination[] {
  const saved = dayPlan.convenience_meals ?? []
  const targets = dayPlan.daily_targets

  return (['breakfast', 'lunch', 'dinner'] as const).map(mealType => {
    const existing = saved.find(m => m.meal_type === mealType)
    if (existing?.items?.length) {
      const lines = existing.items.map(item => ({ item, portion: 'full' as const }))
      if (isValidMealLines(lines)) return existing
    }

    const ratio = MEAL_RATIOS[mealType]
    const combo = buildMealCombination(
      mealType,
      Math.round(targets.calories * ratio),
      Math.round(targets.protein_g * ratio),
      dayIndex
    )
    if (combo.items.length > 0) return comboToSaved(mealType, combo)

    // 最後防線：用自己煮菜單轉成外食顯示格式
    const home = dayPlan.meals.find(m => m.type === mealType)
    if (home?.items?.length) {
      return {
        meal_type: mealType,
        meal_type_zh: home.type_zh,
        items: home.items.map(item => ({
          id: item.id,
          name: item.name_zh,
          store: '自己煮',
          category: mealType,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          price: 0,
          photo_url: '',
          description: `${item.portion} · ${item.preparation}`,
        })),
        total_calories: home.total_calories,
        total_protein_g: home.items.reduce((s, i) => s + i.protein_g, 0),
        total_carbs_g: home.items.reduce((s, i) => s + i.carbs_g, 0),
        total_fat_g: home.items.reduce((s, i) => s + i.fat_g, 0),
        reasoning: '依自己煮份量顯示',
      }
    }

    return {
      meal_type: mealType,
      meal_type_zh: mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐',
      items: [],
      total_calories: 0,
      total_protein_g: 0,
      total_carbs_g: 0,
      total_fat_g: 0,
      reasoning: '',
    }
  })
}

/** 自己煮三餐：模組化 500+ 組合，支援 🎲 重骰 */
export function getHomeMealsForDay(
  dayPlan: DayPlan,
  dayIndex?: number,
  profile?: UserProfile | null,
  rollOptions?: Partial<Record<'breakfast' | 'lunch' | 'dinner', HomeMealRollOptions>>
): DayPlan['meals'] {
  if (profile && dayIndex != null && dayPlan.daily_targets) {
    const targets = dayPlan.daily_targets
    const weekSeed = rollOptions?.breakfast?.weekSeed ?? dayIndex
    return (['breakfast', 'lunch', 'dinner'] as const).map(mealType => {
      const ratio = MEAL_RATIOS[mealType]
      const opts = rollOptions?.[mealType]
      const combo = buildHomeCombo(
        mealType,
        dayIndex,
        Math.round(targets.calories * ratio),
        Math.round(targets.protein_g * ratio),
        profile,
        {
          rollOffset: opts?.rollOffset ?? 0,
          weekSeed: opts?.weekSeed ?? weekSeed,
          excludeComboIds: opts?.excludeComboIds,
        }
      )
      const meal = comboToDailyMeal(combo)
      return {
        type: meal.type,
        type_zh: meal.type_zh,
        items: meal.items,
        total_calories: meal.total_calories,
        name_zh: meal.name_zh,
        steps: meal.steps,
        zaijian_note: meal.zaijian_note,
        combo_id: meal.combo_id,
        tags: meal.tags,
      } as DayPlan['meals'][0] & {
        name_zh?: string
        steps?: string[]
        zaijian_note?: string
        combo_id?: string
        tags?: string[]
      }
    })
  }
  if (dayPlan.meals?.length) return dayPlan.meals
  return []
}
