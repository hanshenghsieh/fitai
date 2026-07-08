import type { CommonFoodItem, FoodType } from '@/lib/nutrition/p0-common-foods/types'

export interface FoodTypeFieldVisibility {
  portionLabel: string
  portion: boolean
  oil: boolean
  cooking: boolean
  sauce: boolean
  rice: boolean
  sugar: boolean
  toppings: boolean
  mealHint?: string
  advancedFields: Array<'calories' | 'protein' | 'carbs' | 'fat' | 'sodium'>
}

type FieldItem = Pick<
  CommonFoodItem,
  | 'foodType'
  | 'supportsOilOptions'
  | 'supportsCookingMethod'
  | 'supportsSauce'
  | 'supportsRiceAmount'
  | 'supportsSugarLevel'
  | 'supportsToppings'
>

export function getFoodTypeFieldVisibility(item: FieldItem): FoodTypeFieldVisibility {
  const { foodType } = item

  if (foodType === 'sauce') {
    return {
      portionLabel: '用量',
      portion: true,
      oil: false,
      cooking: false,
      sauce: false,
      rice: false,
      sugar: false,
      toppings: false,
      advancedFields: ['calories', 'sodium'],
    }
  }

  if (foodType === 'drink') {
    return {
      portionLabel: '容量',
      portion: true,
      oil: false,
      cooking: false,
      sauce: false,
      rice: false,
      sugar: item.supportsSugarLevel,
      toppings: item.supportsToppings,
      advancedFields: ['calories'],
    }
  }

  if (foodType === 'snack') {
    return {
      portionLabel: '份量',
      portion: true,
      oil: false,
      cooking: item.supportsCookingMethod,
      sauce: false,
      rice: false,
      sugar: false,
      toppings: false,
      advancedFields: ['calories', 'protein', 'carbs', 'fat', 'sodium'],
    }
  }

  if (foodType === 'staple') {
    return {
      portionLabel: '份量',
      portion: true,
      oil: item.supportsOilOptions,
      cooking: item.supportsCookingMethod,
      sauce: item.supportsSauce,
      rice: false,
      sugar: false,
      toppings: false,
      advancedFields: ['calories', 'protein', 'carbs', 'fat', 'sodium'],
    }
  }

  if (foodType === 'meal') {
    return {
      portionLabel: '份量',
      portion: true,
      oil: false,
      cooking: item.supportsCookingMethod,
      sauce: item.supportsSauce,
      rice: item.supportsRiceAmount,
      sugar: false,
      toppings: false,
      mealHint: '這是組合餐，熱量會依份量、飯量與醬汁估算。',
      advancedFields: ['calories', 'protein', 'carbs', 'fat', 'sodium'],
    }
  }

  return {
    portionLabel: '份量',
    portion: true,
    oil: item.supportsOilOptions,
    cooking: item.supportsCookingMethod,
    sauce: item.supportsSauce,
    rice: false,
    sugar: false,
    toppings: false,
    advancedFields: ['calories', 'protein', 'carbs', 'fat', 'sodium'],
  }
}

export const FOOD_TYPE_LABELS: Record<FoodType, string> = {
  meal: '主餐',
  ingredient: '單一食材',
  staple: '主食',
  sauce: '醬料',
  drink: '飲料',
  snack: '零食',
}

/** Home-cooked / composite meals — hide oil & sauce for drinks; staples skip fry options. */
export function getHomeCookedFieldVisibility(draft: {
  ingredients: Array<{ raw_label: string; category: string; unit: string }>
}): {
  portionLabel: string
  oil: boolean
  cooking: boolean
  sauce: boolean
} {
  const lines = draft.ingredients.filter(i => i.raw_label.trim())
  const drinkLike =
    lines.length > 0 &&
    lines.every(
      l =>
        l.unit === 'ml' ||
        /茶|咖啡|奶|飲|汁|可樂|汽水|拿鐵|美式|紅茶|綠茶|奶茶|豆漿/.test(l.raw_label)
    )
  if (drinkLike) {
    return { portionLabel: '容量', oil: false, cooking: false, sauce: false }
  }

  const stapleOnly =
    lines.length === 1 && (lines[0]?.category === 'carb' || /飯|麵|粥|吐司|饅頭/.test(lines[0]?.raw_label ?? ''))
  if (stapleOnly) {
    return { portionLabel: '份量', oil: false, cooking: false, sauce: false }
  }

  return { portionLabel: '份量', oil: true, cooking: true, sauce: true }
}
