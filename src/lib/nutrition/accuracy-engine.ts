/**
 * BetterBit Nutrition Accuracy Engine
 *
 * Pipeline: scene → candidates → Food DNA → portion → confirm → food_log
 * AI photo alone never writes final kcal without user confirmation.
 */
import type {
  AccuracyEngineInput,
  AccuracyLevel,
  ConfirmationQuestion,
  FinalNutritionEstimate,
  FoodCandidate,
  FoodDNATemplate,
  FoodLogWritePayload,
  MacroNutrition,
  MealScene,
  MealSceneCategory,
  NutritionEstimateDraft,
  NutritionSourceType,
  PortionAdjustment,
  UserConfirmationAnswers,
} from './types'
import { sumAddOnDeltas } from './add-ons'
import { runPhotoSearchV2Pipeline } from '@/lib/nutrition/search-v2/photo-pipeline'
import {
  generateVariantsForLabel,
  getFoodDNATemplate,
  resolveTemplateIdFromLabel,
  templateFromVerifiedMenu,
} from './food-dna-catalog'
import {
  buildConfirmationQuestions,
  categoryRequiresConfirmation,
  detectHighRiskTags,
  isHighRiskFood,
} from './high-risk'

export type {
  AccuracyEngineInput,
  AccuracyLevel,
  FinalNutritionEstimate,
  FoodCandidate,
  FoodDNATemplate,
  FoodLogWritePayload,
  MealScene,
  NutritionEstimateDraft,
  NutritionSourceType,
  PortionAdjustment,
  UserConfirmationAnswers,
} from './types'

const STORE_CATEGORY: Array<{ pattern: RegExp; category: MealSceneCategory }> = [
  { pattern: /7-11|全家|萊爾富|OK超商|美廉社/i, category: 'convenience_store' },
  { pattern: /全聯|家樂福|Costco|大潤發|愛買/i, category: 'supermarket' },
  { pattern: /麥當勞|肯德基|摩斯|漢堡王|Subway|必勝客|達美樂/i, category: 'fast_food' },
  { pattern: /五十嵐|清心|CoCo|可不可|迷客夏|一芳|萬波|麻古|珍煮丹/i, category: 'drink_shop' },
  { pattern: /星巴克|路易莎|cama|85度C|咖啡/i, category: 'cafe' },
  { pattern: /健康餐|舒肥|蛋白盒子|森度|FitBox/i, category: 'healthy_meal_box' },
  { pattern: /美而美|麥味登|弘爺|蛋餅|早餐/i, category: 'breakfast_shop' },
  { pattern: /石二鍋|築間|馬辣|鼎王|無老鍋|詹記|麻辣/i, category: 'hot_pot' },
  { pattern: /燒肉|乾杯|屋馬|牛角/i, category: 'bbq' },
  { pattern: /丸龜|壽司|藏壽司|爭鮮|日式/i, category: 'japanese' },
  { pattern: /韓式|豆腐|八色烤/i, category: 'korean' },
  { pattern: /牛肉麵|麵線|拉麵|烏龍/i, category: 'noodle_shop' },
  { pattern: /滷味|滷之家/i, category: 'braised_snack' },
  { pattern: /鹽酥雞|雞排/i, category: 'fried_chicken' },
  { pattern: /夜市/i, category: 'night_market' },
  { pattern: /美食街|SOGO|新光|101|微風|京站/i, category: 'mall_food_court' },
]

function inferCategory(label: string, store?: string): MealSceneCategory {
  const hay = `${store ?? ''} ${label}`
  for (const row of STORE_CATEGORY) {
    if (row.pattern.test(hay)) return row.category
  }
  if (/便當/.test(label)) return 'bento_shop'
  return 'unknown'
}

function accuracyFromSource(
  source: NutritionSourceType,
  verified?: boolean
): AccuracyLevel {
  if (source === 'official' || source === 'barcode') return 'A'
  if (source === 'verified_brand_menu' || verified) return 'A'
  if (source === 'betterbit_template') return 'B'
  if (source === 'user_confirmed_estimate') return 'C'
  return 'D'
}

function canQuickAdd(level: AccuracyLevel, requiresConfirmation: boolean): boolean {
  if (requiresConfirmation) return false
  return level === 'A' || level === 'B'
}

