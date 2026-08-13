/**
 * Build 38 BUG 3 — a "+"-joined photo/AI label ("螺旋麵沙拉 + 小黃瓜 + 火腿 +
 * 美乃滋醬") must not be resolved as if it were a search query for ONE
 * single branded/menu product (see createPhotoV2State in photo-pipeline.ts,
 * which used to hand the whole compound string to collectClientCandidates
 * unmodified). This file does not add a second nutrition engine — it reuses
 * the existing per-ingredient whole-food search (whole-food-candidates.ts,
 * already part of search-v2's own candidate collection) and the existing
 * compound-label split rule (home-cooked/parse-meal-label.ts,
 * COMPOSITE_MEAL_SPLIT_RE), summing per-segment matches into a single
 * "estimated" (Level C) candidate with the same confirm-before-save
 * semantics as the AI nutrition fallback (ai-nutrition-fallback.ts).
 */
import {
  isCompositeMealLabel,
  COMPOSITE_MEAL_SPLIT_RE,
} from '@/lib/nutrition/home-cooked/parse-meal-label'
import { wholeFoodSearchCandidates } from '@/lib/nutrition/search-v2/whole-food-candidates'
import type { NutritionMacros, SearchV2Candidate } from '@/lib/nutrition/search-v2/types'

function sumMacros(list: NutritionMacros[]): NutritionMacros {
  return list.reduce<NutritionMacros>(
    (acc, m) => ({
      calories: (acc.calories ?? 0) + (m.calories ?? 0),
      protein: (acc.protein ?? 0) + (m.protein ?? 0),
      fat: (acc.fat ?? 0) + (m.fat ?? 0),
      carbs: (acc.carbs ?? 0) + (m.carbs ?? 0),
      fiber: m.fiber != null ? (acc.fiber ?? 0) + m.fiber : acc.fiber,
      sugar: null,
      sodium: m.sodium != null ? (acc.sodium ?? 0) + m.sodium : acc.sodium,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: null, sugar: null, sodium: null }
  )
}

/**
 * Builds a Level C ("estimated", must be confirmed before it can be saved —
 * same semantics as aiEstimateToCandidate) candidate for a compound label by
 * summing per-segment whole-food matches. Returns null when the label isn't
 * compound, or when NONE of its segments resolve to a known ingredient —
 * callers keep using the normal single-product search / AI fallback in that
 * case, so a fully-unrecognized compound label still degrades gracefully
 * instead of asserting a fabricated partial total.
 */
export function compoundMealCandidateFromLabel(label: string): SearchV2Candidate | null {
  if (!isCompositeMealLabel(label)) return null
  const segments = label
    .split(COMPOSITE_MEAL_SPLIT_RE)
    .map(s => s.trim())
    .filter(Boolean)
  if (segments.length < 2) return null

  const resolvedSegments = segments.map(seg => ({
    seg,
    candidate: wholeFoodSearchCandidates(seg)[0] ?? null,
  }))
  const matched = resolvedSegments.filter(
    (r): r is { seg: string; candidate: SearchV2Candidate } => r.candidate !== null
  )
  if (matched.length === 0) return null

  const macros = sumMacros(matched.map(r => r.candidate.macros))
  const matchedNames = matched.map(r => r.candidate.name).join('、')
  const unmatchedCount = resolvedSegments.length - matched.length
  const partial = unmatchedCount > 0

  return {
    id: `compound-${matched.map(r => r.candidate.id).join('-')}`,
    name: label,
    macros,
    // Same LEVEL 3 semantics as an AI nutrition estimate — a sum built from
    // per-ingredient reference portions is never treated as exact/official,
    // always requires user confirmation before it can be logged.
    nutrition_status: 'estimated',
    nutrition_confidence: 'C',
    nutrition_source: '複合餐點：依食材資料庫估算',
    source_tier: 'official',
    match_score: partial ? 50 : 60,
    explanation: partial
      ? `複合餐點依食材估算（${unmatchedCount} 項食材未辨識，僅估算已比對部分）：${matchedNames}，實際營養請確認`
      : `複合餐點依食材估算：${matchedNames}，實際營養請確認`,
  }
}
