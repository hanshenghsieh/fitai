import {
  getDishTemplateById,
  getDishVariantById,
  normalizeDishLabel,
  resolveDishByLabel,
} from '@/lib/recommendation/dish-first/catalog'
import { resolveP0FoodByLabel } from '@/lib/nutrition/p0-common-foods/resolve-p0-food'
import type {
  CommonFoodItem,
  FoodRecordDraft,
  FoodType,
  ServingOption,
} from '@/lib/nutrition/p0-common-foods/types'

export type EstimateDishFamily =
  | 'hot_pot'
  | 'beef_noodle'
  | 'bento'
  | 'pasta'
  | 'curry_rice'
  | 'fried_rice'
  | 'ramen'
  | 'luwei_platter'
  | 'breakfast_set'
  | 'salad_meal'
  | 'generic_meal'
  | 'ingredient'
  | 'staple'
  | 'drink'
  | 'sauce'
  | 'snack'
  | 'unknown'

export type EstimateClassificationSource =
  | 'canonical'
  | 'alias'
  | 'dish_family'
  | 'keyword'
  | 'selected_metadata'
  | 'manual'
  | 'unknown'

export interface SelectedEstimateMetadata {
  canonicalName: string
  category?: string
  foodType?: FoodType
  sourceType?: CommonFoodItem['sourceType']
  calories: number
  protein_g: number
  carbs_g?: number
  fat_g?: number
  sodium_mg?: number
  aliases?: string[]
  dishTemplateId?: string
  dishVariantId?: string
}

export interface EstimateFoodClassification {
  foodType: FoodType | null
  family: EstimateDishFamily
  familyLabel: string
  source: EstimateClassificationSource
  confidence: 'high' | 'medium' | 'low'
  canonicalItem?: CommonFoodItem | null
  dishTemplateId?: string
  dishVariantId?: string
  selectedMetadata?: SelectedEstimateMetadata
}

interface MealProfile {
  family: EstimateDishFamily
  label: string
  estimatedWeightG: number
  calories: number
  protein: number
  carbs: number
  fat: number
  sodium: number
  assumption: string
}

const PORTION_MULTIPLIERS = {
  small: 0.8,
  normal: 1,
  large: 1.2,
} as const

const MEAL_PROFILES: Record<
  Extract<
    EstimateDishFamily,
    | 'hot_pot'
    | 'beef_noodle'
    | 'bento'
    | 'pasta'
    | 'curry_rice'
    | 'fried_rice'
    | 'ramen'
    | 'luwei_platter'
    | 'breakfast_set'
    | 'salad_meal'
    | 'generic_meal'
  >,
  MealProfile
