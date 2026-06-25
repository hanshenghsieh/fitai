/**
 * Diet score (減脂分數) — 0–100 with green/yellow/red signal.
 * Pure logic; no DB or UI side effects.
 */

export type DietScoreSignal = 'green' | 'yellow' | 'red'

export interface DietScoreInput {
  calories: number
  protein_g: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number
  sugar_g?: number
  name?: string
}

export interface DietScoreResult {
  score: number
  signal: DietScoreSignal
  label: string
}

const WEIGHTS = {
  protein: 0.3,
  fiber: 0.2,
  satiety: 0.2,
  fat: 0.1,
  carb: 0.1,
  sugar: 0.1,
} as const

const FRIED = /炸|薯條|鹽酥|香雞|雞排|排骨酥|泡麵|方便麵|酥炸/
const SUGAR_DRINK = /手搖|珍奶|奶茶|黑糖|全糖|半糖|含糖|可樂|汽水/
const SWEET_BREAKFAST = /法式吐司|吐司套餐|可頌|馬卡龍|马卡龍|鬆餅|鬆饼/
const DESSERT = /蛋糕|甜甜圈|冰淇淋|布丁|蛋塔|甜點|酥(?!皮)/
const LEAN_HIGH = /雞胸|茶葉蛋|茶蛋|地瓜|番薯|無糖豆漿|水煮|蒸雞|舒肥/
const BENTO_MEAL = /便當|套餐|定食|正餐|飯|麵|拉麵|牛肉麵/
const LOW_CAL_HIGH_PROTEIN = /雞胸|茶葉蛋|茶蛋|蛋白|鮭魚|鮪魚|沙拉/

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

function roundScore(n: number): number {
  return Math.round(clamp(n))
}

function hasMacroData(input: DietScoreInput): boolean {
  return (
    input.calories > 0 &&
    (input.protein_g > 0 ||
      input.carbs_g != null ||
      input.fat_g != null ||
      input.fiber_g != null ||
      input.sugar_g != null)
  )
}

function proteinSubScore(input: DietScoreInput): number {
  const { calories, protein_g } = input
  if (calories <= 0 && protein_g <= 0) return 50
  const density = calories > 0 ? (protein_g / calories) * 100 : 0
  const densityScore = clamp(density * 9.5)
  const absoluteScore = clamp(protein_g * 2.5, 0, 40)
  return clamp(densityScore * 0.6 + absoluteScore)
}

function fiberSubScore(input: DietScoreInput): number | null {
  if (input.fiber_g != null) {
    return clamp(input.fiber_g * 12, 0, 100)
  }
  const name = input.name ?? ''
  if (/沙拉|蔬菜|青菜|花椰|高麗|地瓜|番薯|燕麥/.test(name)) return 72
  return null
}

function satietySubScore(input: DietScoreInput): number {
  const calories = Math.max(input.calories, 1)
  const proteinShare = (input.protein_g * 4) / calories
  let score = proteinSubScore(input) * 0.5
  if (proteinShare >= 0.28) score += 18
  else if (proteinShare >= 0.18) score += 10
  const fiber = input.fiber_g ?? (fiberSubScore(input) != null ? (fiberSubScore(input)! / 12) : 0)
  score += clamp(fiber * 6, 0, 20)
  if (LEAN_HIGH.test(input.name ?? '')) score += 8
  return clamp(score)
}

function fatSubScore(input: DietScoreInput): number | null {
  if (input.fat_g == null || input.calories <= 0) return null
  const fatPct = (input.fat_g * 9) / input.calories
  if (fatPct >= 0.18 && fatPct <= 0.38) return 85
  if (fatPct < 0.18) return 70
  if (fatPct <= 0.5) return 55
  return clamp(40 - (fatPct - 0.5) * 80)
}

function carbSubScore(input: DietScoreInput): number | null {
  if (input.carbs_g == null || input.calories <= 0) return null
  const carbPct = (input.carbs_g * 4) / input.calories
  if (carbPct <= 0.45) return 88
  if (carbPct <= 0.55) return 72
  if (carbPct <= 0.65) return 58
  return clamp(45 - (carbPct - 0.65) * 60)
}

