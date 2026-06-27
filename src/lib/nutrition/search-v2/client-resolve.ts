/**
 * Client-safe text resolve — food-kb + runtime menu only (no ONR fs).
 * Full Search V2 with ONR: `text-log-pipeline.ts` (Node / tests).
 */
import { resolveMenuFromQuery, searchFoodMenuExtended } from '@/lib/food-menu-lookup'
import { userLabelMatchesVerified } from '@/lib/nutrition/food-category-guard'
import { NULL_MACROS } from '@/lib/nutrition/search-v2/types'
import { isClearlyUnknownQuery, hasClarificationPattern } from '@/lib/nutrition/search-v2/query-patterns'
import type { TextFoodLogPayload, TextMealResolveResult } from '@/lib/nutrition/search-v2/text-log-pipeline'

function newTextLogId(): string {
  return `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function officialFromKb(
  hit: NonNullable<ReturnType<typeof resolveMenuFromQuery>>,
  userInput: string
): TextFoodLogPayload {
  return {
    id: hit.id,
    name: hit.name,
    display_label: hit.name,
    user_input_label: userInput,
    matched_item_label: hit.name,
    matched_restaurant: hit.store,
    match_type: 'exact_kb_match',
    store: hit.store,
    calories: hit.calories,
    protein_g: hit.protein_g,
    carbs_g: hit.carbs_g,
    fat_g: hit.fat_g,
    nutrition_status: 'official',
    nutrition_confidence: 'A',
    capture_status: 'resolved',
    source: 'free_text',
    explanation: `官方匹配：${hit.name}（${hit.source}）`,
  }
}

function unknownPayload(
  name: string,
  explanation: string,
  extras?: Partial<TextFoodLogPayload>
): TextFoodLogPayload {
  const trimmed = name.trim()
  return {
    id: newTextLogId(),
    name: trimmed,
    display_label: trimmed,
    user_input_label: trimmed,
    ...NULL_MACROS,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    nutrition_status: 'unknown',
    nutrition_confidence: 'Unknown',
    capture_status: 'photo_only',
    source: 'free_text',
    explanation,
    ...extras,
  }
}

export function resolveFreeTextMealClient(query: string): TextMealResolveResult {
  const trimmed = query.trim()
  if (!trimmed) {
    return {
      can_commit: true,
      action: 'create_unknown',
      payload: unknownPayload(trimmed, '請輸入菜名'),
    }
  }

  const kb = resolveMenuFromQuery(trimmed)
  if (kb && userLabelMatchesVerified(trimmed, kb.name)) {
    return { can_commit: true, action: 'create_official', payload: officialFromKb(kb, trimmed) }
  }

  if (isClearlyUnknownQuery(trimmed)) {
    return {
      can_commit: true,
      action: 'create_unknown',
      payload: unknownPayload(trimmed, '完全沒有可信營養資料，建立 Text Only Record。'),
    }
  }

  if (hasClarificationPattern(trimmed)) {
    return {
      can_commit: false,
      action: 'clarify',
      message:
        '菜名需要再確認一下，請從搜尋建議選擇正確品項，或建立純文字紀錄。',
      outcome: {
        level: 'B',
        action: 'clarify',
        query: trimmed,
        explanation: '模糊菜名需 Smart Clarification',
        candidates: [],
      },
    }
  }

  const hits = searchFoodMenuExtended(trimmed, 5)
  const possible = hits.slice(0, 3).map(h => h.name)

  if (hits.length >= 2 && hits[0]!.confidence - hits[1]!.confidence < 0.08) {
    return {
      can_commit: false,
      action: 'clarify',
      message: '找到多個相近品項，請從搜尋建議點選正確的一項。',
      outcome: {
        level: 'B',
        action: 'clarify',
        query: trimmed,
        explanation: '多候選相近需使用者選擇',
        candidates: [],
      },
    }
  }

  const top = hits[0]
  if (top && userLabelMatchesVerified(trimmed, top.name) && top.confidence >= 0.99) {
    return {
      can_commit: true,
      action: 'create_official',
      payload: {
        id: top.id,
        name: top.name,
        display_label: top.name,
        user_input_label: trimmed,
        matched_item_label: top.name,
        matched_restaurant: top.store,
        match_type: 'exact_search_match',
        store: top.store,
        calories: top.calories,
        protein_g: top.protein_g,
        carbs_g: top.carbs_g,
        fat_g: top.fat_g,
        nutrition_status: 'official',
        nutrition_confidence: 'A',
        capture_status: 'resolved',
        source: 'free_text',
        explanation: `搜尋匹配：${top.name}`,
      },
    }
  }

  return {
    can_commit: true,
    action: 'create_unknown',
    payload: unknownPayload(trimmed, '完全沒有可信營養資料，建立 Text Only Record。', {
      matched_item_label: top?.name,
      matched_restaurant: top?.store,
      match_type: top ? 'possible_match' : undefined,
      possible_matches: possible,
    }),
  }
}
