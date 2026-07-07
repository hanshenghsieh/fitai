import type { CommonFoodItem, FoodRecordDraft, FoodRecordNutrition, PortionPresetId } from './types'

const OIL_KCAL: Record<NonNullable<FoodRecordDraft['oilLevel']>, number> = {
  none: 0,
  light: 45,
  normal: 90,
  heavy: 150,
}

const SAUCE_KCAL: Record<NonNullable<FoodRecordDraft['sauceLevel']>, number> = {
  none: 0,
  light: 25,
  normal: 55,
  heavy: 95,
}

const RICE_KCAL: Record<NonNullable<FoodRecordDraft['riceAmount']>, number> = {
  less: -60,
  normal: 0,
  extra: 90,
}

const SUGAR_KCAL: Record<NonNullable<FoodRecordDraft['sugarLevel']>, number> = {
  none: 0,
  light: 25,
  half: 55,
  full: 90,
}

export function amountForPreset(item: CommonFoodItem, preset: PortionPresetId, customAmount?: number): number {
  if (preset === 'small') return item.smallAmount
  if (preset === 'large') return item.largeAmount
  if (preset === 'custom') return customAmount ?? item.normalAmount
  return item.normalAmount
}

export function inferPresetFromAmount(item: CommonFoodItem, amount: number): PortionPresetId {
  if (amount === item.smallAmount) return 'small'
  if (amount === item.normalAmount) return 'normal'
  if (amount === item.largeAmount) return 'large'
  return 'custom'
}

export function defaultFoodRecordDraft(item: CommonFoodItem): FoodRecordDraft {
  return {
    p0_food_id: item.id,
    foodType: item.foodType,
    sourceType: item.sourceType,
    portionPreset: 'normal',
    amount: item.normalAmount,
    unit: item.defaultUnit,
    oilLevel: item.supportsOilOptions ? 'normal' : undefined,
    cookingMethod: item.supportsCookingMethod ? 'grilled' : undefined,
    sauceLevel: item.supportsSauce ? 'normal' : undefined,
    riceAmount: item.supportsRiceAmount ? 'normal' : undefined,
    sugarLevel: item.supportsSugarLevel ? 'none' : undefined,
    toppings: [],
  }
}

export function calculateFoodRecordNutrition(item: CommonFoodItem, draft: FoodRecordDraft): FoodRecordNutrition {
  const manual = draft.manualOverride
  if (manual?.calories != null || manual?.protein_g != null || manual?.fat_g != null || manual?.carbs_g != null) {
    return {
      calories: Math.round(manual.calories ?? item.kcalDefault),
      protein_g: Math.round((manual.protein_g ?? item.proteinDefault_g) * 10) / 10,
      carbs_g: Math.round((manual.carbs_g ?? item.carbsDefault_g) * 10) / 10,
      fat_g: Math.round((manual.fat_g ?? item.fatDefault_g) * 10) / 10,
      sodium_mg: Math.round(manual.sodium_mg ?? item.sodiumDefault_mg),
    }
  }

  const baseAmount = item.baseAmount > 0 ? item.baseAmount : 100
  const ratio = draft.amount / baseAmount

  let calories = item.kcalBase * ratio
  let protein = item.proteinBase_g * ratio
  let carbs = item.carbsBase_g * ratio
  let fat = item.fatBase_g * ratio
  let sodium = item.sodiumBase_mg * ratio

  if (draft.oilLevel && item.supportsOilOptions) calories += OIL_KCAL[draft.oilLevel]
  if (draft.sauceLevel && item.supportsSauce) calories += SAUCE_KCAL[draft.sauceLevel]
  if (draft.riceAmount && item.supportsRiceAmount) calories += RICE_KCAL[draft.riceAmount]
  if (draft.sugarLevel && item.supportsSugarLevel) calories += SUGAR_KCAL[draft.sugarLevel]
  if (draft.toppings?.length) calories += draft.toppings.length * 45

  return {
    calories: Math.round(calories),
    protein_g: Math.round(protein * 10) / 10,
    carbs_g: Math.round(carbs * 10) / 10,
    fat_g: Math.round(fat * 10) / 10,
    sodium_mg: Math.round(sodium),
  }
}

export function foodTypeSubtitle(item: CommonFoodItem, nutrition: FoodRecordNutrition): string {
  if (item.foodType === 'sauce') {
    return `調味料 · 約 ${nutrition.calories} kcal`
  }
  if (item.foodType === 'drink' && nutrition.calories <= 5) {
    return '0 kcal · 可快速加入喝水紀錄'
  }
  if (item.foodType === 'meal') {
    return '組合餐 · 熱量會依份量、飯量與醬汁估算'
  }
  if (item.foodType === 'staple') {
    return '主食 · 資料庫估算'
  }
  return `${item.category} · 約 ${nutrition.calories} kcal`
}
