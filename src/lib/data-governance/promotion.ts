import { canAdvancePromotion } from './version-manager'
import type { GovernedMenuRecord, PromotionStage, PromotionTransition } from './types'

export function validatePromotionTransition(input: {
  record: GovernedMenuRecord
  to_stage: PromotionStage
  actor: string
  reason: string
  qa_passed?: boolean
  founder_approved?: boolean
  pending_review?: boolean
  now?: string
}): PromotionTransition {
  const from = input.record.promotion_stage
  const at = input.now ?? new Date().toISOString()
  const base = {
    record_id: input.record.record_id,
    from_stage: from,
    to_stage: input.to_stage,
    actor: input.actor,
    reason: input.reason,
    at,
    allowed: false as boolean,
  }

  if (!canAdvancePromotion(from, input.to_stage)) {
    return {
      ...base,
      allowed: false,
      block_reason: `Invalid promotion jump: ${from} → ${input.to_stage}. Must follow pipeline.`,
    }
  }

  if (input.record.status === 'deprecated') {
    return { ...base, block_reason: 'Deprecated records cannot be promoted.' }
  }

  if (input.pending_review) {
    return { ...base, block_reason: 'Pending review blocks promotion.' }
  }

  if (input.to_stage === 'qa' && input.qa_passed === false) {
    return { ...base, block_reason: 'QA must pass before advancing to qa stage completion.' }
  }

  if (input.to_stage === 'runtime' && from !== 'production_candidate') {
    return { ...base, block_reason: 'Runtime requires production_candidate.' }
  }

  if (input.to_stage === 'runtime' && !input.founder_approved) {
    return { ...base, block_reason: 'Founder approval required for runtime promotion.' }
  }

  if (input.to_stage === 'founder_review' && input.qa_passed !== true) {
    return { ...base, block_reason: 'QA must pass before founder review.' }
  }

  return { ...base, allowed: true }
}

export function applyPromotionTransition(
  record: GovernedMenuRecord,
  transition: PromotionTransition
): GovernedMenuRecord {
  if (!transition.allowed) return record
  return {
    ...record,
    promotion_stage: transition.to_stage,
    updated_at: transition.at,
  }
}

export function summarizePromotionPipeline(records: GovernedMenuRecord[]): Record<PromotionStage, number> {
  const summary: Record<PromotionStage, number> = {
    draft: 0,
    staging: 0,
    qa: 0,
    founder_review: 0,
    production_candidate: 0,
    runtime: 0,
  }
  for (const r of records) {
    summary[r.promotion_stage]++
  }
  return summary
}

export function blocksDirectDraftToRuntime(from: PromotionStage, to: PromotionStage): boolean {
  return from === 'draft' && to === 'runtime'
}