> = {
  hot_pot: {
    family: 'hot_pot',
    label: '鍋物',
    estimatedWeightG: 650,
    calories: 750,
    protein: 32,
    carbs: 58,
    fat: 36,
    sodium: 1900,
    assumption: '以一人份鍋物估算；未明示時不包含白飯、冬粉或王子麵。',
  },
  beef_noodle: {
    family: 'beef_noodle',
    label: '湯麵',
    estimatedWeightG: 700,
    calories: 650,
    protein: 35,
    carbs: 75,
    fat: 26,
    sodium: 1800,
    assumption: '以一整碗牛肉麵估算，包含麵與一般份量湯料。',
  },
  bento: {
    family: 'bento',
    label: '便當',
    estimatedWeightG: 600,
    calories: 800,
    protein: 34,
    carbs: 88,
    fat: 32,
    sodium: 1250,
    assumption: '以一份含主菜、飯與配菜的便當估算。',
  },
  pasta: {
    family: 'pasta',
    label: '義大利麵',
    estimatedWeightG: 450,
    calories: 720,
    protein: 24,
    carbs: 92,
    fat: 26,
    sodium: 1050,
    assumption: '以一整盤含醬汁的義大利麵估算。',
  },
  curry_rice: {
    family: 'curry_rice',
    label: '咖哩飯',
    estimatedWeightG: 550,
    calories: 780,
    protein: 24,
    carbs: 105,
    fat: 28,
    sodium: 1300,
    assumption: '以一整盤咖哩飯估算，包含一般飯量與咖哩醬。',
  },
  fried_rice: {
    family: 'fried_rice',
    label: '炒飯',
    estimatedWeightG: 420,
    calories: 800,
    protein: 20,
    carbs: 100,
    fat: 35,
    sodium: 1150,
    assumption: '以一整盤炒飯估算。',
  },
  ramen: {
    family: 'ramen',
    label: '拉麵',
    estimatedWeightG: 700,
    calories: 750,
    protein: 30,
    carbs: 85,
    fat: 30,
    sodium: 2100,
    assumption: '以一整碗拉麵估算，包含麵、湯底與基本配料。',
  },
  luwei_platter: {
    family: 'luwei_platter',
    label: '滷味拼盤',
    estimatedWeightG: 450,
    calories: 550,
    protein: 26,
    carbs: 45,
    fat: 30,
    sodium: 1600,
    assumption: '以一份綜合滷味估算；只有名稱明示時才加入王子麵等主食。',
  },
  breakfast_set: {
    family: 'breakfast_set',
    label: '早餐套餐',
    estimatedWeightG: 450,
    calories: 650,
    protein: 24,
    carbs: 75,
    fat: 26,
    sodium: 1050,
    assumption: '以一份含主食、蛋白質與飲品的早餐套餐估算。',
  },
  salad_meal: {
    family: 'salad_meal',
    label: '沙拉餐',
    estimatedWeightG: 400,
    calories: 380,
    protein: 30,
    carbs: 28,
    fat: 16,
    sodium: 700,
    assumption: '以一份含蛋白質主菜與一般醬料的沙拉餐估算。',
  },
  generic_meal: {
    family: 'generic_meal',
    label: '完整餐點',
    estimatedWeightG: 550,
    calories: 700,
    protein: 28,
    carbs: 78,
    fat: 28,
    sodium: 1200,
    assumption: '以一份完整餐點估算；可展開進階欄位修正。',
  },
}

const FAMILY_LABELS: Record<EstimateDishFamily, string> = {
  hot_pot: '鍋物',
  beef_noodle: '湯麵',
  bento: '便當',
  pasta: '義大利麵',
  curry_rice: '咖哩飯',
  fried_rice: '炒飯',
  ramen: '拉麵',
  luwei_platter: '滷味拼盤',
  breakfast_set: '早餐套餐',
  salad_meal: '沙拉餐',
  generic_meal: '完整餐點',
  ingredient: '單一食材',
  staple: '主食',
  drink: '飲料',
  sauce: '醬料',
  snack: '零食',
  unknown: '未判定',
}

function familyForName(name: string): EstimateDishFamily | null {
  if (/臭臭鍋|小火鍋|個人鍋|火鍋|鍋物/.test(name)) return 'hot_pot'
  if (/(?:石頭|麻辣|牛奶|起司牛奶|海鮮|酸菜白肉|壽喜燒)?鍋$/.test(name)) return 'hot_pot'
  if (/牛肉麵/.test(name)) return 'beef_noodle'
  if (/便當|餐盒/.test(name)) return 'bento'
  if (/義大利麵|義式麵|pasta/i.test(name)) return 'pasta'
  if (/咖哩飯/.test(name)) return 'curry_rice'
  if (/炒飯/.test(name)) return 'fried_rice'
  if (/拉麵/.test(name)) return 'ramen'
  if (/滷味.*(?:拼盤|套餐)|(?:拼盤|套餐).*滷味/.test(name)) return 'luwei_platter'
  if (/早餐套餐|早餐組合|早午餐/.test(name)) return 'breakfast_set'
  if (/沙拉餐|沙拉套餐|雞胸沙拉|鮪魚沙拉|豆腐沙拉/.test(name)) return 'salad_meal'
  if (/套餐|拼盤|蓋飯|丼飯|燴飯|粥$|湯$|漢堡$|三明治$|水餃$|鍋貼$/.test(name)) return 'generic_meal'
  if (/(?:麵|飯)$/.test(name) && !/^(?:白飯|糙米飯|麵條)$/.test(name)) return 'generic_meal'
  if (/可樂雞翅|啤酒雞|(?:炒|燴|煎|烤).+(?:肉|雞|魚|蛋|菜)/.test(name)) return 'generic_meal'
  return null
}

