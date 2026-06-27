/**
 * Food Category Guard — blocks cross-category photo/search candidates (P0).
 */
import { normalizeFoodName } from '@/lib/food-kb/normalize'

export type FoodCategory =
  | 'burger'
  | 'sandwich'
  | 'sushi'
  | 'rice_bowl'
  | 'bento'
  | 'noodle'
  | 'soup'
  | 'dumpling'
  | 'fried_food'
  | 'drink'
  | 'dessert'
  | 'salad'
  | 'hotpot'
  | 'bbq'
  | 'convenience_item'
  | 'unknown'

export type CategoryConfidence = 'high' | 'medium' | 'low'

const SUSHI_RE = /壽司|sushi|爭鮮|藏壽司|壽司郎|握壽司|生魚片|海苔|醋飯/i
const BURGER_RE = /漢堡|burger|摩斯|MOS|麥當勞|肯德基|漢堡王|起司堡|牛肉堡/i
const SANDWICH_RE = /三明治|subway|潛艇堡/i
const RICE_BOWL_RE = /飯|丼|蓋飯|便當飯/i
const BENTO_RE = /便當|定食套餐/i
const NOODLE_RE = /麵|拉麵|烏龍|米粉|河粉|義大利麵/i
const SOUP_RE = /湯|羹/i
const DRINK_RE = /飲|茶|咖啡|奶茶|果汁|可樂|汽水|拿鐵|手搖/i
const DESSERT_RE = /甜點|蛋糕|布丁|冰淇淋|餅乾|馬卡龍/i
const DUMPLING_RE = /餃|水餃|鍋貼/i
const FRIED_RE = /炸|鹽酥|雞排|薯條/i
const HOTPOT_RE = /火鍋|涮涮鍋/i
const BBQ_RE = /燒烤|串燒|烤肉/i
const SALAD_RE = /沙拉|salad/i
const CONVENIENCE_RE = /7-11|7 eleven|全家|familymart|便利商店/i

/** Hard incompatible pairs (either direction). */
const INCOMPATIBLE_PAIRS: Array<[FoodCategory, FoodCategory]> = [
  ['burger', 'sushi'],
  ['burger', 'noodle'],
  ['burger', 'drink'],
  ['burger', 'soup'],
  ['burger', 'dessert'],
  ['burger', 'rice_bowl'],
  ['burger', 'bento'],
  ['sushi', 'burger'],
  ['sushi', 'drink'],
  ['sushi', 'noodle'],
  ['drink', 'bento'],
  ['drink', 'rice_bowl'],
  ['drink', 'burger'],
  ['soup', 'burger'],
  ['soup', 'dessert'],
  ['dessert', 'soup'],
  ['hotpot', 'drink'],
  ['hotpot', 'dessert'],
]

const WEAK_COMPAT: Array<[FoodCategory, FoodCategory]> = [
  ['burger', 'sandwich'],
  ['sandwich', 'burger'],
  ['bento', 'rice_bowl'],
  ['rice_bowl', 'bento'],
  ['fried_food', 'burger'],
  ['burger', 'fried_food'],
]

function pairKey(a: FoodCategory, b: FoodCategory): string {
  return `${a}::${b}`
}

const INCOMPATIBLE_SET = new Set(
  INCOMPATIBLE_PAIRS.map(([a, b]) => pairKey(a, b))
)

const WEAK_COMPAT_SET = new Set(
  WEAK_COMPAT.map(([a, b]) => pairKey(a, b))
)

export function inferCategoryFromText(text: string): FoodCategory {
  const t = text.trim()
  if (!t) return 'unknown'
  if (SUSHI_RE.test(t)) return 'sushi'
  if (BURGER_RE.test(t)) return 'burger'
  if (SANDWICH_RE.test(t)) return 'sandwich'
  if (BENTO_RE.test(t)) return 'bento'
  if (RICE_BOWL_RE.test(t)) return 'rice_bowl'
  if (NOODLE_RE.test(t)) return 'noodle'
  if (SOUP_RE.test(t)) return 'soup'
  if (DRINK_RE.test(t)) return 'drink'
  if (DESSERT_RE.test(t)) return 'dessert'
  if (DUMPLING_RE.test(t)) return 'dumpling'
  if (FRIED_RE.test(t)) return 'fried_food'
  if (HOTPOT_RE.test(t)) return 'hotpot'
  if (BBQ_RE.test(t)) return 'bbq'
  if (SALAD_RE.test(t)) return 'salad'
  if (CONVENIENCE_RE.test(t)) return 'convenience_item'
  return 'unknown'
}

export function inferCategoryFromCandidate(name: string, store?: string): FoodCategory {
  const combined = `${store ?? ''} ${name}`.trim()
  return inferCategoryFromText(combined)
}

export function areCategoriesCompatible(visual: FoodCategory, candidate: FoodCategory): boolean {
  if (visual === 'unknown' || candidate === 'unknown') return true
  if (visual === candidate) return true
  if (INCOMPATIBLE_SET.has(pairKey(visual, candidate))) return false
  if (WEAK_COMPAT_SET.has(pairKey(visual, candidate))) return true
  // Same broad meal types
  if (visual === 'bento' && candidate === 'rice_bowl') return true
  if (visual === 'rice_bowl' && candidate === 'bento') return true
  return false
}

export function filterByVisualCategory<T extends { name: string; store?: string }>(
  candidates: T[],
  visualCategory: FoodCategory
): T[] {
  if (visualCategory === 'unknown') return candidates
  return candidates.filter(c => {
    const cat = inferCategoryFromCandidate(c.name, c.store)
    return areCategoriesCompatible(visualCategory, cat)
  })
}

export function categoryGuardMessage(visualCategory: FoodCategory): string {
  const label =
    visualCategory === 'burger'
      ? '漢堡類餐點'
      : visualCategory === 'sushi'
        ? '壽司類餐點'
        : visualCategory === 'drink'
          ? '飲品'
          : visualCategory === 'noodle'
            ? '麵食'
            : '這類餐點'
  return `我看得出這像${label}，但目前沒有可信營養資料。`
}

export function userLabelMatchesVerified(userInput: string, verifiedName: string): boolean {
  const a = normalizeFoodName(userInput)
  const b = normalizeFoodName(verifiedName)
  if (!a || !b) return false
  return a === b
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  'burger',
  'sandwich',
  'sushi',
  'rice_bowl',
  'bento',
  'noodle',
  'soup',
  'dumpling',
  'fried_food',
  'drink',
  'dessert',
  'salad',
  'hotpot',
  'bbq',
  'convenience_item',
  'unknown',
]
