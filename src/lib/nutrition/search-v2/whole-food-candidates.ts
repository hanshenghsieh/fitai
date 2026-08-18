/**
 * Whole-food / generic-ingredient candidates for the search-v2 matcher.
 *
 * Root cause of the "egg accuracy" bug: collectClientCandidates only ever
 * searched restaurant/convenience-store menu items (food-menu-lookup.ts) and
 * Food DNA templates — never the per-100g ingredient database that already
 * exists for the home-cooked meal builder (whole-food-registry.ts /
 * ingredient-db.json). A basic query like "蛋" or "雞蛋" has no clean entry in
 * either of those two sources, so it fell through to weak fuzzy-substring
 * matches against unrelated composite dishes (e.g. "雞蛋起司潛艇堡"). This
 * file reuses the same accurate, sourced ingredient data for free-text /
 * photo queries, with basic quantity parsing ("1顆", "100g") so a count-based
 * query is converted to grams before scaling from the per-100g reference —
 * never treating "1 顆" as if it were "100g".
 */
import { resolveWholeFoodLabel } from '@/lib/nutrition/home-cooked/whole-food-registry'
import type { WholeFoodReference } from '@/lib/nutrition/home-cooked/types'
import type { NutritionMacros, SearchV2Candidate } from '@/lib/nutrition/search-v2/types'

/** Defensive ceiling — an ad-hoc single-food query should never resolve to a multi-kilogram portion. */
const MAX_PLAUSIBLE_GRAMS = 1000
const MAX_PLAUSIBLE_PIECES = 20
/** Reference scale shown when no quantity is known and the food has no vetted piece weight. */
const REFERENCE_GRAMS = 100

// P0 photo-portion fix — 塊/支/片/份 cover how the photo-vision prompt's own
// example portion text counts meat/bone-in pieces ("約 4 塊", "2 支雞翅"),
// which previously had no quantity unit at all and silently fell through to
// the flat REFERENCE_GRAMS default regardless of how many pieces were
// visible. 顆/個/粒 (whole small items like eggs/fruit) were already here.
const QUANTITY_STRIP_PATTERN = /^\s*\d+(?:\.\d+)?\s*(g|克|公克|顆|個|粒|塊|支|片|份)\s*/i
const GRAM_PATTERN = /(\d+(?:\.\d+)?)\s*(g|克|公克)/i
const COUNT_PATTERN = /(\d+(?:\.\d+)?)\s*(顆|個|粒|塊|支|片|份)/

export interface ParsedFoodQuantity {
  grams: number
  /** False when the query text had no explicit amount. */
  explicit: boolean
  /** Set when a parsed amount looked implausible and was clamped back to a safe default. */
  clamped: boolean
  /**
   * True when we could not resolve a real portion (no explicit amount, and
   * this food has no vetted grams_per_piece) — `grams` is just the per-100g
   * reference scale, not an actual estimated serving. Callers must not
   * present this as a confident answer.
   */
  unresolved: boolean
}

/**
 * Reads an explicit gram or count quantity out of free text (e.g. "2顆蛋",
 * "100g雞蛋"). A bare count ("1顆") only resolves to a real gram amount when
 * the matched food has a vetted `grams_per_piece` — foods without one (most
 * of the 500+ row ingredient DB, since only eggs have been vetted so far)
 * fall back to `unresolved: true` instead of guessing a generic 50g, which
 * previously produced silently-wrong small portions for things like rice,
 * apples, or soy milk (a 50g "banana" is less than half a real one).
 */
export function parseFoodQuantityGrams(
  query: string,
  food: Pick<WholeFoodReference, 'grams_per_piece'>
): ParsedFoodQuantity {
  const gramMatch = query.match(GRAM_PATTERN)
  if (gramMatch) {
    const grams = parseFloat(gramMatch[1]!)
    if (Number.isFinite(grams) && grams > 0 && grams <= MAX_PLAUSIBLE_GRAMS) {
      return { grams, explicit: true, clamped: false, unresolved: false }
    }
    return { grams: REFERENCE_GRAMS, explicit: true, clamped: true, unresolved: false }
  }

  const countMatch = query.match(COUNT_PATTERN)
  if (countMatch && food.grams_per_piece != null) {
    const count = parseFloat(countMatch[1]!)
    if (Number.isFinite(count) && count > 0 && count <= MAX_PLAUSIBLE_PIECES) {
      return { grams: count * food.grams_per_piece, explicit: true, clamped: false, unresolved: false }
    }
    return { grams: food.grams_per_piece, explicit: true, clamped: true, unresolved: false }
  }

  // No explicit gram amount, and either no count in the text or this food
  // has no vetted piece weight to multiply it by.
  if (food.grams_per_piece != null) {
    return { grams: food.grams_per_piece, explicit: false, clamped: false, unresolved: false }
  }
  return { grams: REFERENCE_GRAMS, explicit: false, clamped: false, unresolved: true }
}