function familyFromDish(category: string, name: string): EstimateDishFamily {
  return (
    familyForName(`${name} ${category}`) ??
    (/麵食/.test(category) ? 'generic_meal' : null) ??
    (/飯類/.test(category) ? 'generic_meal' : null) ??
    'generic_meal'
  )
}

function keywordType(name: string): { foodType: FoodType; family: EstimateDishFamily } | null {
  const mealFamily = familyForName(name)
  if (mealFamily) return { foodType: 'meal', family: mealFamily }
  if (/可樂|汽水|茶飲|奶茶|咖啡|拿鐵|豆漿|果汁|飲料|啤酒|牛奶$|水$/.test(name)) {
    return { foodType: 'drink', family: 'drink' }
  }
  if (/醬油|醬料|沙茶醬|辣椒醬|番茄醬|美乃滋|胡椒鹽|油膏/.test(name)) {
    return { foodType: 'sauce', family: 'sauce' }
  }
  if (/洋芋片|餅乾|巧克力|糖果|零食|爆米花|堅果包/.test(name)) {
    return { foodType: 'snack', family: 'snack' }
  }
  if (/^白飯$|糙米飯|地瓜|吐司|麵包|饅頭|燕麥|麵條$|冬粉$/.test(name)) {
    return { foodType: 'staple', family: 'staple' }
  }
  if (/雞胸肉|雞腿肉|牛肉$|豬肉$|魚肉|鮭魚|香蕉|蘋果|蛋$|豆腐$|青菜$/.test(name)) {
    return { foodType: 'ingredient', family: 'ingredient' }
  }
  return null
}

function sourceForDishName(input: string, canonicalName: string, aliases: string[]): 'canonical' | 'alias' {
  const normalized = normalizeDishLabel(input)
  if (normalized === normalizeDishLabel(canonicalName)) return 'canonical'
  return aliases.some(alias => normalizeDishLabel(alias) === normalized) ? 'alias' : 'canonical'
}

