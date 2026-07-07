import { BRAND_REGISTRY } from '@/lib/food-kb/brand-registry'
import type { RecommendationFoodV2 } from './types'

/** Known hallucinated / mis-attributed menu rows — never recommend. */
export const BLOCKED_MENU_IDS = new Set([
  'off-85c-雞排便當',
  '85度c-雞排便當',
  'off-kfc-香雞飯套餐',
  'off-kfc-燻雞蛋餅',
])

const brandCategory = new Map(BRAND_REGISTRY.map(b => [b.name_zh, b.category]))

/** Cafe-appropriate item name hints for coffee/bakery chains. */
const CAFE_FOOD_HINT =
  /麵包|吐司|三明治|貝果|蛋糕|可頌|司康|帕尼尼|沙拉|義大利麵|厚片|捲|派|塔|瑪芬|咖啡|拿鐵|美式|茶|可可|輕食/

/** Taiwanese lunchbox / fried items that coffee chains do not sell. */
const ABSURD_CAFE_MAIN = /便當|雞排|排骨|炸雞飯|香雞飯|滷肉|腿飯|雙主餐|刈包|割包|炸雞套餐|排骨飯|魚排/

export function isBrandMenuPlausible(item: RecommendationFoodV2): boolean {
  if (BLOCKED_MENU_IDS.has(item.id)) return false

  const category = brandCategory.get(item.brand)
  if (!category) return true

  if (category === 'coffee') {
    if (ABSURD_CAFE_MAIN.test(item.name)) return false
    if (
      item.meal_role === 'main_meal' &&
      /飯|便當|套餐/.test(item.name) &&
      !CAFE_FOOD_HINT.test(item.name)
    ) {
      return false
    }
  }

  if (category === 'bubble_tea') {
    if (item.meal_role === 'main_meal') return false
    if (ABSURD_CAFE_MAIN.test(item.name)) return false
  }

  return true
}
