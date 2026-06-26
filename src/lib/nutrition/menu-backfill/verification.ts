import type { SourceType } from '@/lib/food-kb/types'
import type { NutritionSourceTrace, NutritionTraceSourceType } from '../nutrition-trace-types'
import type { QaConfidenceGrade } from '../recommendation-qa/types'
import { buildNutritionTraceFromStaging } from '../nutrition-source-trace'
import type { NutritionConflict, StagingRestaurant, VerificationSource } from './types'

const PRIORITY_RANK: Record<string, number> = { A: 0, B: 1, C: 2 }

export function distinctSourcePriorities(sources: VerificationSource[]): Set<string> {
  return new Set(sources.map(s => s.priority))
}

export function restaurantVerificationOk(restaurant: StagingRestaurant): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  const sources = restaurant.restaurant_sources ?? []
  if (sources.length < 2) reasons.push('餐廳需至少 2 個來源')
  const priorities = distinctSourcePriorities(sources)
  if (priorities.size < 2) reasons.push('餐廳需至少 2 個不同優先級來源（A/B/C）')
  for (const s of sources) {
    if (!s.source_url?.trim()) reasons.push(`來源缺少 source_url：${s.source_type}`)
  }
  return { ok: reasons.length === 0, reasons }
}

export function itemHasTraceableSource(item: { verification?: { sources?: VerificationSource[] } }): boolean {
  const sources = item.verification?.sources ?? []
  return sources.length >= 1 && sources.every(s => Boolean(s.source_url?.trim()))
}

export function itemVerificationOk(item: {
  name: string
  verification?: {
    sources?: VerificationSource[]
    verified_at?: string
    verified_by?: string
    verification_count?: number
    source_url?: string
  }
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  const v = item.verification
  if (!v) {
    reasons.push(`${item.name}：缺少 verification metadata`)
    return { ok: false, reasons }
  }
  if (!v.verified_at) reasons.push(`${item.name}：缺少 verified_at`)
  if (!v.verified_by) reasons.push(`${item.name}：缺少 verified_by`)
  if (!v.verification_count || v.verification_count < 1) {
    reasons.push(`${item.name}：verification_count 無效`)
  }
  if (!v.source_url?.trim()) reasons.push(`${item.name}：缺少 source_url`)
  const sources = v.sources ?? []
  if (!sources.length) reasons.push(`${item.name}：缺少 sources`)
  for (const s of sources) {
    if (!s.source_url?.trim()) reasons.push(`${item.name}：來源 ${s.source_type} 無 URL`)
  }
  return { ok: reasons.length === 0, reasons }
}

export function detectNutritionConflicts(sources: VerificationSource[]): NutritionConflict[] {
  const conflicts: NutritionConflict[] = []
  const fields = ['calories', 'protein_g', 'fat_g', 'carbs_g'] as const
  const thresholds = {
    calories: 0.1,
    protein_g: 5,
    fat_g: 3,
    carbs_g: 5,
  }

  for (const field of fields) {
    const values = sources
      .map(s => ({ source_type: s.source_type, value: s.nutrition?.[field] }))
      .filter((v): v is { source_type: VerificationSource['source_type']; value: number } =>
        typeof v.value === 'number' && !Number.isNaN(v.value)
      )
    if (values.length < 2) continue

    const nums = values.map(v => v.value)
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    let exceeded = false
    if (field === 'calories') {
      const mid = (min + max) / 2
      exceeded = mid > 0 && (max - min) / mid > thresholds.calories
    } else {
      exceeded = max - min > thresholds[field]
    }
    if (exceeded) {
      conflicts.push({
        field,
        values,
        threshold_exceeded: true,
        message: `${field} 來源差異超過門檻（不得平均，需人工驗證）`,
      })
    }
  }
  return conflicts
}

export function pickAuthoritativeNutrition(
  sources: VerificationSource[]
): VerificationSource['nutrition'] | null {
  if (!sources.length) return null
  const sorted = [...sources].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
  return sorted[0]?.nutrition ?? null
}

export function kbSourceTypeToTraceType(sourceType: SourceType): NutritionTraceSourceType {
  if (sourceType === 'official_website' || sourceType === 'official_pdf') return 'official'
  if (sourceType === 'tfda_open_data') return 'mohw'
  if (/usda|open_food_facts/i.test(sourceType)) return 'usda'
  if (sourceType === 'estimated') return 'estimated'
  if (
    sourceType === 'ubereats' ||
    sourceType === 'foodpanda' ||
    sourceType === 'google_maps' ||
    sourceType === 'facebook' ||
    sourceType === 'instagram'
  ) {
    return 'brand'
  }
  return 'unknown'
}

export function compileNutritionTraceFromSources(input: {
  sources: VerificationSource[]
  source_name: string
  confidence: QaConfidenceGrade
  verified_by: string
  last_reviewed?: string
}): NutritionSourceTrace {
  const sorted = [...input.sources].sort(
    (a, b) => ({ A: 0, B: 1, C: 2 })[a.priority] - ({ A: 0, B: 1, C: 2 })[b.priority]
  )
  const primary = sorted[0]
  const source_type = primary ? kbSourceTypeToTraceType(primary.source_type) : 'unknown'
  const verified_at =
    sorted.map(s => s.observed_at).filter(Boolean).sort().reverse()[0] ?? new Date().toISOString()

  return buildNutritionTraceFromStaging({
    source_type,
    source_name: input.source_name,
    verified_at,
    verification_count: input.sources.length,
    confidence: input.confidence,
    last_reviewed: input.last_reviewed ?? verified_at,
  })
}

export function isHallucinatedComboName(name: string): boolean {
  return /＋|\+.*\+|套餐（AI|猜測|推測）|（大）（小）同時/.test(name)
}