export function classifyEstimatedFood(
  name: string,
  selectedMetadata?: SelectedEstimateMetadata
): EstimateFoodClassification {
  const trimmed = name.trim()
  if (!trimmed) {
    return {
      foodType: null,
      family: 'unknown',
      familyLabel: FAMILY_LABELS.unknown,
      source: 'unknown',
      confidence: 'low',
    }
  }

  if (selectedMetadata) {
    const template = selectedMetadata.dishTemplateId
      ? getDishTemplateById(selectedMetadata.dishTemplateId)
      : null
    const variant = selectedMetadata.dishVariantId
      ? getDishVariantById(selectedMetadata.dishVariantId)
      : null
    const family = selectedMetadata.dishTemplateId === 'dish_hot_pot'
      ? 'hot_pot'
      : familyForName(
          `${selectedMetadata.canonicalName} ${selectedMetadata.category ?? ''} ${template?.category ?? ''} ${variant?.name ?? ''}`
        ) ?? (selectedMetadata.foodType === 'meal' ? 'generic_meal' : selectedMetadata.foodType ?? 'unknown')
    return {
      foodType: selectedMetadata.foodType ?? template?.foodType ?? (family === 'unknown' ? null : 'meal'),
      family,
      familyLabel: FAMILY_LABELS[family],
      source: 'selected_metadata',
      confidence: 'high',
      dishTemplateId: selectedMetadata.dishTemplateId,
      dishVariantId: selectedMetadata.dishVariantId,
      selectedMetadata,
    }
  }

  const dish = resolveDishByLabel(trimmed)
  if (dish.template) {
    const family = familyForName(trimmed) ??
      familyFromDish(dish.template.category, dish.variant?.name ?? dish.template.name)
    return {
      foodType: dish.template.foodType === 'snack' && family === 'luwei_platter'
        ? 'meal'
        : dish.template.foodType,
      family,
      familyLabel: FAMILY_LABELS[family],
      source: sourceForDishName(trimmed, dish.template.name, [
        ...dish.template.aliases,
        ...(dish.variant?.aliases ?? []),
        ...(dish.brandItem?.aliases ?? []),
      ]),
      confidence: 'high',
      dishTemplateId: dish.template.id,
    }
  }

  const p0 = resolveP0FoodByLabel(trimmed, { minScore: 101 })
  if (p0) {
    const family = p0.foodType === 'meal'
      ? familyForName(`${p0.name} ${p0.category}`) ?? 'generic_meal'
      : (p0.foodType as EstimateDishFamily)
    return {
      foodType: p0.foodType,
      family,
      familyLabel: FAMILY_LABELS[family],
      source: p0.name === trimmed ? 'canonical' : 'alias',
      confidence: 'high',
      canonicalItem: p0,
    }
  }

  const family = familyForName(trimmed)
  if (family) {
    return {
      foodType: 'meal',
      family,
      familyLabel: FAMILY_LABELS[family],
      source: 'dish_family',
      confidence: 'medium',
    }
  }

  const keyword = keywordType(trimmed)
  if (keyword) {
    return {
      foodType: keyword.foodType,
      family: keyword.family,
      familyLabel: FAMILY_LABELS[keyword.family],
      source: 'keyword',
      confidence: 'medium',
    }
  }

  return {
    foodType: null,
    family: 'unknown',
    familyLabel: FAMILY_LABELS.unknown,
    source: 'unknown',
    confidence: 'low',
  }
}

function mealProfileFor(
  name: string,
  classification: EstimateFoodClassification
): MealProfile {
  const family = classification.family in MEAL_PROFILES
    ? classification.family as keyof typeof MEAL_PROFILES
    : 'generic_meal'
  const base = { ...MEAL_PROFILES[family] }
  const dish = resolveDishByLabel(name)
  const template = dish.template

  if (classification.selectedMetadata) {
    const selected = classification.selectedMetadata
    base.calories = selected.calories
    base.protein = selected.protein_g
    base.carbs = selected.carbs_g ?? base.carbs
    base.fat = selected.fat_g ?? base.fat
    base.sodium = selected.sodium_mg ?? base.sodium
    base.assumption = `沿用已選搜尋結果「${selected.canonicalName}」的營養資料。`
  } else if (template) {
    base.calories = dish.variant?.typicalCalories.mid ?? template.typicalCalories.mid
    base.protein = dish.variant?.typicalProtein?.mid ?? template.typicalProtein?.mid ?? base.protein
    base.carbs = dish.variant?.typicalCarbs?.mid ?? template.typicalCarbs?.mid ?? base.carbs
    base.fat = dish.variant?.typicalFat?.mid ?? template.typicalFat?.mid ?? base.fat
  } else if (classification.canonicalItem?.foodType === 'meal') {
    const item = classification.canonicalItem
    if (
      (item.defaultUnit.toLowerCase() === 'g' || item.defaultUnit.toLowerCase() === 'ml') &&
      item.normalAmount >= 50
    ) {
      base.estimatedWeightG = item.normalAmount
    }
    base.calories = item.kcalDefault
    base.protein = item.proteinDefault_g
    base.carbs = item.carbsDefault_g
    base.fat = item.fatDefault_g
    base.sodium = item.sodiumDefault_mg
  }

  const explicitStarch = /白飯/.test(name)
    ? { weight: 200, calories: 280, carbs: 62 }
    : /王子麵/.test(name)
      ? { weight: 90, calories: 280, carbs: 42 }
      : /冬粉/.test(name)
        ? { weight: 160, calories: 180, carbs: 42 }
        : null
  if (explicitStarch && family === 'hot_pot') {
    base.estimatedWeightG += explicitStarch.weight
    base.calories += explicitStarch.calories
    base.carbs += explicitStarch.carbs
    base.assumption = `${base.assumption} 名稱已明示的主食已計入。`
  }
  return base
}

