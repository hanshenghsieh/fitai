import type { DietTag, FoodCategory, ProcessingLevel } from './types'

const FRIED = /炸|咔啦|鹽酥|香雞排|薯條|炸雞|炸豬|排骨酥/
const SUGAR_DRINK = /珍奶|珍珠奶茶|奶茶|全糖|半糖|黑糖|布丁|蛋糕|甜甜圈|蛋塔|冰淇淋|可樂|汽水/
const SUGAR_FREE = /無糖|微糖|0糖|少糖/
const DRINK = /飲料|咖啡|拿鐵|果汁|豆漿|牛奶|可樂|汽水|紅茶|綠茶|奶茶/
const LEAN_PROTEIN = /雞胸|舒肥雞|茶葉蛋|水煮蛋|鮭魚|鮪魚|蛋白|蒸|沙拉/
const VEG = /沙拉|蔬菜|蔬食|青菜|燙青菜/
const BEEF_NOODLE = /牛肉麵/
const BUBBLE_TEA_STORE = /50嵐|清心|CoCo|可不可|迷客夏|大苑子|手搖/

export interface TagInput {
  name: string
  store: string
  source?: string
  role?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
}

export function inferFoodCategory(input: TagInput): FoodCategory {
  const n = input.name
  if (/茶葉蛋|水煮蛋|滷蛋/.test(n)) return '配菜'
  if (BUBBLE_TEA_STORE.test(input.store) || (/奶茶|手搖|珍奶/.test(n) && DRINK.test(n))) return '手搖飲'
  if (input.source === 'convenience') return '便利商店商品'
  if (/火鍋|關東煮|涮|鍋物/.test(n)) return '火鍋料'
  if (SUGAR_DRINK.test(n) && DRINK.test(n)) return '甜點'
  if (DRINK.test(n) || input.role === 'drink') return '飲料'
  if (/蛋糕|甜甜圈|蛋塔|布丁|冰淇淋|瑪芬|可頌|麵包/.test(n)) return '甜點'
  if (/茶葉蛋|滷蛋|沙拉|小菜|配菜|燙青菜|.side/.test(n) || input.role === 'side') return '配菜'
  if (/三明治|飯糰|蛋餅|燒餅|油條|粥|豆漿|早餐/.test(n) || input.role === 'breakfast') return '早餐'
  if (input.role === 'protein' || /雞胸|茶葉蛋|蛋/.test(n)) return '副餐'
  if (/便當|丼|飯|麵|堡|套餐|定食|拉麵|潛艇堡/.test(n) || input.role === 'combo') return '主餐'
  return '主餐'
}

export function inferProcessingLevel(input: TagInput, category: FoodCategory): ProcessingLevel {
  const n = input.name
  if (/茶葉蛋|水煮蛋|沙拉|燙青菜|地瓜|水果|鮭魚|雞胸/.test(n) && !FRIED.test(n)) return 'whole_food'
  if (category === '手搖飲' || SUGAR_DRINK.test(n)) return 'ultra_processed'
  if (FRIED.test(n) || /泡麵|火腿|香腸|培根|加工/.test(n)) return 'ultra_processed'
  if (/便當|堡|麵|飯|三明治/.test(n)) return 'processed'
  if (category === '便利商店商品') return 'processed'
  return 'lightly_processed'
}

export function inferDietTags(input: TagInput, category: FoodCategory, processing: ProcessingLevel): DietTag[] {
  const tags = new Set<DietTag>()
  const n = input.name
  const cal = Math.max(input.calories, 1)
  const proteinPct = (input.protein_g * 4) / cal
  const fatPct = (input.fat_g * 9) / cal
  const sugarG = input.sugar_g ?? (SUGAR_DRINK.test(n) ? 25 : 0)

  if (input.protein_g >= 25 || proteinPct >= 0.22) tags.add('high_protein')
  if (input.calories <= 350) tags.add('low_calorie')
  if (input.fat_g <= 12 || fatPct <= 0.28) tags.add('low_fat')
  if (SUGAR_FREE.test(n) || sugarG <= 5) tags.add('low_sugar')
  if ((input.fiber_g ?? 0) >= 5) tags.add('high_fiber')
  if (tags.has('high_protein') && tags.has('low_calorie') && !FRIED.test(n)) tags.add('weight_loss')
  if (input.protein_g >= 28 && input.fat_g <= 18) tags.add('post_workout')
  if (input.protein_g >= 15 && input.carbs_g >= 30 && input.fat_g <= 12) tags.add('pre_workout')
  if (/素|蔬|豆腐|豆漿/.test(n) && !/雞|牛|豬|魚|蝦|鮪|鮭/.test(n)) tags.add('vegetarian')
  if (DRINK.test(n) || category === '飲料' || category === '手搖飲') tags.add('drink')
  if (category === '甜點' || SUGAR_DRINK.test(n)) tags.add('dessert')
  if (FRIED.test(n)) tags.add('fried')
  if (processing === 'processed' || processing === 'ultra_processed') tags.add('processed')
  if ((input.sodium_mg ?? 0) >= 800) tags.add('high_sodium')

  if (input.protein_g >= 18 && input.calories >= 200 && !tags.has('drink')) tags.add('high_satiety')

  return [...tags]
}

export { FRIED, SUGAR_DRINK, DRINK, LEAN_PROTEIN, BEEF_NOODLE, BUBBLE_TEA_STORE }