function canWriteLog(level: AccuracyLevel, confirmed: boolean): boolean {
  if (level === 'D') return confirmed
  if (level === 'C') return confirmed
  return true
}

/** Step 1 — classify meal scene */
export function classifyMealScene(input: AccuracyEngineInput): MealScene {
  const label = input.label.trim()
  let category = inferCategory(label, input.store)
  if (input.location_context && /美食街|百貨|SOGO|101|微風|京站/i.test(input.location_context)) {
    category = 'mall_food_court'
  }
  const high_risk_tags = detectHighRiskTags(label)
  const is_high_risk = isHighRiskFood(label, high_risk_tags) || categoryRequiresConfirmation(category, high_risk_tags)
  const location_context = input.location_context
  const restaurant_name = input.store

  return {
    category,
    location_context,
    restaurant_name,
    is_high_risk,
    high_risk_tags,
    requires_confirmation: is_high_risk || input.photo_parse === true,
  }
}

/** Step 2 — 1–3 food candidates (never single fake-precise guess) */
export function generateFoodCandidates(input: AccuracyEngineInput, scene: MealScene): FoodCandidate[] {
  const label = input.label.trim()
  const variants = generateVariantsForLabel(label)
  const templateId = resolveTemplateIdFromLabel(label)
  const baseConfidence = input.source_type === 'ai_photo_only' ? 0.45 : 0.72

  if (variants.length > 1) {
    return variants.slice(0, 3).map((name, i) => ({
      id: `cand_${i}`,
      display_name: name,
      canonical_food_name: name,
      restaurant_name: input.store,
      confidence: Math.max(0.35, baseConfidence - i * 0.08),
      match_reason: templateId ? 'template_variant' : 'label_variant',
    }))
  }

  const candidates: FoodCandidate[] = [{
    id: 'cand_0',
    display_name: label,
    canonical_food_name: label,
    restaurant_name: input.store,
    confidence: baseConfidence,
    match_reason: templateId ? 'template_match' : 'direct_label',
  }]

  if (scene.high_risk_tags.includes('bento') && !/滷|炸/.test(label)) {
    candidates.push({
      id: 'cand_1',
      display_name: '炸雞腿便當',
      canonical_food_name: '炸雞腿便當',
      restaurant_name: input.store,
      confidence: baseConfidence - 0.1,
      match_reason: 'bento_fried_variant',
    })
    candidates.push({
      id: 'cand_2',
      display_name: '滷雞腿便當',
      canonical_food_name: '滷雞腿便當',
      restaurant_name: input.store,
      confidence: baseConfidence - 0.12,
      match_reason: 'bento_braised_variant',
    })
  }

  return candidates.slice(0, 3)
}

/** Step 3 — apply Food DNA template */
export function applyFoodDNATemplate(
  candidate: FoodCandidate,
  input: AccuracyEngineInput
): FoodDNATemplate {
  if (input.verified_menu) {
    const level = input.barcode_hit
      ? 'A'
      : accuracyFromSource(input.source_type ?? 'verified_brand_menu', true)
    return templateFromVerifiedMenu(input.verified_menu, {
      canonical_food_name: candidate.canonical_food_name,
      source_type: input.barcode_hit ? 'barcode' : (input.source_type ?? 'verified_brand_menu'),
      accuracy_level: level,
    })
  }

  const templateId = resolveTemplateIdFromLabel(candidate.canonical_food_name)
  const hit = templateId ? getFoodDNATemplate(templateId) : null
  if (hit) return { ...hit, canonical_food_name: candidate.canonical_food_name }

  const level: AccuracyLevel =
    input.source_type === 'ai_photo_only' ? 'D' : 'C'

  return templateFromVerifiedMenu(
    {
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      portion_size: 1,
      portion_unit: '份',
      portion_risk: 'high',
      sauce_risk: 'high',
      fried_risk: 'medium',
      sugar_risk: 'medium',
      requires_confirmation: true,
      high_risk_tags: detectHighRiskTags(candidate.canonical_food_name),
    },
    {
      canonical_food_name: candidate.canonical_food_name,
      source_type: input.source_type ?? 'ai_photo_only',
      accuracy_level: level,
    }
  )
}

