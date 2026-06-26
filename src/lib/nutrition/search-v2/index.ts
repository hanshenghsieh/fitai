import type {
  SearchV2Context,
  SearchV2Outcome,
  SearchV2Candidate,
  ClarificationSession,
} from '@/lib/nutrition/search-v2/types'
import { NULL_MACROS } from '@/lib/nutrition/search-v2/types'
import {
  collectAllCandidates,
  classifyMatchLevel,
  isClearlyUnknownQuery,
} from '@/lib/nutrition/search-v2/matcher'
import {
  startClarificationSession,
  clarificationComplete,
  resolvedQueryFromClarification,
  hasClarificationPattern,
} from '@/lib/nutrition/search-v2/clarification'
import { enqueueUnknownFood } from '@/lib/nutrition/search-v2/unknown-queue'
import { explainConfidence } from '@/lib/nutrition/search-v2/confidence'
import { getUnknownAnalytics, listUnknownQueue, getFounderUnknownDashboard } from '@/lib/nutrition/search-v2/unknown-queue'
import { runAutoRematch, applyRematchProposal } from '@/lib/nutrition/search-v2/auto-rematch'
import { rankSearchCandidates } from '@/lib/nutrition/search-v2/search-ranking'

export function searchNutritionV2(query: string, ctx?: SearchV2Context): SearchV2Outcome {
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

  const candidates = collectAllCandidates(trimmed, ctx)
  const { level, best, ambiguous } = classifyMatchLevel(trimmed, candidates)

  if (isClearlyUnknownQuery(trimmed)) {
    const entry = enqueueUnknownFood({
      food_name: trimmed,
      possible_matches: candidates.slice(0, 3).map(c => c.name),
    })
    return buildUnknownOutcome(trimmed, candidates, entry.possible_matches)
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
    const entry = enqueueUnknownFood({
      food_name: trimmed,
      possible_matches: candidates.slice(0, 3).map(c => c.name),
    })
    return buildUnknownOutcome(trimmed, candidates, entry.possible_matches)
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
  const candidates = collectAllCandidates(refinedQuery)
  const { level, best, ambiguous } = classifyMatchLevel(refinedQuery, candidates)

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

export {
  getUnknownAnalytics,
  listUnknownQueue,
  getFounderUnknownDashboard,
  runAutoRematch,
  applyRematchProposal,
  collectAllCandidates,
  rankSearchCandidates,
}

export {
  createPhotoV2State,
  finalizePhotoV2ToFoodLogPayload,
  photoV2ReadyForLog,
  runPhotoSearchV2Pipeline,
} from '@/lib/nutrition/search-v2/photo-pipeline'

export {
  resolveFreeTextMeal,
  candidateToSearchHit,
  type TextFoodLogPayload,
  type TextMealResolveResult,
} from '@/lib/nutrition/search-v2/text-log-pipeline'

export { enqueueUnknownPhoto, listUnknownPhotoQueue } from '@/lib/nutrition/search-v2/unknown-photo-queue'

export type { SearchV2Context, SearchV2Outcome, SearchV2Candidate, ClarificationSession }
