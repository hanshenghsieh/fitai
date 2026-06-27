/**
 * Manual photo correction — commit payloads preserving AI metadata (P0).
 */
import type { FoodLogEntry } from '@/lib/banks/types'
import type { FoodSlot } from '@/lib/food-slots'
import type { FoodCategory } from '@/lib/nutrition/food-category-guard'
import type { PhotoVisualParse } from '@/lib/nutrition/photo-visual-parse'
import type { ManualNutritionInput } from '@/lib/nutrition/unknown-food-flow'
import type { SearchV2Candidate } from '@/lib/nutrition/search-v2/types'
import { enqueueUnknownPhoto } from '@/lib/nutrition/search-v2/unknown-photo-queue'

export interface PhotoAiMetaPayload {
  photo_ai_original_candidates: string[]
  photo_ai_detected_label: string
  photo_ai_visual_category: FoodCategory
  photo_ai_category_confidence: string
}

export type ManualPhotoCorrectionResult =
  | {
      mode: 'verified'
      label: string
      restaurant?: string
      category: FoodCategory
      candidate: SearchV2Candidate
      photoAi: PhotoAiMetaPayload
    }
  | {
      mode: 'user_entered'
      label: string
      restaurant?: string
      category: FoodCategory
      nutrition: ManualNutritionInput
      photoAi: PhotoAiMetaPayload
    }
  | {
      mode: 'unknown_photo'
      label: string
      restaurant?: string
      category: FoodCategory
      photoAi: PhotoAiMetaPayload
    }

export function buildPhotoAiMeta(
  visualParse: PhotoVisualParse,
  originalCandidates: string[]
): PhotoAiMetaPayload {
  return {
    photo_ai_original_candidates: originalCandidates,
    photo_ai_detected_label: visualParse.detected_label,
    photo_ai_visual_category: visualParse.visual_category,
    photo_ai_category_confidence: visualParse.category_confidence,
  }
}

export function manualPhotoCorrectionReady(result: ManualPhotoCorrectionResult): boolean {
  if (result.mode === 'verified') return Boolean(result.candidate)
  if (result.mode === 'unknown_photo') return result.label.trim().length > 0
  const n = result.nutrition
  return (
    n.calories != null ||
    n.protein_g != null ||
    n.fat_g != null ||
    n.carbs_g != null
  )
}

export function buildFoodLogFromManualPhotoCorrection(
  result: ManualPhotoCorrectionResult,
  opts: { id: string; logged_at?: string; photo_data_url?: string; slot?: FoodSlot }
): FoodLogEntry {
  const logged_at = opts.logged_at ?? new Date().toISOString()
  const correctionMeta = {
    user_corrected_label: result.label.trim(),
    user_corrected_restaurant: result.restaurant?.trim() || undefined,
    user_corrected_category: result.category,
    correction_source: 'manual_photo_correction' as const,
  }

  const base = {
    id: opts.id,
    slot: opts.slot,
    user_declared: true as const,
    logged_at,
    photo_data_url: opts.photo_data_url,
    photo_ai_meta: result.photoAi,
    photo_correction_meta: correctionMeta,
    source: 'photo' as const,
  }

  if (result.mode === 'verified') {
    const c = result.candidate
    return {
      ...base,
      name: c.name,
      display_label: c.name,
      user_input_label: result.label.trim(),
      matched_item_label: c.name,
      matched_restaurant: c.store,
      match_type: 'user_selected_verified_item',
      store: c.store ?? result.restaurant,
      calories: c.macros.calories,
      protein_g: c.macros.protein,
      carbs_g: c.macros.carbs,
      fat_g: c.macros.fat,
      nutrition_status: 'official',
      nutrition_confidence: 'B',
      capture_status: 'resolved',
    }
  }

  if (result.mode === 'user_entered') {
    const n = result.nutrition
    const label = result.label.trim()
    return {
      ...base,
      name: label,
      display_label: label,
      user_input_label: label,
      store: result.restaurant,
      calories: n.calories,
      protein_g: n.protein_g,
      carbs_g: n.carbs_g,
      fat_g: n.fat_g,
      nutrition_status: 'user_entered',
      nutrition_confidence: 'user_confirmed',
      capture_status: 'resolved',
      user_nutrition_meta: {
        source_type: 'user_input',
        portion: n.portion,
        notes: n.notes,
        source_note: n.source_note,
        entered_at: logged_at,
        partial:
          n.calories == null ||
          n.protein_g == null ||
          n.fat_g == null ||
          n.carbs_g == null,
        fiber_g: n.fiber_g,
        sugar_g: n.sugar_g,
        sodium_mg: n.sodium_mg,
      },
    }
  }

  const label = result.label.trim()
  enqueueUnknownPhoto({
    detected_label: result.photoAi.photo_ai_detected_label,
    user_label: label,
    restaurant: result.restaurant ?? null,
    possible_matches: result.photoAi.photo_ai_original_candidates.slice(0, 5),
  })

  return {
    ...base,
    name: label,
    display_label: label,
    user_input_label: label,
    store: result.restaurant,
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    nutrition_status: 'unknown',
    nutrition_confidence: 'Unknown',
    capture_status: 'photo_only',
  }
}
