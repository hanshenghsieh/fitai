import type { FoodLogEntry } from '@/lib/banks/types'
import { resolveMenuFromQuery, searchFoodMenuExtended, type MenuLookupHit } from '@/lib/food-menu-lookup'
import { resolveAliasQuery } from '@/lib/nutrition/alias-engine'
import { collectClientCandidates } from '@/lib/nutrition/search-v2/matcher-core'
import { format } from 'date-fns'
import {
  computeAutoApplyMatchScore,
  isAutoApplyQueryBlocked,
  passesAutoApplyScoreThreshold,
} from '@/lib/nutrition/unknown-food-resolution/match-score'
import type {
  AutoApplyDecision,
  AutoApplyQaResult,
  VerifiedMatchCandidate,
} from '@/lib/nutrition/unknown-food-resolution/types'
import { AUTO_APPLY_MIN_SCORE } from '@/lib/nutrition/unknown-food-resolution/types'

const ALLOWED_CONFIDENCE = new Set(['A', 'B'])
const ALLOWED_SOURCE_TYPES = new Set(['onr', 'food_dna', 'verified_database', 'official'])

function hitToVerifiedCandidate(
  hit: MenuLookupHit,
  originalName: string,
  store?: string
): VerifiedMatchCandidate | null {
  const scoreResult = computeAutoApplyMatchScore(originalName, hit.name, store ?? hit.store)
  const sourceType =
    hit.source === 'food_kb' ? ('verified_database' as const) : ('official' as const)

  return {
    matched_item_id: hit.id,
    matched_item_name: hit.name,
    store: hit.store,
    macros: {
      calories: hit.calories,
      protein: hit.protein_g,
      fat: hit.fat_g ?? null,
      carbs: hit.carbs_g ?? null,
      fiber: null,
      sugar: null,
      sodium: null,
    },
    match_score: scoreResult.score,
    match_kind: scoreResult.match_kind === 'none' ? 'exact' : scoreResult.match_kind,
    nutrition_trace: {
      source_type: sourceType,
      source_name: hit.source === 'food_kb' ? '7-11 官網營養 · food-kb verified' : `${hit.store} verified menu`,
      source_url: hit.source === 'food_kb' ? 'https://www.7-11.com.tw/' : `verified://${hit.store}/${hit.id}`,
      confidence: hit.confidence >= 0.92 ? 'A' : 'B',
    },
  }
}

function dnaCandidateToVerified(c: ReturnType<typeof collectClientCandidates>[number], originalName: string): VerifiedMatchCandidate | null {
  if (c.source_tier !== 'food_dna' || c.nutrition_status !== 'official') return null
  const scoreResult = computeAutoApplyMatchScore(originalName, c.name, c.store)
  return {
    matched_item_id: c.id,
    matched_item_name: c.name,
    store: c.store,
    macros: c.macros,
    match_score: scoreResult.score,
    match_kind: scoreResult.match_kind === 'none' ? 'exact' : scoreResult.match_kind,
    nutrition_trace: {
      source_type: 'food_dna',
      source_name: c.nutrition_source || 'Food DNA Template',
      source_url: `fooddna://template/${c.id}`,
      confidence: c.nutrition_confidence === 'A' || c.nutrition_confidence === 'B' ? c.nutrition_confidence : 'B',
    },
  }
}

export function findVerifiedCandidatesForUnknown(log: FoodLogEntry): VerifiedMatchCandidate[] {
  const names = new Set<string>([log.name.trim()])
  const alias = resolveAliasQuery(log.name, log.store ? { store: log.store } : undefined)
  if (alias?.official_name) names.add(alias.official_name)

  const out: VerifiedMatchCandidate[] = []
  const seen = new Set<string>()

  for (const name of names) {
    const kb = resolveMenuFromQuery(name, log.store)
    if (kb) {
      const c = hitToVerifiedCandidate(kb, log.name, log.store)
      if (c && !seen.has(c.matched_item_id)) {
        seen.add(c.matched_item_id)
        out.push(c)
      }
    }

    for (const hit of searchFoodMenuExtended(name, 8)) {
      if (hit.confidence < 0.85) continue
      const c = hitToVerifiedCandidate(hit, log.name, log.store)
      if (c && !seen.has(c.matched_item_id)) {
        seen.add(c.matched_item_id)
        out.push(c)
      }
    }

    for (const c of collectClientCandidates(name)) {
      const v = dnaCandidateToVerified(c, log.name)
      if (v && !seen.has(v.matched_item_id)) {
        seen.add(v.matched_item_id)
        out.push(v)
      }
    }
  }

  return out.sort((a, b) => b.match_score - a.match_score)
}