const RICE_MULT: Record<string, number> = {
  less: 0.75,
  half: 0.5,
  normal: 1,
  extra: 1.25,
}

const PORTION_MULT: Record<string, number> = {
  small: 0.7,
  medium: 1,
  large: 1.35,
  half: 0.5,
  one: 1,
  two: 2,
}

const COOKING_DELTA: Record<string, Partial<MacroNutrition>> = {
  fried: { kcal: 80, fat_g: 12 },
  braised: { kcal: 20, fat_g: 4 },
  grilled: { kcal: -20, fat_g: -6 },
  pan_fried: { kcal: 40, fat_g: 6 },
  steamed: { kcal: -30, fat_g: -8 },
  unknown: {},
}

const SUGAR_DELTA: Record<string, Partial<MacroNutrition>> = {
  none: { kcal: -120, carbs_g: -30 },
  light: { kcal: -80, carbs_g: -20 },
  half: { kcal: -40, carbs_g: -10 },
  full: { kcal: 40, carbs_g: 10 },
}

const SAUCE_DELTA: Record<string, Partial<MacroNutrition>> = {
  none: { kcal: -60, fat_g: -6, carbs_g: -4 },
  less: { kcal: -30, fat_g: -3, carbs_g: -2 },
  normal: { kcal: 0, fat_g: 0, carbs_g: 0 },
  extra: { kcal: 50, fat_g: 5, carbs_g: 4 },
}

/** Step 4 — portion / modifier adjustments */
export function estimatePortionAdjustments(
  template: FoodDNATemplate,
  adjustments: PortionAdjustment = {}
): MacroNutrition & { diet_score: number } {
  let kcal = template.kcal
  let protein_g = template.protein_g
  let carbs_g = template.carbs_g
  let fat_g = template.fat_g
  let fiber_g = template.fiber_g ?? 0
  let sodium_mg = template.sodium_mg ?? 0
  let diet_score = template.diet_score

  const riceKey = adjustments.rice_portion
  if (riceKey && RICE_MULT[riceKey] != null) {
    const riceKcal = template.carbs_g * 0.55
    const riceCarbs = template.carbs_g * 0.55
    const mult = RICE_MULT[riceKey]!
    kcal += riceKcal * (mult - 1)
    carbs_g += riceCarbs * (mult - 1)
    if (riceKey === 'less' || riceKey === 'half') diet_score += 4
    if (riceKey === 'extra') diet_score -= 5
  }

  const portionKey = adjustments.portion_size
  if (portionKey && PORTION_MULT[portionKey] != null) {
    const mult = PORTION_MULT[portionKey]!
    kcal *= mult
    protein_g *= mult
    carbs_g *= mult
    fat_g *= mult
    fiber_g *= mult
    sodium_mg *= mult
  }

  const cook = adjustments.cooking_method ? COOKING_DELTA[adjustments.cooking_method] : undefined
  if (cook) {
    kcal += cook.kcal ?? 0
    protein_g += cook.protein_g ?? 0
    carbs_g += cook.carbs_g ?? 0
    fat_g += cook.fat_g ?? 0
  }

  const sugar = adjustments.drink_sugar ? SUGAR_DELTA[adjustments.drink_sugar] : undefined
  if (sugar) {
    kcal += sugar.kcal ?? 0
    carbs_g += sugar.carbs_g ?? 0
    if (adjustments.drink_sugar === 'none') diet_score += 6
    if (adjustments.drink_sugar === 'full') diet_score -= 6
  }

  const sauce = adjustments.sauce_level ? SAUCE_DELTA[adjustments.sauce_level] : undefined
  if (sauce) {
    kcal += sauce.kcal ?? 0
    carbs_g += sauce.carbs_g ?? 0
    fat_g += sauce.fat_g ?? 0
    if (adjustments.sauce_level === 'none' || adjustments.sauce_level === 'less') diet_score += 4
    if (adjustments.sauce_level === 'extra') diet_score -= 4
  }

  const addOnIds = [
    ...(adjustments.add_on_ids ?? []),
    ...(adjustments.substitution_ids ?? []),
  ]
  if (addOnIds.length) {
    const delta = sumAddOnDeltas(addOnIds)
    kcal += delta.kcal_delta
    protein_g += delta.protein_delta
    carbs_g += delta.carbs_delta
    fat_g += delta.fat_delta
    diet_score += delta.diet_score_delta
  }

  return {
    kcal: Math.max(0, Math.round(kcal)),
    protein_g: Math.max(0, Math.round(protein_g * 10) / 10),
    carbs_g: Math.max(0, Math.round(carbs_g * 10) / 10),
    fat_g: Math.max(0, Math.round(fat_g * 10) / 10),
    fiber_g: Math.max(0, Math.round(fiber_g * 10) / 10),
    sodium_mg: Math.max(0, Math.round(sodium_mg)),
    diet_score: Math.max(0, Math.min(100, Math.round(diet_score))),
  }
}

