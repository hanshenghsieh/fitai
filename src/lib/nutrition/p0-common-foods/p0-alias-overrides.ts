import type { CommonFoodItem } from './types'

export type P0ItemOverride = Partial<
  Pick<
    CommonFoodItem,
    | 'name'
    | 'category'
    | 'foodType'
    | 'aliases'
    | 'defaultServing'
    | 'servingOptions'
    | 'baseAmount'
    | 'baseUnit'
    | 'kcalBase'
    | 'proteinBase_g'
    | 'fatBase_g'
    | 'carbsBase_g'
    | 'sodiumBase_mg'
    | 'smallAmount'
    | 'normalAmount'
    | 'largeAmount'
    | 'defaultUnit'
    | 'kcalDefault'
    | 'proteinDefault_g'
    | 'fatDefault_g'
    | 'carbsDefault_g'
    | 'sodiumDefault_mg'
    | 'supportsOilOptions'
    | 'supportsCookingMethod'
    | 'supportsSauce'
    | 'supportsRiceAmount'
    | 'supportsSugarLevel'
    | 'supportsToppings'
  >
>

/** Canonical fixes on top of P0 seed rows (do not edit the 1MB seed JSON). */
export const P0_ITEM_OVERRIDES: Record<string, P0ItemOverride> = {
  bb_p0_0001: {
    aliases: ['beef short rib', 'beef short ribs', 'short ribs'],
  },
  bb_p0_0011: {
    aliases: ['板腱牛排', '板腱', 'blade steak', 'flat iron steak'],
  },
  bb_p0_0012: {
    aliases: ['沙朗牛', '沙朗', 'sirloin', 'sirloin steak'],
  },
  bb_p0_0013: {
    aliases: [
      '菲力牛',
      '菲力',
      '牛菲力',
      '牛里肌',
      '牛柳',
      '菲力排',
      '菲力牛肉',
      'tenderloin',
      'beef tenderloin',
      'filet mignon',
      'fillet steak',
      'tenderloin steak',
    ],
    kcalBase: 205,
    proteinBase_g: 27,
    fatBase_g: 10,
    carbsBase_g: 0,
    sodiumBase_mg: 55,
    kcalDefault: 308,
    proteinDefault_g: 40.5,
    fatDefault_g: 15,
    carbsDefault_g: 0,
    sodiumDefault_mg: 83,
  },
  bb_p0_0014: {
    aliases: ['肋眼', 'ribeye', 'rib eye', 'ribeye steak'],
  },
  bb_p0_0015: {
    aliases: ['紐約客', 'new york strip', 'strip steak', 'ny strip'],
  },
  bb_p0_0281: {
    supportsSauce: false,
    supportsRiceAmount: false,
    supportsOilOptions: false,
    supportsCookingMethod: false,
  },
  bb_p0_0301: {
    foodType: 'staple',
    supportsSauce: false,
    supportsRiceAmount: false,
    supportsOilOptions: false,
    supportsCookingMethod: false,
  },
  bb_p0_0349: {
    supportsSauce: false,
    supportsOilOptions: false,
    supportsCookingMethod: false,
  },
  bb_p0_0422: {
    foodType: 'staple',
    category: '主食',
    supportsOilOptions: false,
    supportsCookingMethod: false,
    supportsSauce: false,
  },
  bb_p0_0531: {
    foodType: 'staple',
    category: '主食 / 麵食',
    aliases: [
      '白饅頭',
      '蒸饅頭',
      'mantou',
      'steamed bun',
      'Chinese steamed bun',
    ],
    defaultServing: { amount: 100, unit: 'g' },
    servingOptions: [
      { label: '小顆', amount: 70, unit: 'g' },
      { label: '一般', amount: 100, unit: 'g' },
      { label: '大顆', amount: 130, unit: 'g' },
      { label: '自訂', amount: null, unit: 'g' },
    ],
    smallAmount: 70,
    normalAmount: 100,
    largeAmount: 130,
    defaultUnit: 'g',
    baseAmount: 100,
    baseUnit: 'g',
    kcalBase: 220,
    proteinBase_g: 6.5,
    fatBase_g: 1.0,
    carbsBase_g: 47,
    sodiumBase_mg: 150,
    kcalDefault: 220,
    proteinDefault_g: 6.5,
    fatDefault_g: 1.0,
    carbsDefault_g: 47,
    sodiumDefault_mg: 150,
    supportsOilOptions: false,
    supportsCookingMethod: false,
    supportsSauce: false,
    supportsRiceAmount: false,
  },
  /** 菜包 — 單顆點心，非組合餐（seed 誤設 600 kcal + 醬汁） */
  bb_p0_0530: {
    foodType: 'snack',
    category: '台式小吃 / 包子',
    aliases: ['高麗菜包', '素菜包'],
    defaultServing: { amount: 1, unit: '顆' },
    servingOptions: [
      { label: '小顆', amount: 1, unit: '顆' },
      { label: '一般', amount: 1, unit: '顆' },
      { label: '大顆', amount: 1, unit: '顆' },
      { label: '自訂', amount: null, unit: '顆' },
    ],
    smallAmount: 0.85,
    normalAmount: 1,
    largeAmount: 1.2,
    defaultUnit: '顆',
    baseAmount: 1,
    baseUnit: 'serving',
    kcalBase: 200,
    proteinBase_g: 7,
    fatBase_g: 5,
    carbsBase_g: 32,
    sodiumBase_mg: 420,
    kcalDefault: 200,
    proteinDefault_g: 7,
    fatDefault_g: 5,
    carbsDefault_g: 32,
    sodiumDefault_mg: 420,
    supportsOilOptions: false,
    supportsCookingMethod: false,
    supportsSauce: false,
    supportsRiceAmount: false,
  },
  /** 肉包 — 單顆點心 */
  bb_p0_0529: {
    foodType: 'snack',
    category: '台式小吃 / 包子',
    aliases: ['豬肉包'],
    defaultServing: { amount: 1, unit: '顆' },
    servingOptions: [
      { label: '小顆', amount: 1, unit: '顆' },
      { label: '一般', amount: 1, unit: '顆' },
      { label: '大顆', amount: 1, unit: '顆' },
      { label: '自訂', amount: null, unit: '顆' },
    ],
    smallAmount: 0.85,
    normalAmount: 1,
    largeAmount: 1.2,
    defaultUnit: '顆',
    baseAmount: 1,
    baseUnit: 'serving',
    kcalBase: 280,
    proteinBase_g: 12,
    fatBase_g: 10,
    carbsBase_g: 30,
    sodiumBase_mg: 520,
    kcalDefault: 280,
    proteinDefault_g: 12,
    fatDefault_g: 10,
    carbsDefault_g: 30,
    sodiumDefault_mg: 520,
    supportsOilOptions: false,
    supportsCookingMethod: false,
    supportsSauce: false,
    supportsRiceAmount: false,
  },
  /** 包子 — 單顆點心（通用） */
  bb_p0_0528: {
    foodType: 'snack',
    category: '台式小吃 / 包子',
    defaultServing: { amount: 1, unit: '顆' },
    servingOptions: [
      { label: '小顆', amount: 1, unit: '顆' },
      { label: '一般', amount: 1, unit: '顆' },
      { label: '大顆', amount: 1, unit: '顆' },
      { label: '自訂', amount: null, unit: '顆' },
    ],
    smallAmount: 0.85,
    normalAmount: 1,
    largeAmount: 1.2,
    defaultUnit: '顆',
    baseAmount: 1,
    baseUnit: 'serving',
    kcalBase: 240,
    proteinBase_g: 9,
    fatBase_g: 8,
    carbsBase_g: 32,
    sodiumBase_mg: 480,
    kcalDefault: 240,
    proteinDefault_g: 9,
    fatDefault_g: 8,
    carbsDefault_g: 32,
    sodiumDefault_mg: 480,
    supportsOilOptions: false,
    supportsCookingMethod: false,
    supportsSauce: false,
    supportsRiceAmount: false,
  },
}

/** Seed rows in 主食 categories wrongly marked meal — reclassify unless overridden. */
const STAPLE_CATEGORY_RE = /主食|飯類|麵食|麵包/

export function applyStapleCategoryHeuristic(item: CommonFoodItem): CommonFoodItem {
  if (item.foodType !== 'meal') return item
  if (!STAPLE_CATEGORY_RE.test(item.category) && !STAPLE_CATEGORY_RE.test(item.name)) return item
  const plainStapleNames = /^(白飯|糙米飯|麵|吐司|饅頭|飯糰|地瓜|馬鈴薯|玉米)$/
  if (!plainStapleNames.test(item.name)) return item
  return {
    ...item,
    foodType: 'staple',
    supportsSauce: false,
    supportsRiceAmount: false,
    supportsOilOptions: item.supportsOilOptions && /炒|炸|煎/.test(item.name) ? true : false,
    supportsCookingMethod: false,
  }
}