function sugarSubScore(input: DietScoreInput): number | null {
  if (input.sugar_g != null) {
    if (input.sugar_g <= 5) return 92
    if (input.sugar_g <= 12) return 70
    if (input.sugar_g <= 25) return 48
    return clamp(30 - (input.sugar_g - 25))
  }
  const name = input.name ?? ''
  if (SUGAR_DRINK.test(name) || DESSERT.test(name)) return 25
  if (SWEET_BREAKFAST.test(name)) return 52
  if (/無糖|微糖|少糖/.test(name)) return 78
  return null
}

/** Name-only fallback when macro data is insufficient. */
export function inferDietScoreFromFoodName(name: string, calories = 0): number {
  const n = name.trim()
  if (!n) return 50

  let score = 50

  if (LEAN_HIGH.test(n)) score += 28
  if (LOW_CAL_HIGH_PROTEIN.test(n) && calories > 0 && calories <= 350) score += 12
  if (FRIED.test(n)) score -= 28
  if (SUGAR_DRINK.test(n)) score -= 26
  if (SWEET_BREAKFAST.test(n)) score -= 10
  if (DESSERT.test(n)) score -= 22
  if (BENTO_MEAL.test(n)) score += 0
  if (/無糖豆漿|茶葉蛋|茶蛋|雞胸|地瓜/.test(n)) score += 15

  return roundScore(score)
}

export function getDietScoreSignal(score: number): DietScoreResult {
  const s = roundScore(score)
  if (s >= 80) {
    return { score: s, signal: 'green', label: '適合減脂' }
  }
  if (s >= 40) {
    return { score: s, signal: 'yellow', label: '偶爾可以' }
  }
  return { score: s, signal: 'red', label: '建議少吃' }
}

/** @deprecated Use dietScoreIcon from @/components/icons in UI */
export function dietScoreEmoji(signal: DietScoreSignal): string {
  return ''
}

export function calculateDietScore(input: DietScoreInput): DietScoreResult {
  const name = input.name ?? ''

  if (!hasMacroData(input)) {
    const inferred = inferDietScoreFromFoodName(name, input.calories)
    return getDietScoreSignal(inferred)
  }

  const parts: Array<{ score: number; weight: number }> = []

  parts.push({ score: proteinSubScore(input), weight: WEIGHTS.protein })
  parts.push({ score: satietySubScore(input), weight: WEIGHTS.satiety })

  const fiber = fiberSubScore(input)
  if (fiber != null) parts.push({ score: fiber, weight: WEIGHTS.fiber })
  else parts.push({ score: inferDietScoreFromFoodName(name, input.calories), weight: WEIGHTS.fiber * 0.35 })

  const fat = fatSubScore(input)
  if (fat != null) parts.push({ score: fat, weight: WEIGHTS.fat })
  else parts.push({ score: inferDietScoreFromFoodName(name, input.calories), weight: WEIGHTS.fat * 0.35 })

  const carb = carbSubScore(input)
  if (carb != null) parts.push({ score: carb, weight: WEIGHTS.carb })
  else parts.push({ score: inferDietScoreFromFoodName(name, input.calories), weight: WEIGHTS.carb * 0.35 })

  const sugar = sugarSubScore(input)
  if (sugar != null) parts.push({ score: sugar, weight: WEIGHTS.sugar })
  else parts.push({ score: inferDietScoreFromFoodName(name, input.calories), weight: WEIGHTS.sugar * 0.35 })

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
  const weighted = parts.reduce((s, p) => s + p.score * p.weight, 0) / totalWeight

  let adjusted = weighted
  if (FRIED.test(name)) adjusted -= 12
  if (SUGAR_DRINK.test(name)) adjusted -= 10
  if (SWEET_BREAKFAST.test(name)) adjusted -= 4
  if (DESSERT.test(name)) adjusted -= 8
  if (LEAN_HIGH.test(name)) adjusted += 8
  if (LOW_CAL_HIGH_PROTEIN.test(name) && input.calories > 0 && input.calories <= 350 && input.protein_g >= 15) {
    adjusted += 6
  }

  return getDietScoreSignal(adjusted)
}
