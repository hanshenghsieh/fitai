/** 文字紀錄 — Nutrition Search V2（Accuracy First，禁止 meal-target 粗估） */

import { resolveMenuFromQuery } from '@/lib/food-menu-lookup'
import { resolveFreeTextMealClient } from '@/lib/nutrition/search-v2/client-resolve'

export interface FreeTextMealResult {
  id: string
  name: string
  store?: string
  calories: number | null
  protein_g: number | null
  carbs_g?: number | null
  fat_g?: number | null
  source: 'search' | 'free_text'
  /** @deprecated use nutrition_status — true when blocked from commit (Level B clarify) */
  estimated: boolean
  blocked?: boolean
  nutrition_status?: 'official' | 'unknown'
  nutrition_confidence?: 'A' | 'B' | 'Unknown'
  capture_status?: 'resolved' | 'photo_only'
  explanation?: string
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
      calories: null,
      protein_g: null,
      source: 'free_text',
      estimated: true,
      blocked: true,
      explanation: resolved.message,
    }
  }
  const p = resolved.payload
  return {
    id: p.id,
    name: p.name,
    store: p.store,
    calories: p.calories,
    protein_g: p.protein_g,
    carbs_g: p.carbs_g,
    fat_g: p.fat_g,
    source: p.source,
    estimated: resolved.action === 'create_unknown',
    nutrition_status: p.nutrition_status,
    nutrition_confidence: p.nutrition_confidence,
    capture_status: p.capture_status,
    explanation: p.explanation,
  }
}

export function resolveOrEstimateFreeTextMeal(
  name: string,
  _mealTargetKcal?: number,
  _mealTargetProteinG?: number
): FreeTextMealResult {
  const verified = resolveMenuFromQuery(name)
  if (verified) {
    return {
      id: verified.id,
      name: verified.name,
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

  const resolved = resolveFreeTextMealClient(name)
  if (!resolved.can_commit) {
    return {
      id: `blocked-${Date.now()}`,
      name: name.trim(),
      calories: null,
      protein_g: null,
      source: 'free_text',
      estimated: true,
      blocked: true,
      explanation: resolved.message,
    }
  }

  const p = resolved.payload
  return {
    id: p.id,
    name: p.name,
    store: p.store,
    calories: p.calories,
    protein_g: p.protein_g,
    carbs_g: p.carbs_g,
    fat_g: p.fat_g,
    source: p.source,
    estimated: resolved.action === 'create_unknown',
    nutrition_status: p.nutrition_status,
    nutrition_confidence: p.nutrition_confidence,
    capture_status: p.capture_status,
    explanation: p.explanation,
  }
}
