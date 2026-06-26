import { scoreSatiety } from '@/lib/betterbit-food-score'
import type { FoodIntelligenceItemInput } from './types'
import { FRIED, SUGAR_DRINK } from './tags'

/** High-frequency / familiar items — rule-based, never default 100 */
const POPULARITY_HINTS: Array<{ pattern: RegExp; boost: number; cap: number }> = [
  { pattern: /大麥克|麥香雞|薯條|茶葉蛋|御飯糰|美式咖啡|拿鐵/, boost: 18, cap: 78 },
  { pattern: /雞腿|牛丼|便當|珍珠奶茶|紅茶/, boost: 12, cap: 72 },
  { pattern: /沙拉|三明治|關東煮/, boost: 8, cap: 65 },
]

const STORE_BOOST: Record<string, number> = {
  '7-11': 12,
  '全家': 12,
  '麥當勞': 10,
  '肯德基': 8,
  '星巴克': 8,
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function computePopularityScore(input: FoodIntelligenceItemInput): number {
  let score = 38
  score += STORE_BOOST[input.store] ?? 4
  if (input.source === 'convenience') score += 6

  for (const hint of POPULARITY_HINTS) {
    if (hint.pattern.test(input.name)) {
      score += hint.boost
      score = Math.min(score, hint.cap)
    }
  }

  const conf = input.verification?.confidence ?? input.nutrition_trace?.confidence
  if (conf === 'A') score += 4
  if (conf === 'D') score -= 30

  return clamp(score)
}

export function computeSatietyScore(input: FoodIntelligenceItemInput): number {
  const base = scoreSatiety({
    name: input.name,
    calories: input.calories,
    protein_g: input.protein_g,
    carbs_g: input.carbs_g,
    fat_g: input.fat_g,
    fiber_g: input.fiber_g,
    role: input.role,
    category: input.category,
    tags: input.tags,
  })

  let score = base
  if (SUGAR_DRINK.test(input.name)) score -= 25
  if (input.role === 'drink' || /奶茶|手搖/.test(input.name)) score -= 20
  if (input.calories > 0 && input.calories < 120 && input.protein_g < 8) score -= 15
  if (FRIED.test(input.name)) score -= 8

  return clamp(score)
}

export function isHighRisk(input: FoodIntelligenceItemInput, satiety: number): boolean {
  if (FRIED.test(input.name) && input.fat_g >= 22) return true
  if (SUGAR_DRINK.test(input.name)) return true
  if (input.calories >= 750 && input.protein_g < 20) return true
  if (satiety < 25 && input.calories > 200) return true
  const conf = input.verification?.confidence ?? input.nutrition_trace?.confidence
  if (conf === 'D') return true
  return false
}
