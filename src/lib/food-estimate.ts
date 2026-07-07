/** 文字紀錄 — Nutrition Search V2（Accuracy First，禁止 meal-target 粗估） */

import { resolveMenuFromQuery } from '@/lib/food-menu-lookup'
import { userLabelMatchesVerified } from '@/lib/nutrition/food-category-guard'
import { resolveFreeTextMealClient } from '@/lib/nutrition/search-v2/client-resolve'
import type { FoodNutritionStatus } from '@/lib/banks/types'

export interface FreeTextMealResult {
  id: string
  name: string
  display_label?: string
  user_input_label?: string
  matched_item_label?: string
  matched_restaurant?: string
  match_type?: string
  possible_matches?: string[]
  store?: string
  calories: number | null
  protein_g: number | null
  carbs_g?: number | null
  fat_g?: number | null
  source: 'search' | 'free_text'
  /** @deprecated use nutrition_status — true when blocked from commit (Level B clarify) */
  estimated: boolean
  blocked?: boolean
  nutrition_status?: FoodNutritionStatus
  nutrition_confidence?: 'A' | 'B' | 'Unknown' | 'user_confirmed'
  capture_status?: 'resolved' | 'photo_only'
  explanation?: string
}

function mapPayloadToResult(p: import('@/lib/nutrition/search-v2/text-log-pipeline').TextFoodLogPayload, estimated: boolean): FreeTextMealResult {
  const display = p.display_label ?? p.name
  return {
    id: p.id,
    name: display,
    display_label: display,
    user_input_label: p.user_input_label ?? display,
    matched_item_label: p.matched_item_label,
    matched_restaurant: p.matched_restaurant,
    match_type: p.match_type,
    possible_matches: p.possible_matches,
    store: p.store,
    calories: p.calories,
    protein_g: p.protein_g,
    carbs_g: p.carbs_g,
    fat_g: p.fat_g,
    source: p.source,
    estimated,
    nutrition_status: p.nutrition_status,
    nutrition_confidence: p.nutrition_confidence,
    capture_status: p.capture_status,
    explanation: p.explanation,
  }
}

/**
 * @deprecated Never use for commits — returns unknown text-only. Kept for test compatibility.
 */
export function estimateFreeTextMeal(name: string, _mealTargetKcal?: number, _mealTargetProteinG?: number): FreeTextMealResult {
  const resolved = resolveFreeTextMealClient(name)
  if (!resolved.can_commit) {
    return {
      id: `blocked-${Date.now()}`,
      name: name.trim(),
      display_label: name.trim(),
      user_input_label: name.trim(),
      calories: null,
      protein_g: null,
      source: 'free_text',
      estimated: true,
      blocked: true,
      explanation: resolved.message,
    }
  }
  return mapPayloadToResult(resolved.payload, resolved.action === 'create_unknown')
}

/** Level C text-only — always committable (UI: 手動建立文字紀錄). */
export function createUnknownFreeTextMeal(name: string): FreeTextMealResult {
  const trimmed = name.trim()
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    display_label: trimmed,
    user_input_label: trimmed,
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    source: 'free_text',
    estimated: true,
    blocked: false,
    nutrition_status: 'unknown',
    nutrition_confidence: 'Unknown',
    capture_status: 'photo_only',
    explanation: '完全沒有可信營養資料，建立 Text Only Record。',
  }
}

export function resolveOrEstimateFreeTextMeal(
  name: string,
  _mealTargetKcal?: number,
  _mealTargetProteinG?: number
): FreeTextMealResult {
  const trimmed = name.trim()
  const verified = resolveMenuFromQuery(trimmed)
  if (verified && userLabelMatchesVerified(trimmed, verified.name)) {
    return {
      id: verified.id,
      name: verified.name,
      display_label: verified.name,
      user_input_label: trimmed,
      matched_item_label: verified.name,
      matched_restaurant: verified.store,
      match_type: 'exact_kb_match',
      store: verified.store,
      calories: verified.calories,
      protein_g: verified.protein_g,
      carbs_g: verified.carbs_g,
      fat_g: verified.fat_g,
      source: 'search',
      estimated: false,
      nutrition_status: 'official',
      nutrition_confidence: 'A',
      capture_status: 'resolved',
      explanation: 'food-kb / runtime 官方匹配',
    }
  }

  const resolved = resolveFreeTextMealClient(trimmed)
  if (!resolved.can_commit) {
    return {
      id: `blocked-${Date.now()}`,
      name: trimmed,
      display_label: trimmed,
      user_input_label: trimmed,
      calories: null,
      protein_g: null,
      source: 'free_text',
      estimated: true,
      blocked: true,
      explanation: resolved.message,
    }
  }

  return mapPayloadToResult(resolved.payload, resolved.action === 'create_unknown')
}