/** Step 5 — determine if user must confirm (max 2 questions) */
export function requireUserConfirmation(
  scene: MealScene,
  template: FoodDNATemplate,
  accuracy_level: AccuracyLevel
): { requires_confirmation: boolean; questions: ConfirmationQuestion[] } {
  const requires_confirmation =
    scene.requires_confirmation ||
    template.requires_confirmation ||
    accuracy_level === 'C' ||
    accuracy_level === 'D'

  const questions = requires_confirmation
    ? buildConfirmationQuestions(scene.high_risk_tags, scene.category)
    : []

  return { requires_confirmation, questions }
}

/** Build draft estimate — blocks direct write for D / unconfirmed C */
export function buildNutritionEstimateDraft(
  input: AccuracyEngineInput,
  candidate: FoodCandidate,
  adjustments: PortionAdjustment = {}
): NutritionEstimateDraft {
  const scene = classifyMealScene(input)
  const template = applyFoodDNATemplate(candidate, input)
  const macros = estimatePortionAdjustments(template, adjustments)

  const source_type = template.source_type
  const accuracy_level = template.accuracy_level
  const { requires_confirmation, questions } = requireUserConfirmation(scene, template, accuracy_level)

  const can_quick_add = canQuickAdd(accuracy_level, requires_confirmation)
  const can_write_log = canWriteLog(accuracy_level, false)

  let block_reason: string | undefined
  if (source_type === 'ai_photo_only' && accuracy_level === 'D') {
    block_reason = 'AI 照片辨識不可直接入帳，請選擇候選或確認份量'
  } else if (accuracy_level === 'C' || accuracy_level === 'D') {
    block_reason = '需要使用者一秒確認後才可寫入'
  }

  return {
    scene,
    candidate,
    template,
    adjustments,
    macros,
    satiety_score: template.satiety_score,
    diet_score: macros.diet_score,
    source_type,
    accuracy_level,
    requires_confirmation,
    confirmation_questions: questions,
    can_quick_add,
    can_write_log,
    block_reason,
  }
}

/** Step 6 — finalize for food_logs (only when rules pass) */
export function finalizeNutritionEstimate(
  draft: NutritionEstimateDraft,
  answers: UserConfirmationAnswers
): FinalNutritionEstimate {
  const adjustments: PortionAdjustment = {
    ...draft.adjustments,
    rice_portion: (answers.rice_portion as PortionAdjustment['rice_portion']) ?? draft.adjustments.rice_portion,
    cooking_method: (answers.cooking_method as PortionAdjustment['cooking_method']) ?? draft.adjustments.cooking_method,
    drink_sugar: (answers.drink_sugar as PortionAdjustment['drink_sugar']) ?? draft.adjustments.drink_sugar,
    sauce_level: (answers.sauce_level as PortionAdjustment['sauce_level']) ?? draft.adjustments.sauce_level,
    portion_size: (answers.portion_size as PortionAdjustment['portion_size']) ?? draft.adjustments.portion_size,
  }

  const macros = estimatePortionAdjustments(draft.template, adjustments)
  const needsConfirm = draft.requires_confirmation || draft.accuracy_level === 'C' || draft.accuracy_level === 'D'
  const user_confirmed = answers.user_confirmed === true
  const ready = canWriteLog(draft.accuracy_level, user_confirmed) && (!needsConfirm || user_confirmed)

  if (!ready) {
    return {
      name: draft.candidate.display_name,
      store: draft.candidate.restaurant_name,
      location_context: draft.scene.location_context,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      source_type: draft.source_type,
      accuracy_level: draft.accuracy_level,
      satiety_score: draft.satiety_score,
      diet_score: macros.diet_score,
      template_id: draft.template.template_id,
      user_confirmed: false,
      ready_for_food_log: false,
    }
  }

  return {
    name: draft.candidate.display_name,
    store: draft.candidate.restaurant_name,
    location_context: draft.scene.location_context,
    calories: macros.kcal,
    protein_g: macros.protein_g,
    carbs_g: macros.carbs_g,
    fat_g: macros.fat_g,
    fiber_g: macros.fiber_g,
    sodium_mg: macros.sodium_mg,
    source_type: draft.source_type,
    accuracy_level: draft.accuracy_level,
    satiety_score: draft.satiety_score,
    diet_score: macros.diet_score,
    template_id: draft.template.template_id,
    user_confirmed,
    ready_for_food_log: ready,
  }
}

