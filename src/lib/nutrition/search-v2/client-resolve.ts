/**
 * Client-safe text resolve — food-kb + runtime menu only (no ONR fs).
 * Full Search V2 with ONR: `text-log-pipeline.ts` (Node / tests).
 */
import { resolveMenuFromQuery, searchFoodMenuExtended } from '@/lib/food-menu-lookup'
import { NULL_MACROS } from '@/lib/nutrition/search-v2/types'
import { isClearlyUnknownQuery, hasClarificationPattern } from '@/lib/nutrition/search-v2/query-patterns'
import type { TextFoodLogPayload, TextMealResolveResult } from '@/lib/nutrition/search-v2/text-log-pipeline'

function newTextLogId(): string {
  return `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function officialFromKb(
  hit: NonNullable<ReturnType<typeof resolveMenuFromQuery>>
): TextFoodLogPayload {
  return {
    id: hit.id,
    name: hit.name,
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

function unknownPayload(name: string, explanation: string): TextFoodLogPayload {
  return {
    id: newTextLogId(),
    name: name.trim(),
    ...NULL_MACROS,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    nutrition_status: 'unknown',
    nutrition_confidence: 'Unknown',
    capture_status: 'photo_only',
    source: 'free_text',
    explanation,
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
  if (kb) {
    return { can_commit: true, action: 'create_official', payload: officialFromKb(kb) }
  }

  if (isClearlyUnknownQuery(trimmed)) {
    return {
      can_commit: true,
      action: 'create_unknown',
      payload: unknownPayload(
        trimmed,
        '完全沒有可信營養資料，建立 Text Only Record。'
      ),
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
  const strong = hits.filter(h => h.confidence >= 0.85)
  if (strong.length === 1) {
    const h = strong[0]!
    return {
      can_commit: true,
      action: 'create_official',
      payload: {
        id: h.id,
        name: h.name,
        store: h.store,
        calories: h.calories,
        protein_g: h.protein_g,
        carbs_g: h.carbs_g,
        fat_g: h.fat_g,
        nutrition_status: 'official',
        nutrition_confidence: 'A',
        capture_status: 'resolved',
        source: 'free_text',
        explanation: `搜尋匹配：${h.name}`,
      },
    }
  }

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

  if (hits[0] && hits[0].confidence >= 0.72) {
    const h = hits[0]
    return {
      can_commit: true,
      action: 'create_official',
      payload: {
        id: h.id,
        name: h.name,
        store: h.store,
        calories: h.calories,
        protein_g: h.protein_g,
        carbs_g: h.carbs_g,
        fat_g: h.fat_g,
        nutrition_status: 'official',
        nutrition_confidence: 'B',
        capture_status: 'resolved',
        source: 'free_text',
        explanation: `搜尋匹配：${h.name}`,
      },
    }
  }

  if (hits.length === 0 || isClearlyUnknownQuery(trimmed)) {
    return {
      can_commit: true,
      action: 'create_unknown',
      payload: unknownPayload(
        trimmed,
        '完全沒有可信營養資料，建立 Text Only Record。'
      ),
    }
  }

  return {
    can_commit: true,
    action: 'create_unknown',
    payload: unknownPayload(trimmed, '完全沒有可信營養資料，建立 Text Only Record。'),
  }
}
