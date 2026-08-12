import type { NutritionConfidence, NutritionStatus } from '@/lib/nutrition/search-v2/types'

export const CONFIDENCE_BADGE: Record<
  NutritionConfidence,
  { label: string; emoji: string; description: string }
> = {
  A: { label: '官方', emoji: '🟢', description: 'Official Nutrition Reference 完全匹配' },
  B: { label: '已確認', emoji: '🟢', description: '官方資料 + Smart Clarification 確認' },
  C: { label: 'AI 營養估算', emoji: '🟡', description: '資料庫查無資料，AI 估算僅供參考，請確認或手動修正' },
  Unknown: { label: '無資料', emoji: '⚪', description: 'Text Only Record，無營養統計' },
}

export function confidenceFromLevel(
  level: 'A' | 'B' | 'C',
  clarified: boolean
): NutritionConfidence {
  if (level === 'A' && !clarified) return 'A'
  if (level === 'B' || (level === 'A' && clarified)) return 'B'
  if (level === 'C') return 'C'
  return 'Unknown'
}

export function statusFromConfidence(confidence: NutritionConfidence): NutritionStatus {
  if (confidence === 'A' || confidence === 'B') return 'official'
  if (confidence === 'C') return 'estimated'
  return 'unknown'
}

export function explainConfidence(confidence: NutritionConfidence, source: string): string {
  const badge = CONFIDENCE_BADGE[confidence]
  return `${badge.emoji} ${badge.label} — ${source}。${badge.description}`
}

export function countsTowardNutritionTotals(status: NutritionStatus): boolean {
  return status === 'official' || status === 'estimated'
}