export function finalizeToFoodLogPayload(
  final: FinalNutritionEstimate,
  opts: { id: string; logged_at: string; source?: FoodLogWritePayload['source'] }
): FoodLogWritePayload | null {
  if (!final.ready_for_food_log) return null
  if (final.source_type === 'ai_photo_only' && final.accuracy_level === 'D') return null
  const confidence =
    final.accuracy_level === 'A' ? 'high' : final.accuracy_level === 'B' ? 'medium' : 'low'
  return {
    id: opts.id,
    name: final.name,
    store: final.store,
    calories: final.calories,
    protein_g: final.protein_g,
    carbs_g: final.carbs_g,
    fat_g: final.fat_g,
    confidence,
    source: opts.source ?? 'photo',
    user_declared: true,
    logged_at: opts.logged_at,
  }
}

/** Full photo pipeline helper — delegates to Nutrition Search V2 (photo cannot be looser than text). */
export function runPhotoAccuracyPipeline(
  input: AccuracyEngineInput,
  answers: UserConfirmationAnswers = { user_confirmed: false }
) {
  const { state, resolved, ready, payload } = runPhotoSearchV2Pipeline(input.label, {
    store: input.store,
    user_confirmed: answers.user_confirmed,
    clarification_answers: Object.fromEntries(
      Object.entries(answers).filter(([k]) => !['user_confirmed', 'selected_candidate_id'].includes(k))
    ) as Record<string, string>,
  })

  const scene = classifyMealScene({ ...input, photo_parse: true, source_type: 'ai_photo_only' })
  const candidates = generateFoodCandidates(input, scene)
  const selected =
    candidates.find(c => c.id === answers.selected_candidate_id) ?? candidates[0]!
  const draft = buildNutritionEstimateDraft({ ...input, photo_parse: true }, selected)

  const unknown = resolved.action === 'create_unknown' || payload?.nutrition_status === 'unknown'
  const official = resolved.official_record

  const final: FinalNutritionEstimate = {
    name: payload?.name ?? official?.name ?? (input.label.trim() || '未知食物'),
    store: payload?.store ?? official?.store ?? input.store,
    location_context: input.location_context,
    calories: payload?.calories ?? 0,
    protein_g: payload?.protein_g ?? 0,
    carbs_g: payload?.carbs_g ?? 0,
    fat_g: payload?.fat_g ?? 0,
    fiber_g: payload?.fiber_g ?? undefined,
    sodium_mg: payload?.sodium_mg ?? undefined,
    source_type: unknown
      ? 'ai_photo_only'
      : official || payload?.nutrition_status === 'official'
        ? 'verified_brand_menu'
        : 'ai_photo_only',
    accuracy_level:
      payload?.nutrition_confidence === 'A' || resolved.level === 'A'
        ? 'A'
        : payload?.nutrition_confidence === 'B' || resolved.level === 'B'
          ? 'B'
          : 'D',
    satiety_score: draft.satiety_score,
    diet_score: draft.diet_score,
    template_id: draft.template.template_id,
    user_confirmed: answers.user_confirmed === true,
    ready_for_food_log: ready,
  }

  return { scene, candidates, draft, final, photo_v2: state, v2_payload: payload }
}
