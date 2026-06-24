/**
 * BetterBit Food Score — protein / calorie / satiety / diet → A+ … D
 * Pure logic; no DB or UI side effects.
 */

export type BetterBitFoodGrade = 'A+' | 'A' | 'B' | 'C' | 'D'

export interface BetterBitFoodInput {
  calories: number
  protein_g: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number
  name?: string
  category?: 'breakfast' | 'lunch' | 'dinner' | string
  role?: string
  tags?: string[]
  /** Per-meal kcal target for calorie fit (optional) */
  mealCalorieTarget?: number
  /** Per-meal protein target for context (optional) */
  mealProteinTarget?: number
}

export interface BetterBitFoodScore {
  protein_score: number
  calorie_score: number
  satiety_score: number
  diet_score: number
  composite_score: number
  overall_grade: BetterBitFoodGrade
}

const FRIED = /炸|薯條|鹽酥|香雞|雞排|排骨酥|泡麵|方便麵/
const SUGAR = /奶茶|珍奶|含糖|可樂|汽水|蛋糕|甜甜圈|冰淇淋|黑糖|布丁|蛋塔|酥(?!皮)/
const LEAN_PROTEIN = /雞胸|雞腿|鮭魚|鮪魚|牛排|豬里肌|舒肥|蛋白|水煮|蒸|沙拉/
const VEG = /沙拉|蔬菜|蔬食|青菜|花椰|高麗/
const DRINK = /飲|茶|咖啡|拿鐵|果汁|豆漿|牛奶|可樂|汽水|啤酒|紅茶|綠茶/

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function proteinDensityPer100kcal(calories: number, proteinG: number): number {
  if (calories <= 0) return 0
  return (proteinG / calories) * 100
}

function macroPct(calories: number, proteinG: number, carbsG: number, fatG: number) {
  const denom = Math.max(calories, 1)
  return {
    protein: (proteinG * 4) / denom,
    carbs: (carbsG * 4) / denom,
    fat: (fatG * 9) / denom,
  }
}

function estimateFiber(input: BetterBitFoodInput): number {
  if (input.fiber_g != null) return input.fiber_g
  const name = input.name ?? ''
  if (VEG.test(name)) return 4
  if (input.carbs_g != null && input.carbs_g > 40) return 2
  return 0
}

function inferCalorieBand(category?: string): { idealMin: number; idealMax: number; hardMax: number } {
  if (category === 'breakfast') return { idealMin: 220, idealMax: 480, hardMax: 750 }
  if (category === 'dinner') return { idealMin: 320, idealMax: 680, hardMax: 950 }
  return { idealMin: 280, idealMax: 620, hardMax: 900 }
}

export function scoreProtein(input: BetterBitFoodInput): number {
  const { calories, protein_g } = input
  if (calories <= 0 && protein_g <= 0) return 0

  const density = proteinDensityPer100kcal(calories, protein_g)
  const densityScore = clamp(density * 9.5) // ~10.5g/100kcal ≈ 100
  const absoluteScore = clamp(protein_g * 2.2, 0, 35) // up to ~16g bonus
  const target = input.mealProteinTarget
  const targetFit =
    target && target > 0
      ? clamp(100 - Math.abs(protein_g - target) / target * 55, 0, 100) * 0.25
      : 0

  return round1(clamp(densityScore * 0.65 + absoluteScore + targetFit))
}

export function scoreCalories(input: BetterBitFoodInput): number {
  const { calories } = input
  if (calories <= 0) return 20

  if (input.mealCalorieTarget && input.mealCalorieTarget > 0) {
    const ratio = calories / input.mealCalorieTarget
    const delta = Math.abs(ratio - 1)
    if (delta <= 0.08) return 100
    if (delta <= 0.15) return 90
    if (delta <= 0.25) return 78
    if (delta <= 0.35) return 62
    if (ratio > 1.35) return clamp(45 - (ratio - 1.35) * 40)
    return clamp(55 - delta * 60)
  }

  const band = inferCalorieBand(input.category)
  if (calories >= band.idealMin && calories <= band.idealMax) return 92
  if (calories < band.idealMin) {
    return clamp(55 + (calories / band.idealMin) * 35)
  }
  if (calories <= band.hardMax) {
    const over = (calories - band.idealMax) / (band.hardMax - band.idealMax)
    return round1(clamp(92 - over * 42))
  }
  return clamp(35 - (calories - band.hardMax) * 0.04)
}

