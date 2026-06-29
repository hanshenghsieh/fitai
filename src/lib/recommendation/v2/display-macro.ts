import type { ConfidenceLevel } from './types'

export function usesApproximatePrefix(level: ConfidenceLevel | undefined): boolean {
  return level === 'estimated' || level === 'low_estimate'
}

export function confidenceDisplayLabel(level: ConfidenceLevel): string {
  if (level === 'official') return '官方營養資料'
  if (level === 'estimated') return '標準份量估算'
  if (level === 'low_estimate') return '粗略估算'
  return '手動整理'
}

export function confidenceDisclaimer(level: ConfidenceLevel): string | null {
  if (level === 'estimated') return '標準份量估算，實際依店家份量略有不同'
  if (level === 'low_estimate') return '粗略估算，建議依實際份量調整'
  return null
}

/** @deprecated use confidenceDisclaimer */
export function estimatedDisclaimer(level: ConfidenceLevel): string | null {
  return confidenceDisclaimer(level)
}

export function formatRecommendationCalories(calories: number, level: ConfidenceLevel | undefined): string {
  const n = Math.round(calories)
  if (level === 'official') return `${n} kcal`
  return `約 ${n} kcal`
}

export function formatRecommendationMacroGrams(
  value: number,
  label: string,
  level: ConfidenceLevel | undefined
): string {
  const n = Math.round(value)
  if (level === 'official') return `${label} ${n}g`
  return `${label}約 ${n}g`
}

export function formatRecommendationMacroLine(
  macros: { calories: number; protein: number; fat: number; carbs: number },
  level: ConfidenceLevel | undefined
): string {
  return [
    formatRecommendationCalories(macros.calories, level),
    formatRecommendationMacroGrams(macros.protein, '蛋白質', level),
  ].join(' · ')
}

export function formatRecommendationDetailLine(
  macros: { fat: number; carbs: number },
  level: ConfidenceLevel | undefined
): string {
  return [
    formatRecommendationMacroGrams(macros.fat, '脂肪', level),
    formatRecommendationMacroGrams(macros.carbs, '碳水', level),
  ].join(' · ')
}

export function formatRecommendationTotalsLine(
  macros: { calories: number; protein: number },
  level: ConfidenceLevel | undefined
): string {
  const cal = formatRecommendationCalories(macros.calories, level).replace(' kcal', '')
  const pro = formatRecommendationMacroGrams(macros.protein, '蛋白質', level)
  return `合計 ${cal} · ${pro}`
}