function scaleMacros(food: WholeFoodReference, grossGrams: number): NutritionMacros {
  // Build 38 BUG 2 — bone-in items (排骨 etc.) report a gross/as-served
  // weight; calories_per_100 etc. are per 100g of edible meat, so the gram
  // amount must be discounted by edible_fraction before scaling — matching
  // the same fix in home-cooked/portion-calculator.ts's calculateIngredientPortion.
  const grams = food.edible_fraction != null ? grossGrams * food.edible_fraction : grossGrams
  const factor = grams / 100
  return {
    calories: Math.round(food.calories_per_100 * factor),
    protein: Math.round(food.protein_g_per_100 * factor * 10) / 10,
    fat: Math.round(food.fat_g_per_100 * factor * 10) / 10,
    carbs: Math.round(food.carbs_g_per_100 * factor * 10) / 10,
    fiber: food.fiber_g_per_100 != null ? Math.round(food.fiber_g_per_100 * factor * 10) / 10 : null,
    sugar: null,
    sodium: food.sodium_mg_per_100 != null ? Math.round(food.sodium_mg_per_100 * factor) : null,
  }
}

export function wholeFoodSearchCandidates(query: string): SearchV2Candidate[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  // Strip a leading quantity token so "1顆蛋" resolves the same food as "蛋".
  const nameOnly = trimmed.replace(QUANTITY_STRIP_PATTERN, '').trim() || trimmed
  const { food, confidence } = resolveWholeFoodLabel(nameOnly)
  // 'low' confidence here is loose prefix/suffix overlap (e.g. "茶葉蛋" would
  // otherwise fuzzy-match "茶葉（乾）") — too noisy to surface as an automated
  // search candidate, unlike the home-cooked picker where a human reviews it.
  if (!food || confidence === 'unmatched' || confidence === 'low') return []

  const quantity = parseFoodQuantityGrams(trimmed, food)
  const macros = scaleMacros(food, quantity.grams)

  // Task 2D severe-error guard: a clamped/implausible parse, or a portion we
  // could not actually resolve, must never be presented as a confident
  // (Level A) result — better to under-claim than assert a specific wrong
  // number.
  const needsConfirmation = quantity.clamped || quantity.unresolved
  const baseScore = confidence === 'high' ? 96 : confidence === 'medium' ? 70 : 48
  const matchScore = needsConfirmation ? Math.min(baseScore, 60) : baseScore
  const nutritionConfidence = needsConfirmation ? 'B' : confidence === 'high' ? 'A' : 'B'

  const portionNote = quantity.unresolved
    ? `每 100g 參考值，實際份量請確認`
    : quantity.explicit
      ? `${Math.round(quantity.grams)}g`
      : `約 ${Math.round(quantity.grams)}g（未指定份量，以一般一顆估算）`

  // P0 photo-portion fix — Step 11 observability. Production previously only
  // saw the final summed kcal with no way to reconstruct which ingredient
  // matched which DB row, what weight was assumed, or what kcal_per_100g was
  // applied. Dev/server-only structured log (console.debug, not persisted to
  // the user's nutrition record) — no image data, no PII, just the numbers
  // that produced this candidate.
  console.debug('[whole-food-candidates] resolved', {
    recognized_food: nameOnly,
    matched_food_name: food.name_zh,
    match_confidence: confidence,
    estimated_weight_g: Math.round(quantity.grams),
    weight_explicit: quantity.explicit,
    weight_unresolved: quantity.unresolved,
    edible_fraction: food.edible_fraction ?? null,
    edible_weight_g: food.edible_fraction != null ? Math.round(quantity.grams * food.edible_fraction) : null,
    kcal_per_100g: food.calories_per_100,
    calculated_kcal: macros.calories,
    nutrition_source: food.source ?? '食材資料庫',
  })

  return [
    {
      id: `wholefood-${food.id}`,
      name: food.name_zh,
      macros,
      nutrition_status: 'official',
      nutrition_confidence: nutritionConfidence,
      nutrition_source: food.source ?? '食材資料庫',
      source_tier: 'official',
      match_score: matchScore,
      explanation: `一般食材資料庫比對：${food.name_zh}，${portionNote}${food.note ? `（${food.note}）` : ''}`,
    },
  ]
}