export function scoreSatiety(input: BetterBitFoodInput): number {
  const name = input.name ?? ''
  const calories = Math.max(input.calories, 1)
  const protein = scoreProtein(input)
  const fiber = estimateFiber(input)
  const fatG = input.fat_g ?? 0

  let score = protein * 0.45
  score += clamp(fiber * 8, 0, 24)
  score += clamp(fatG * 1.2, 0, 18) // moderate fat aids satiety

  const proteinShare = (input.protein_g * 4) / calories
  if (proteinShare >= 0.28) score += 12
  else if (proteinShare >= 0.18) score += 6

  if (DRINK.test(name) && input.role !== 'combo') score -= 28
  if (SUGAR.test(name)) score -= 18
  if (LEAN_PROTEIN.test(name)) score += 10
  if (input.role === 'drink') score -= 22

  return round1(clamp(score))
}

export function scoreDiet(input: BetterBitFoodInput): number {
  const name = input.name ?? ''
  const calories = Math.max(input.calories, 1)
  const carbsG = input.carbs_g ?? 0
  const fatG = input.fat_g ?? 0
  const macros = macroPct(calories, input.protein_g, carbsG, fatG)

  let score = 55
  score += clamp(macros.protein * 120, 0, 32)
  if (macros.fat >= 0.18 && macros.fat <= 0.42) score += 10
  else if (macros.fat > 0.55) score -= 14

  if (macros.carbs > 0.62 && input.protein_g < 12) score -= 12
  if (FRIED.test(name)) score -= 22
  if (SUGAR.test(name)) score -= 20
  if (LEAN_PROTEIN.test(name)) score += 12
  if (VEG.test(name)) score += 10
  if ((input.tags ?? []).some(t => /low.?sugar|高蛋白|健康|沙拉/i.test(t))) score += 8

  return round1(clamp(score))
}

const GRADE_THRESHOLDS: Array<{ min: number; grade: BetterBitFoodGrade }> = [
  { min: 88, grade: 'A+' },
  { min: 78, grade: 'A' },
  { min: 62, grade: 'B' },
  { min: 45, grade: 'C' },
  { min: 0, grade: 'D' },
]

export function compositeToGrade(composite: number): BetterBitFoodGrade {
  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (composite >= min) return grade
  }
  return 'D'
}

const SCORE_WEIGHTS = {
  protein_score: 0.32,
  calorie_score: 0.24,
  satiety_score: 0.26,
  diet_score: 0.18,
} as const

export function computeBetterBitFoodScore(input: BetterBitFoodInput): BetterBitFoodScore {
  const protein_score = scoreProtein(input)
  const calorie_score = scoreCalories(input)
  const satiety_score = scoreSatiety(input)
  const diet_score = scoreDiet(input)

  const composite_score = round1(
    protein_score * SCORE_WEIGHTS.protein_score +
      calorie_score * SCORE_WEIGHTS.calorie_score +
      satiety_score * SCORE_WEIGHTS.satiety_score +
      diet_score * SCORE_WEIGHTS.diet_score
  )

  return {
    protein_score,
    calorie_score,
    satiety_score,
    diet_score,
    composite_score,
    overall_grade: compositeToGrade(composite_score),
  }
}

/** Convenience wrapper for menu items */
export function scoreMenuItem(
  item: Pick<BetterBitFoodInput, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'name' | 'category' | 'role' | 'tags'>,
  context?: Pick<BetterBitFoodInput, 'mealCalorieTarget' | 'mealProteinTarget'>
): BetterBitFoodScore {
  return computeBetterBitFoodScore({ ...item, ...context })
}

export const BETTERBIT_FOOD_GRADE_ORDER: BetterBitFoodGrade[] = ['A+', 'A', 'B', 'C', 'D']

export function compareFoodGrades(a: BetterBitFoodGrade, b: BetterBitFoodGrade): number {
  return BETTERBIT_FOOD_GRADE_ORDER.indexOf(a) - BETTERBIT_FOOD_GRADE_ORDER.indexOf(b)
}
