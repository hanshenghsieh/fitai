import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { QaConfidenceGrade } from './recommendation-qa/types'
import {
  NUTRITION_TRACE_SOURCE_LABELS,
  type NutritionSourceTrace,
  type NutritionTraceSourceType,
} from './nutrition-trace-types'
import { evaluateMenuItemConfidence } from './menu-confidence-runtime'
import {
  inferNutritionSource,
  isPlaceholderMenuItem,
  type NutritionSourceTier,
} from './menu-confidence-core'

export type { NutritionSourceTrace, NutritionTraceSourceType } from './nutrition-trace-types'
export { NUTRITION_TRACE_SOURCE_LABELS } from './nutrition-trace-types'

export interface ResolveNutritionTraceOptions {
  confidence?: QaConfidenceGrade
  asOf?: string
}

function isCompleteTrace(trace: Partial<NutritionSourceTrace>): trace is NutritionSourceTrace {
  return (
    typeof trace.source_type === 'string' &&
    typeof trace.source_name === 'string' &&
    trace.source_name.trim().length > 0 &&
    typeof trace.verification_count === 'number' &&
    typeof trace.confidence === 'string'
  )
}

export function tierToTraceSourceType(tier: NutritionSourceTier, description = ''): NutritionTraceSourceType {
  if (tier === 'official') return 'official'
  if (tier === 'food_dna_template') return 'food_dna'
  if (tier === 'estimated_pending') return 'estimated'
  if (tier === 'usda_tfda') {
    if (/USDA/i.test(description)) return 'usda'
    return 'mohw'
  }
  if (tier === 'brand_public') return 'brand'
  return 'unknown'
}

export function inferSourceName(
  item: Pick<ConvenienceItem, 'store' | 'name' | 'description' | 'source'>,
  sourceType: NutritionTraceSourceType
): string {
  const store = item.store?.trim() || '—'
  switch (sourceType) {
    case 'official':
      return `${store} 官方營養標示`
    case 'usda':
      return 'USDA FoodData Central'
    case 'mohw':
      return '衛福部食品營養成分資料庫'
    case 'food_dna':
      return 'Food DNA Template'
    case 'brand':
      if (item.source === 'convenience') return `${store} 品牌公開菜單`
      return `${store} 品牌公開資料`
    case 'estimated':
      return '估計營養（待交叉驗證）'
    default:
      return '未標示來源'
  }
}

export function inferVerificationCount(
  sourceType: NutritionTraceSourceType,
  explicit?: number
): number {
  if (typeof explicit === 'number' && explicit >= 0) return explicit
  if (sourceType === 'official' || sourceType === 'usda' || sourceType === 'mohw') return 1
  if (sourceType === 'brand') return 1
  if (sourceType === 'food_dna') return 1
  return 0
}

function mapLegacySourceString(source: string, description: string): NutritionTraceSourceType {
  if (/官方|官網|營養標示/i.test(source)) return 'official'
  if (/USDA/i.test(source) || /USDA/i.test(description)) return 'usda'
  if (/衛福部|TFDA|MOHW/i.test(source) || /衛福部|TFDA/i.test(description)) return 'mohw'
  if (/Food DNA|food_dna/i.test(source)) return 'food_dna'
  if (/估計|待驗證/i.test(source)) return 'estimated'
  if (/品牌/i.test(source)) return 'brand'
  return 'unknown'
}

export function buildInferredNutritionTrace(
  item: ConvenienceItem,
  opts: ResolveNutritionTraceOptions = {}
): NutritionSourceTrace {
  const tier = inferNutritionSource(item)
  const source_type = tierToTraceSourceType(tier, item.description ?? '')
  const confidence = opts.confidence ?? evaluateMenuItemConfidence(item)

  const fromVerification = item.verification
  if (fromVerification?.source) {
    return {
      source_type: mapLegacySourceString(fromVerification.source, item.description ?? ''),
      source_name: fromVerification.source,
      verified_at: fromVerification.verified_at || null,
      verification_count: fromVerification.verification_count ?? 0,
      confidence: fromVerification.confidence ?? confidence,
      last_reviewed: fromVerification.verified_at || null,
    }
  }

  return {
    source_type,
    source_name: inferSourceName(item, source_type),
    verified_at: null,
    verification_count: inferVerificationCount(source_type),
    confidence,
    last_reviewed: null,
  }
}