export function runAutoApplyQaGate(
  log: FoodLogEntry,
  candidate: VerifiedMatchCandidate
): AutoApplyQaResult {
  const reasons: string[] = []

  if (log.nutrition_status === 'user_entered') reasons.push('user_entered 不可覆蓋')
  if (log.nutrition_status === 'auto_resolved') reasons.push('已 auto_resolved')
  if (log.nutrition_status === 'pending_review') reasons.push('pending nutrition conflict')

  if (isAutoApplyQueryBlocked(log.name)) reasons.push('模糊菜名禁止自動套用')

  if (!passesAutoApplyScoreThreshold(candidate.match_score)) {
    reasons.push(`match_score ${candidate.match_score} < ${AUTO_APPLY_MIN_SCORE}`)
  }

  if (!ALLOWED_CONFIDENCE.has(candidate.nutrition_trace.confidence)) {
    reasons.push(`confidence ${candidate.nutrition_trace.confidence} 不可自動套用`)
  }

  if (!ALLOWED_SOURCE_TYPES.has(candidate.nutrition_trace.source_type)) {
    reasons.push(`source_type ${candidate.nutrition_trace.source_type} 不可自動套用`)
  }

  if (!candidate.nutrition_trace.source_name?.trim()) reasons.push('source_name 缺失')
  if (!candidate.nutrition_trace.source_url?.trim()) reasons.push('source_url 缺失')

  const { calories, protein, fat, carbs } = candidate.macros
  if (calories == null || protein == null || fat == null || carbs == null) {
    reasons.push('macros 不完整')
  }

  return { pass: reasons.length === 0, reasons }
}

export function evaluateAutoApply(log: FoodLogEntry): AutoApplyDecision {
  if (log.nutrition_status === 'user_entered') {
    return { eligible: false, qa: { pass: false, reasons: ['user_entered'] }, pending_review: false }
  }

  if (isAutoApplyQueryBlocked(log.name)) {
    return { eligible: false, qa: { pass: false, reasons: ['query blocklist'] }, pending_review: true }
  }

  const candidates = findVerifiedCandidatesForUnknown(log)
  const best = candidates[0]
  if (!best) {
    return { eligible: false, qa: { pass: false, reasons: ['no verified candidate'] }, pending_review: false }
  }

  const qa = runAutoApplyQaGate(log, best)
  if (qa.pass) {
    return { eligible: true, candidate: best, qa, pending_review: false }
  }

  const pending =
    isAutoApplyQueryBlocked(log.name) ||
    (best.match_score >= 0.72 && best.match_score < AUTO_APPLY_MIN_SCORE) ||
    qa.reasons.some(r => r.includes('confidence C') || r.includes('confidence D'))

  return { eligible: false, candidate: best, qa, pending_review: pending }
}

export function formatAutoResolvedNote(
  matchedItemName: string,
  sourceName: string,
  resolvedAt: Date = new Date()
): string {
  const dateStr = format(resolvedAt, 'yyyy/MM/dd')
  return `此筆原為文字紀錄。BetterBit 於 ${dateStr} 根據可信資料庫自動補齊營養資料：${matchedItemName}。來源：${sourceName}。若不符合實際餐點，可手動修改。`
}

export function applyAutoResolveToLog(
  log: FoodLogEntry,
  candidate: VerifiedMatchCandidate,
  resolvedAt: Date = new Date()
): FoodLogEntry {
  const rollback_token = `rb-${log.id}-${candidate.matched_item_id}`
  const note = formatAutoResolvedNote(candidate.matched_item_name, candidate.nutrition_trace.source_name, resolvedAt)

  return {
    ...log,
    name: log.name,
    store: candidate.store ?? log.store,
    calories: candidate.macros.calories,
    protein_g: candidate.macros.protein,
    fat_g: candidate.macros.fat ?? undefined,
    carbs_g: candidate.macros.carbs ?? undefined,
    nutrition_status: 'auto_resolved',
    nutrition_confidence: candidate.nutrition_trace.confidence,
    capture_status: 'resolved',
    resolution_note: note,
    auto_resolved_meta: {
      matched_item_id: candidate.matched_item_id,
      matched_item_name: candidate.matched_item_name,
      match_score: candidate.match_score,
      source_type: candidate.nutrition_trace.source_type,
      source_name: candidate.nutrition_trace.source_name,
      source_url: candidate.nutrition_trace.source_url,
      auto_resolved_at: resolvedAt.toISOString(),
      auto_resolved_by: 'betterbit_system',
      previous_status: log.nutrition_status === 'pending_review' ? 'pending_review' : 'unknown',
      rollback_token,
    },
  }
}