function wholeMealServingOptions(profile: MealProfile): ServingOption[] {
  return [
    {
      label: '小份',
      amount: PORTION_MULTIPLIERS.small,
      unit: '份',
      estimatedWeight_g: Math.round(profile.estimatedWeightG * PORTION_MULTIPLIERS.small),
    },
    {
      label: '一般',
      amount: PORTION_MULTIPLIERS.normal,
      unit: '份',
      estimatedWeight_g: profile.estimatedWeightG,
    },
    {
      label: '大份',
      amount: PORTION_MULTIPLIERS.large,
      unit: '份',
      estimatedWeight_g: Math.round(profile.estimatedWeightG * PORTION_MULTIPLIERS.large),
    },
    { label: '自訂', amount: null, unit: '份' },
  ]
}

function genericByType(name: string, foodType: FoodType): CommonFoodItem {
  const profile = {
    ingredient: { amounts: [100, 150, 220], unit: 'g', kcal: 200, protein: 8, carbs: 20, fat: 8, sodium: 300 },
    staple: { amounts: [100, 150, 220], unit: 'g', kcal: 150, protein: 3, carbs: 32, fat: 1, sodium: 20 },
    drink: { amounts: [250, 350, 500], unit: 'ml', kcal: 42, protein: 0, carbs: 10.5, fat: 0, sodium: 15 },
    sauce: { amounts: [5, 15, 30], unit: 'g', kcal: 120, protein: 3, carbs: 15, fat: 5, sodium: 3500 },
    snack: { amounts: [30, 50, 80], unit: 'g', kcal: 500, protein: 7, carbs: 55, fat: 28, sodium: 500 },
    meal: { amounts: [0.8, 1, 1.2], unit: '份', kcal: 700, protein: 28, carbs: 78, fat: 28, sodium: 1200 },
  }[foodType]
  const [small, normal, large] = profile.amounts
  const labels = foodType === 'sauce'
    ? ['小匙', '一大匙', '兩大匙']
    : foodType === 'snack'
      ? ['小包', '一般', '大包']
      : ['小份', '一般', '大份']

  return {
    id: `user-custom-${Date.now()}`,
    name,
    category: '自訂估算',
    foodType,
    sourceType: 'user_custom',
    aliases: [name],
    tags: [],
    servingModel: foodType === 'meal' ? 'whole_meal' : foodType === 'drink' ? 'volume' : 'weight',
    defaultServing: { amount: normal, unit: profile.unit },
    servingOptions: [
      { label: labels[0]!, amount: small, unit: profile.unit },
      { label: labels[1]!, amount: normal, unit: profile.unit },
      { label: labels[2]!, amount: large, unit: profile.unit },
      { label: '自訂', amount: null, unit: profile.unit },
    ],
    baseAmount: foodType === 'meal' ? 1 : 100,
    baseUnit: profile.unit,
    kcalBase: profile.kcal,
    proteinBase_g: profile.protein,
    fatBase_g: profile.fat,
    carbsBase_g: profile.carbs,
    sodiumBase_mg: profile.sodium,
    smallAmount: small,
    normalAmount: normal,
    largeAmount: large,
    defaultUnit: profile.unit,
    kcalDefault: profile.kcal,
    proteinDefault_g: profile.protein,
    fatDefault_g: profile.fat,
    carbsDefault_g: profile.carbs,
    sodiumDefault_mg: profile.sodium,
    supportsOilOptions: foodType === 'ingredient',
    supportsCookingMethod: foodType === 'ingredient',
    supportsSauce: false,
    supportsRiceAmount: false,
    supportsSugarLevel: foodType === 'drink',
    supportsToppings: foodType === 'drink',
  }
}