/** Returns explicit nutrition_trace or infers from legacy description / verification */
export function resolveNutritionTrace(
  item: ConvenienceItem,
  opts: ResolveNutritionTraceOptions = {}
): NutritionSourceTrace {
  const explicit = item.nutrition_trace
  if (explicit && isCompleteTrace(explicit)) {
    return {
      ...explicit,
      confidence: opts.confidence ?? explicit.confidence ?? evaluateMenuItemConfidence(item),
    }
  }
  return buildInferredNutritionTrace(item, opts)
}

export function attachNutritionTrace(item: ConvenienceItem): ConvenienceItem & { nutrition_trace: NutritionSourceTrace } {
  return { ...item, nutrition_trace: resolveNutritionTrace(item) }
}

export function formatNutritionTraceLine(trace: NutritionSourceTrace): string {
  const label = NUTRITION_TRACE_SOURCE_LABELS[trace.source_type]
  const verified = trace.verified_at ? ` · 驗證 ${trace.verified_at.slice(0, 10)}` : ''
  const reviewed = trace.last_reviewed ? ` · 複核 ${trace.last_reviewed.slice(0, 10)}` : ''
  const xval =
    trace.verification_count > 1
      ? ` · ${trace.verification_count} 來源交叉驗證`
      : trace.verification_count === 1
        ? ' · 1 來源'
        : ' · 未交叉驗證'
  return `營養來源：${label}（${trace.source_name}）${xval} · confidence ${trace.confidence}${verified}${reviewed}`
}

export function traceHasProvenance(trace: NutritionSourceTrace): boolean {
  return trace.source_type !== 'unknown' && trace.source_type !== 'estimated' && trace.verification_count >= 1
}

export function traceCoverageStats(items: ConvenienceItem[]): {
  total: number
  explicit_trace: number
  inferred_trace: number
  with_provenance: number
  by_source_type: Record<NutritionTraceSourceType, number>
  by_confidence: Record<QaConfidenceGrade, number>
} {
  const by_source_type: Record<NutritionTraceSourceType, number> = {
    official: 0,
    usda: 0,
    mohw: 0,
    food_dna: 0,
    brand: 0,
    estimated: 0,
    unknown: 0,
  }
  const by_confidence: Record<QaConfidenceGrade, number> = { A: 0, B: 0, C: 0, D: 0 }

  let explicit_trace = 0
  let with_provenance = 0

  for (const item of items) {
    if (item.nutrition_trace && isCompleteTrace(item.nutrition_trace)) explicit_trace++
    const trace = resolveNutritionTrace(item)
    by_source_type[trace.source_type]++
    by_confidence[trace.confidence]++
    if (traceHasProvenance(trace)) with_provenance++
  }

  return {
    total: items.length,
    explicit_trace,
    inferred_trace: items.length - explicit_trace,
    with_provenance,
    by_source_type,
    by_confidence,
  }
}

export function buildNutritionTraceFromStaging(input: {
  source_type: NutritionTraceSourceType
  source_name: string
  verified_at: string
  verification_count: number
  confidence: QaConfidenceGrade
  last_reviewed?: string | null
}): NutritionSourceTrace {
  return {
    source_type: input.source_type,
    source_name: input.source_name,
    verified_at: input.verified_at,
    verification_count: input.verification_count,
    confidence: input.confidence,
    last_reviewed: input.last_reviewed ?? input.verified_at,
  }
}

export function isTraceBlockingRecommendation(trace: NutritionSourceTrace): boolean {
  return trace.confidence === 'D'
}

export function isTraceSearchOnly(trace: NutritionSourceTrace): boolean {
  return trace.confidence === 'C'
}

export function legacyItemLikelyUntraced(item: ConvenienceItem): boolean {
  return !item.nutrition_trace && (isPlaceholderMenuItem(item) || inferNutritionSource(item) === 'estimated_pending')
}
