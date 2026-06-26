import {
  type GovernedMenuRecord,
  type GovernedRecordStatus,
  PROMOTION_PIPELINE,
  REVIEW_CYCLE_DAYS,
  type PromotionStage,
} from './types'

export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const [a = '1', b = '0', c = '0'] = version.replace(/^v/, '').split('.')
  return { major: Number(a) || 1, minor: Number(b) || 0, patch: Number(c) || 0 }
}

export function bumpVersion(version: string, level: 'patch' | 'minor' | 'major' = 'patch'): string {
  const v = parseVersion(version)
  if (level === 'major') return `${v.major + 1}.0.0`
  if (level === 'minor') return `${v.major}.${v.minor + 1}.0`
  return `${v.major}.${v.minor}.${v.patch + 1}`
}

export function computeReviewDueAt(fromIso: string, cycleDays = REVIEW_CYCLE_DAYS): string {
  const d = new Date(fromIso)
  d.setUTCDate(d.getUTCDate() + cycleDays)
  return d.toISOString()
}

export function isReviewDue(reviewDueAt: string, now = new Date()): boolean {
  return new Date(reviewDueAt).getTime() <= now.getTime()
}

export function promotionStageIndex(stage: PromotionStage): number {
  return PROMOTION_PIPELINE.indexOf(stage)
}

export function canAdvancePromotion(from: PromotionStage, to: PromotionStage): boolean {
  const fi = promotionStageIndex(from)
  const ti = promotionStageIndex(to)
  if (fi < 0 || ti < 0) return false
  return ti === fi + 1
}

export function wrapStagingItemAsGoverned(input: {
  record_id: string
  brand: string
  item_name: string
  verified_at?: string | null
  promotion_stage: PromotionStage
  confidence?: GovernedMenuRecord['confidence']
  source_url?: string | null
  source_fingerprint?: string | null
  now?: string
  version?: string
  status?: GovernedRecordStatus
}): GovernedMenuRecord {
  const now = input.now ?? new Date().toISOString()
  const verified = input.verified_at ?? null
  const reviewBase = verified ?? now
  return {
    record_id: input.record_id,
    brand: input.brand,
    item_name: input.item_name,
    created_at: now,
    updated_at: now,
    verified_at: verified,
    review_due_at: computeReviewDueAt(reviewBase),
    version: input.version ?? '1.0.0',
    status: input.status ?? 'active',
    promotion_stage: input.promotion_stage,
    confidence: input.confidence ?? null,
    source_url: input.source_url ?? null,
    source_fingerprint: input.source_fingerprint ?? null,
  }
}

export function updateGovernedRecord(
  record: GovernedMenuRecord,
  patch: Partial<Pick<GovernedMenuRecord, 'promotion_stage' | 'status' | 'confidence' | 'verified_at'>>,
  opts: { actor: string; reason: string; now?: string }
): GovernedMenuRecord {
  const now = opts.now ?? new Date().toISOString()
  const next: GovernedMenuRecord = {
    ...record,
    ...patch,
    updated_at: now,
    version: bumpVersion(record.version, 'patch'),
  }
  if (patch.verified_at) {
    next.review_due_at = computeReviewDueAt(patch.verified_at)
  }
  return next
}

export function deprecateRecord(record: GovernedMenuRecord, now?: string): GovernedMenuRecord {
  return {
    ...record,
    status: 'deprecated',
    updated_at: now ?? new Date().toISOString(),
    version: bumpVersion(record.version, 'minor'),
  }
}