export function createEstimatedFoodItem(
  name: string,
  classification: EstimateFoodClassification,
  overrideType?: FoodType
): CommonFoodItem {
  const trimmed = name.trim()
  const foodType = overrideType ?? classification.foodType ?? 'staple'
  if (foodType !== 'meal') {
    const canonical = classification.canonicalItem
    if (canonical && canonical.foodType === foodType) {
      return {
        ...canonical,
        id: `user-custom-${Date.now()}`,
        name: trimmed,
        sourceType: 'user_custom',
      }
    }
    return genericByType(trimmed, foodType)
  }

  const effectiveClassification = overrideType === 'meal' && classification.foodType !== 'meal'
    ? {
        ...classification,
        foodType: 'meal' as const,
        family: 'generic_meal' as const,
        familyLabel: FAMILY_LABELS.generic_meal,
        source: 'manual' as const,
      }
    : classification
  const profile = mealProfileFor(trimmed, effectiveClassification)

  return {
    id: `user-custom-${Date.now()}`,
    name: trimmed,
    canonicalName: effectiveClassification.selectedMetadata?.canonicalName,
    category: effectiveClassification.selectedMetadata?.category ?? profile.label,
    foodType: 'meal',
    sourceType: effectiveClassification.selectedMetadata?.sourceType ?? 'user_custom',
    aliases: [
      trimmed,
      ...(effectiveClassification.selectedMetadata?.aliases ?? []),
    ],
    tags: [profile.family],
    servingModel: 'whole_meal',
    dishFamily: profile.family,
    estimationAssumption: profile.assumption,
    estimatedWeight_g: profile.estimatedWeightG,
    defaultServing: { amount: 1, unit: '份' },
    servingOptions: wholeMealServingOptions(profile),
    baseAmount: 1,
    baseUnit: '份',
    kcalBase: profile.calories,
    proteinBase_g: profile.protein,
    fatBase_g: profile.fat,
    carbsBase_g: profile.carbs,
    sodiumBase_mg: profile.sodium,
    smallAmount: PORTION_MULTIPLIERS.small,
    normalAmount: PORTION_MULTIPLIERS.normal,
    largeAmount: PORTION_MULTIPLIERS.large,
    defaultUnit: '份',
    kcalDefault: profile.calories,
    proteinDefault_g: profile.protein,
    fatDefault_g: profile.fat,
    carbsDefault_g: profile.carbs,
    sodiumDefault_mg: profile.sodium,
    supportsOilOptions: false,
    supportsCookingMethod: false,
    supportsSauce: false,
    supportsRiceAmount: false,
    supportsSugarLevel: false,
    supportsToppings: false,
  }
}

export function estimatedWeightForDraft(
  item: CommonFoodItem,
  draft: Pick<FoodRecordDraft, 'amount'>
): number | null {
  if (item.servingModel !== 'whole_meal' || !item.estimatedWeight_g) return null
  return Math.round(item.estimatedWeight_g * draft.amount)
}

export const FOOD_TYPE_EXAMPLES: Record<FoodType, string> = {
  meal: '完整一餐，例如牛肉麵、便當、鍋物',
  ingredient: '單一食物，例如雞胸肉、香蕉',
  staple: '單獨澱粉，例如白飯、麵包、地瓜',
  sauce: '調味用，例如醬油、沙茶醬',
  drink: '杯、瓶或罐裝飲品',
  snack: '包裝零食或單份點心',
}

