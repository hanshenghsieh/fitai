import {
  CATEGORY_PORTION_GRAMS,
  CURRY_RICE_NORMAL_GRAMS,
  DEFAULT_MEAL_QUICK_ADJUST,
  EATEN_LEVEL_MULTIPLIER,
  QUICK_LEVEL_MULTIPLIER,
  type EatenLevel,
  type MealPortionSize,
  type QuickAmountLevel,
  gramsForCategoryPortion,
} from '@/lib/nutrition/home-cooked/meal-portion-presets'
import { enrichMealDraftFromLabel } from '@/lib/nutrition/home-cooked/meal-template-enrichment'
import { parseMealLabelToDraft } from '@/lib/nutrition/home-cooked/parse-meal-label'
import type {
  DetectedIngredientLine,
  HomeCookedMealDraft,
  IngredientWeightMeta,
  MealQuickAdjust,
  WholeFoodCategory,
} from '@/lib/nutrition/home-cooked/types'

export type IngredientRole = 'rice' | 'meat' | 'sauce' | 'veg' | 'other'

export function inferIngredientRole(line: DetectedIngredientLine): IngredientRole {
  const label = line.raw_label
  if (line.category === 'carb' || /飯|麵|粥|粉|吐司/.test(label)) return 'rice'
  if (line.category === 'protein' || /雞|牛|豬|羊|魚|蝦|肉|蛋/.test(label)) return 'meat'
  if (line.category === 'sauce' || /醬|咖哩|咖喱|汁|滷/.test(label)) return 'sauce'
  if (line.category === 'veg' || /菜|蘿蔔|洋蔥|菇|豆|瓜|椒/.test(label)) return 'veg'
  return 'other'
}

function categoryForRole(role: IngredientRole): WholeFoodCategory {
  if (role === 'rice') return 'carb'
  if (role === 'meat') return 'protein'
  if (role === 'sauce') return 'sauce'
  if (role === 'veg') return 'veg'
  return 'other'
}

function curryTemplateGrams(line: DetectedIngredientLine, mealPortion: MealPortionSize): number | null {
  for (const [key, normalG] of Object.entries(CURRY_RICE_NORMAL_GRAMS)) {
    if (!line.raw_label.includes(key) && !line.name_zh.includes(key)) continue
    const role = inferIngredientRole(line)
    const cat = categoryForRole(role)
    const normalPortionG = CATEGORY_PORTION_GRAMS[cat].normal
    const targetPortionG = CATEGORY_PORTION_GRAMS[cat][mealPortion]
    return Math.round(normalG * (targetPortionG / normalPortionG))
  }
  return null
}

function baseGramsForLine(
  line: DetectedIngredientLine,
  mealPortion: MealPortionSize,
  mealLabel: string
): number {
  if (/咖哩|咖喱/.test(mealLabel)) {
    const curryG = curryTemplateGrams(line, mealPortion)
    if (curryG != null) return curryG
  }

  const role = inferIngredientRole(line)
  return gramsForCategoryPortion(categoryForRole(role), mealPortion)
}

function roleQuickMultiplier(role: IngredientRole, adjust: MealQuickAdjust): number {
  if (role === 'rice') return QUICK_LEVEL_MULTIPLIER[adjust.riceLevel]
  if (role === 'meat') return QUICK_LEVEL_MULTIPLIER[adjust.meatLevel]
  if (role === 'sauce') return QUICK_LEVEL_MULTIPLIER[adjust.sauceAmount]
  return 1
}

function computeLineGrams(
  line: DetectedIngredientLine,
  adjust: MealQuickAdjust,
  mealLabel: string
): number {
  const role = inferIngredientRole(line)
  let grams = baseGramsForLine(line, adjust.mealPortion, mealLabel)
  grams *= roleQuickMultiplier(role, adjust)
  grams *= EATEN_LEVEL_MULTIPLIER[adjust.eatenLevel]
  return Math.max(1, Math.round(grams))
}

export function buildIngredientWeightMeta(
  line: DetectedIngredientLine,
  estimatedG: number,
  adjustedG: number,
  source: IngredientWeightMeta['source']
): IngredientWeightMeta {
  return {
    raw_label: line.raw_label,
    food_id: line.food_id,
    estimated_weight_g: estimatedG,
    adjusted_weight_g: adjustedG,
    confidence: line.confidence,
    source,
  }
}

export function applyMealQuickAdjust(
  draft: HomeCookedMealDraft,
  adjust: MealQuickAdjust = DEFAULT_MEAL_QUICK_ADJUST,
  options?: { source?: IngredientWeightMeta['source']; preserveEstimates?: IngredientWeightMeta[] }
): HomeCookedMealDraft {
  const source = options?.source ?? 'photo_estimate'
  const prevMeta = options?.preserveEstimates ?? draft.ingredient_weights ?? []
  const prevByLabel = new Map(prevMeta.map(m => [m.raw_label, m]))

  const ingredient_weights: IngredientWeightMeta[] = []
  const ingredients = draft.ingredients.map(line => {
    if (!line.food_id) return line

    const photoEstimateG = computeLineGrams(line, DEFAULT_MEAL_QUICK_ADJUST, draft.meal_label)
    const adjustedG = computeLineGrams(line, adjust, draft.meal_label)
    const estimatedG = prevByLabel.get(line.raw_label)?.estimated_weight_g ?? photoEstimateG

    const metaSource: IngredientWeightMeta['source'] =
      source === 'user_adjusted' ? 'user_adjusted' : 'photo_estimate'

    ingredient_weights.push(
      buildIngredientWeightMeta(line, estimatedG, adjustedG, metaSource)
    )

    return { ...line, amount: adjustedG }
  })

  const sauce_level =
    adjust.sauceAmount === 'less' ? 'light' : adjust.sauceAmount === 'more' ? 'heavy' : 'normal'

  return {
    ...draft,
    ingredients,
    quick_adjust: adjust,
    ingredient_weights,
    sauce_level,
  }
}

/** Photo pipeline entry — enrich template + apply normal quick defaults. */
export function buildPhotoEstimatedMealDraft(mealLabel: string, base?: HomeCookedMealDraft): HomeCookedMealDraft {
  const parsed = base?.ingredients?.length ? base : parseMealLabelToDraft(mealLabel)
  const enriched = enrichMealDraftFromLabel({ ...parsed, meal_label: mealLabel })
  return applyMealQuickAdjust(enriched, DEFAULT_MEAL_QUICK_ADJUST, { source: 'photo_estimate' })
}

export function applyUserQuickAdjust(
  draft: HomeCookedMealDraft,
  adjust: MealQuickAdjust
): HomeCookedMealDraft {
  return applyMealQuickAdjust(draft, adjust, {
    source: 'user_adjusted',
    preserveEstimates: draft.ingredient_weights,
  })
}

export function hasQuickAdjustableMeal(draft: HomeCookedMealDraft): boolean {
  return draft.ingredients.filter(i => i.food_id != null).length > 0
}

export function mapSauceAmountToLevel(amount: QuickAmountLevel): HomeCookedMealDraft['sauce_level'] {
  if (amount === 'less') return 'light'
  if (amount === 'more') return 'heavy'
  return 'normal'
}
