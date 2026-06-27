/**
 * Client-safe Search V2 — for browser / Capacitor (no ONR fs).
 */
import type { ClarificationSession, SearchV2Context, SearchV2Outcome, SearchV2Candidate } from './types'
import { NULL_MACROS } from './types'
import { collectClientCandidates, classifyClientMatchLevel, isClearlyUnknownQuery } from './matcher-core'
import {
  startClarificationSession,
  clarificationComplete,
  hasClarificationPattern,
  resolvedQueryFromClarification,
} from './clarification'
import { enqueueUnknownFood } from './unknown-queue'
import { explainConfidence } from './confidence'
import { rankSearchCandidates } from './search-ranking'
import {
  filterByVisualCategory,
  categoryGuardMessage,
} from '@/lib/nutrition/food-category-guard'

function buildUnknownOutcome(
  query: string,
  candidates: SearchV2Candidate[],
  possible: string[]
): SearchV2Outcome {
  enqueueUnknownFood({ food_name: query, possible_matches: possible })
  return {
    level: 'C',
    action: 'create_unknown',
    query,
    explanation: '完全沒有可信營養資料，建立 Text Only Record。',
    candidates: rankSearchCandidates(candidates),
    unknown_record: {
      food_name: query,
      restaurant: null,
      nutrition_status: 'unknown',
      nutrition_confidence: 'Unknown',
      macros: NULL_MACROS,
      ui_message: '目前沒有可信營養資料。已先建立文字紀錄。未來找到可信資料時，可以一鍵更新。',
    },
  }
}

export function searchNutritionV2Client(query: string, ctx?: SearchV2Context): SearchV2Outcome {
  const trimmed = query.trim()
  if (!trimmed) {
    return {
      level: 'C',
      action: 'create_unknown',
      query: trimmed,
      explanation: '請輸入菜名',
      candidates: [],
    }
  }

  const rawCandidates = collectClientCandidates(trimmed, ctx)
  let candidates = rawCandidates
  if (ctx?.visual_category && ctx.visual_category !== 'unknown') {
    const filtered = filterByVisualCategory(rawCandidates, ctx.visual_category)
    if (filtered.length === 0 && rawCandidates.length > 0) {
      return {
        level: 'C',
        action: 'create_unknown',
        query: trimmed,
        explanation: categoryGuardMessage(ctx.visual_category),
        candidates: [],
        unknown_record: {
          food_name: trimmed,
          restaurant: null,
          nutrition_status: 'unknown',
          nutrition_confidence: 'Unknown',
          macros: NULL_MACROS,
          ui_message: categoryGuardMessage(ctx.visual_category),
        },
      }
    }
    candidates = filtered
  }
  const { level, best, ambiguous } = classifyClientMatchLevel(trimmed, candidates)

  if (isClearlyUnknownQuery(trimmed)) {
    return buildUnknownOutcome(
      trimmed,
      candidates,
      candidates.slice(0, 3).map(c => c.name)
    )
  }

  if (hasClarificationPattern(trimmed)) {
    const session = startClarificationSession(trimmed, candidates)
    return {
      level: 'B',
      action: 'clarify',
      query: trimmed,
      explanation: '找到相近資料或菜名模糊，需 Smart Clarification 確認後才能建立。',
      candidates: rankSearchCandidates(candidates),
      clarification: session ?? undefined,
    }
  }

  if (level === 'A' && best && !ambiguous) {
    return {
      level: 'A',
      action: 'create_official',
      query: trimmed,
      explanation: explainConfidence('A', best.nutrition_source),
      candidates: rankSearchCandidates(candidates),
      official_record: { ...best, nutrition_confidence: 'A' },
    }
  }

  if (level === 'B' || ambiguous) {
    const session = startClarificationSession(trimmed, candidates)
    return {
      level: 'B',
      action: 'clarify',
      query: trimmed,
      explanation: '找到相近資料或菜名模糊，需 Smart Clarification 確認後才能建立。',
      candidates: rankSearchCandidates(candidates),
      clarification: session ?? undefined,
    }
  }

  if (level === 'C' && !candidates.some(c => c.nutrition_status === 'official')) {
    return buildUnknownOutcome(trimmed, candidates, candidates.map(c => c.name).slice(0, 5))
  }

  return buildUnknownOutcome(trimmed, candidates, candidates.map(c => c.name).slice(0, 5))
}

export function finalizeClarification(session: ClarificationSession): SearchV2Outcome {
  if (!clarificationComplete(session)) {
    return {
      level: 'B',
      action: 'clarify',
      query: session.originalQuery,
      explanation: '請完成所有必填問題',
      candidates: [],
      clarification: session,
    }
  }

  const refinedQuery = resolvedQueryFromClarification(session)
  const candidates = collectClientCandidates(refinedQuery)
  const { level, best, ambiguous } = classifyClientMatchLevel(refinedQuery, candidates)

  if (level === 'A' && best && !ambiguous) {
    return {
      level: 'A',
      action: 'create_official',
      query: refinedQuery,
      explanation: explainConfidence('B', best.nutrition_source),
      candidates,
      official_record: { ...best, nutrition_confidence: 'B' },
    }
  }

  if (best && !ambiguous) {
    return {
      level: 'B',
      action: 'pick_candidate',
      query: refinedQuery,
      explanation: '已透過確認找到可信資料，可建立。',
      candidates,
      official_record: { ...best, nutrition_confidence: 'B' },
    }
  }

  return buildUnknownOutcome(refinedQuery, candidates, candidates.map(c => c.name))
}
