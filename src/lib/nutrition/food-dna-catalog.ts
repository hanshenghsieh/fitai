import type { FoodDNATemplate, HighRiskTag } from './types'
import { computeBetterBitFoodScore } from '@/lib/betterbit-food-score'

function dna(
  partial: Omit<FoodDNATemplate, 'protein_density' | 'calorie_density' | 'satiety_score' | 'diet_score'> &
    Partial<Pick<FoodDNATemplate, 'satiety_score' | 'diet_score'>>
): FoodDNATemplate {
  const kcal = partial.kcal
  const protein = partial.protein_g
  const scores = computeBetterBitFoodScore({
    name: partial.canonical_food_name,
    calories: kcal,
    protein_g: protein,
    carbs_g: partial.carbs_g,
    fat_g: partial.fat_g,
    fiber_g: partial.fiber_g,
    category: partial.category,
  })
  return {
    ...partial,
    protein_density: Math.round((protein / Math.max(kcal, 1)) * 1000) / 10,
    calorie_density: Math.round((kcal / Math.max(partial.portion_size, 1)) * 10) / 10,
    satiety_score: partial.satiety_score ?? scores.satiety_score,
    diet_score: partial.diet_score ?? scores.diet_score,
  }
}

/** Curated BetterBit Food DNA templates — v1 seed anchors */
export const FOOD_DNA_TEMPLATES: Record<string, FoodDNATemplate> = {
  convenience_chicken_breast: dna({
    template_id: 'convenience_chicken_breast',
    canonical_food_name: '雞胸肉',
    category: 'convenience_store',
    kcal: 120, protein_g: 23, carbs_g: 1, fat_g: 3, fiber_g: 0, sodium_mg: 320,
    portion_size: 1, portion_unit: '份',
    portion_risk: 'low', sauce_risk: 'low', fried_risk: 'low', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'B',
    requires_confirmation: false, high_risk_tags: [],
    add_on_options: [],
  }),
  convenience_tea_egg: dna({
    template_id: 'convenience_tea_egg',
    canonical_food_name: '茶葉蛋',
    category: 'convenience_store',
    kcal: 75, protein_g: 6, carbs_g: 1, fat_g: 5, fiber_g: 0, sodium_mg: 280,
    portion_size: 1, portion_unit: '顆',
    portion_risk: 'low', sauce_risk: 'low', fried_risk: 'low', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'B',
    requires_confirmation: false, high_risk_tags: [],
  }),
  convenience_sweet_potato: dna({
    template_id: 'convenience_sweet_potato',
    canonical_food_name: '地瓜',
    category: 'convenience_store',
    kcal: 130, protein_g: 2, carbs_g: 30, fat_g: 0.2, fiber_g: 4, sodium_mg: 50,
    portion_size: 1, portion_unit: '條',
    portion_risk: 'medium', sauce_risk: 'low', fried_risk: 'low', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'B',
    requires_confirmation: false, high_risk_tags: [],
  }),
  fast_food_combo: dna({
    template_id: 'fast_food_combo',
    canonical_food_name: '主餐套餐',
    category: 'fast_food',
    kcal: 720, protein_g: 28, carbs_g: 75, fat_g: 32, fiber_g: 4, sodium_mg: 1100,
    portion_size: 1, portion_unit: '套餐',
    portion_risk: 'medium', sauce_risk: 'medium', fried_risk: 'medium', sugar_risk: 'medium',
    source_type: 'betterbit_template', accuracy_level: 'B',
    requires_confirmation: true, high_risk_tags: ['combo_meal'],
    add_on_options: ['extra_egg', 'extra_meat', 'combo_to_single'],
  }),
  bubble_tea_half_sugar_pearl: dna({
    template_id: 'bubble_tea_half_sugar_pearl',
    canonical_food_name: '半糖珍珠奶茶',
    category: 'drink_shop',
    kcal: 380, protein_g: 4, carbs_g: 58, fat_g: 12, fiber_g: 0, sodium_mg: 120,
    portion_size: 1, portion_unit: '大杯',
    portion_risk: 'medium', sauce_risk: 'low', fried_risk: 'low', sugar_risk: 'high',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['bubble_tea'],
    substitution_options: ['drink_no_sugar', 'drink_half_sugar'],
  }),
  bento_fried_chicken_leg: dna({
    template_id: 'bento_fried_chicken_leg',
    canonical_food_name: '炸雞腿便當',
    category: 'bento_shop',
    kcal: 780, protein_g: 32, carbs_g: 85, fat_g: 34, fiber_g: 3, sodium_mg: 980,
    portion_size: 1, portion_unit: '便當',
    portion_risk: 'high', sauce_risk: 'medium', fried_risk: 'high', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['bento', 'combo_meal'],
    add_on_options: ['less_rice', 'half_rice', 'extra_egg'],
    substitution_options: ['skin_removed', 'no_fry', 'grill_instead', 'braise_instead'],
  }),
  bento_braised_chicken_leg: dna({
    template_id: 'bento_braised_chicken_leg',
    canonical_food_name: '滷雞腿便當',
    category: 'bento_shop',
    kcal: 680, protein_g: 34, carbs_g: 82, fat_g: 24, fiber_g: 3, sodium_mg: 920,
    portion_size: 1, portion_unit: '便當',
    portion_risk: 'high', sauce_risk: 'medium', fried_risk: 'low', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['bento'],
    add_on_options: ['less_rice', 'half_rice'],
  }),
  braised_snack_plate: dna({
    template_id: 'braised_snack_plate',
    canonical_food_name: '滷味拼盤',
    category: 'braised_snack',
    kcal: 420, protein_g: 22, carbs_g: 18, fat_g: 28, fiber_g: 2, sodium_mg: 1400,
    portion_size: 1, portion_unit: '中份',
    portion_risk: 'high', sauce_risk: 'high', fried_risk: 'low', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['braised_snack'],
    substitution_options: ['sauce_less', 'sauce_on_side'],
  }),
  fried_chicken_cutlet: dna({
    template_id: 'fried_chicken_cutlet',
    canonical_food_name: '雞排',
    category: 'fried_chicken',
    kcal: 520, protein_g: 28, carbs_g: 22, fat_g: 34, fiber_g: 1, sodium_mg: 680,
    portion_size: 1, portion_unit: '份',
    portion_risk: 'high', sauce_risk: 'low', fried_risk: 'high', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['fried_chicken', 'night_market'],
  }),
  hot_pot_meal: dna({
    template_id: 'hot_pot_meal',
    canonical_food_name: '個人火鍋',
    category: 'hot_pot',
    kcal: 850, protein_g: 38, carbs_g: 45, fat_g: 52, fiber_g: 6, sodium_mg: 2200,
    portion_size: 1, portion_unit: '鍋',
    portion_risk: 'high', sauce_risk: 'high', fried_risk: 'medium', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['hot_pot'],
  }),
  bbq_meal: dna({
    template_id: 'bbq_meal',
    canonical_food_name: '燒肉套餐',
    category: 'bbq',
    kcal: 920, protein_g: 42, carbs_g: 35, fat_g: 62, fiber_g: 4, sodium_mg: 1100,
    portion_size: 1, portion_unit: '人份',
    portion_risk: 'high', sauce_risk: 'medium', fried_risk: 'medium', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['bbq'],
  }),
  night_market_chicken_cutlet: dna({
    template_id: 'night_market_chicken_cutlet',
    canonical_food_name: '夜市雞排',
    category: 'night_market',
    kcal: 540, protein_g: 29, carbs_g: 24, fat_g: 36, fiber_g: 1, sodium_mg: 720,
    portion_size: 1, portion_unit: '份',
    portion_risk: 'high', sauce_risk: 'low', fried_risk: 'high', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['night_market', 'fried_chicken'],
  }),
  subway_footlong: dna({
    template_id: 'subway_footlong',
    canonical_food_name: 'Subway 潛艇堡',
    category: 'fast_food',
    kcal: 480, protein_g: 28, carbs_g: 52, fat_g: 14, fiber_g: 6, sodium_mg: 980,
    portion_size: 1, portion_unit: '份',
    portion_risk: 'medium', sauce_risk: 'medium', fried_risk: 'low', sugar_risk: 'low',
    source_type: 'verified_brand_menu', accuracy_level: 'A',
    requires_confirmation: false, high_risk_tags: [],
    substitution_options: ['sauce_less', 'sauce_on_side'],
  }),
  healthy_meal_box: dna({
    template_id: 'healthy_meal_box',
    canonical_food_name: '舒肥雞胸健康餐盒',
    category: 'healthy_meal_box',
    kcal: 420, protein_g: 38, carbs_g: 32, fat_g: 12, fiber_g: 6, sodium_mg: 520,
    portion_size: 1, portion_unit: '盒',
    portion_risk: 'low', sauce_risk: 'low', fried_risk: 'low', sugar_risk: 'low',
    source_type: 'verified_brand_menu', accuracy_level: 'B',
    requires_confirmation: false, high_risk_tags: [],
    add_on_options: ['sous_vide_chicken', 'side_salad'],
  }),
  breakfast_egg_crepe: dna({
    template_id: 'breakfast_egg_crepe',
    canonical_food_name: '蛋餅',
    category: 'breakfast_shop',
    kcal: 320, protein_g: 10, carbs_g: 32, fat_g: 16, fiber_g: 1, sodium_mg: 480,
    portion_size: 1, portion_unit: '份',
    portion_risk: 'medium', sauce_risk: 'medium', fried_risk: 'medium', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: [],
    add_on_options: ['extra_egg'],
    substitution_options: ['sauce_less'],
  }),
  beef_noodle: dna({
    template_id: 'beef_noodle',
    canonical_food_name: '牛肉麵',
    category: 'noodle_shop',
    kcal: 620, protein_g: 28, carbs_g: 72, fat_g: 22, fiber_g: 3, sodium_mg: 1800,
    portion_size: 1, portion_unit: '碗',
    portion_risk: 'medium', sauce_risk: 'medium', fried_risk: 'low', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['beef_noodle'],
  }),
  curry_rice: dna({
    template_id: 'curry_rice',
    canonical_food_name: '咖哩飯',
    category: 'japanese',
    kcal: 720, protein_g: 22, carbs_g: 88, fat_g: 28, fiber_g: 4, sodium_mg: 1200,
    portion_size: 1, portion_unit: '份',
    portion_risk: 'high', sauce_risk: 'high', fried_risk: 'medium', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['curry_rice'],
    add_on_options: ['less_rice', 'half_rice'],
  }),
  teppanyaki_set: dna({
    template_id: 'teppanyaki_set',
    canonical_food_name: '鐵板燒套餐',
    category: 'japanese',
    kcal: 780, protein_g: 36, carbs_g: 65, fat_g: 38, fiber_g: 5, sodium_mg: 1300,
    portion_size: 1, portion_unit: '套餐',
    portion_risk: 'high', sauce_risk: 'high', fried_risk: 'medium', sugar_risk: 'low',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['teppanyaki', 'combo_meal'],
  }),
  salad_with_dressing: dna({
    template_id: 'salad_with_dressing',
    canonical_food_name: '沙拉加醬',
    category: 'healthy_meal_box',
    kcal: 280, protein_g: 12, carbs_g: 18, fat_g: 18, fiber_g: 6, sodium_mg: 420,
    portion_size: 1, portion_unit: '份',
    portion_risk: 'medium', sauce_risk: 'high', fried_risk: 'low', sugar_risk: 'medium',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['salad_dressing'],
    substitution_options: ['sauce_less', 'sauce_on_side'],
  }),
  mall_udon: dna({
    template_id: 'mall_udon',
    canonical_food_name: '牛肉烏龍麵',
    category: 'mall_food_court',
    kcal: 580, protein_g: 22, carbs_g: 78, fat_g: 16, fiber_g: 3, sodium_mg: 1400,
    portion_size: 1, portion_unit: '碗',
    portion_risk: 'medium', sauce_risk: 'medium', fried_risk: 'low', sugar_risk: 'low',
    source_type: 'verified_brand_menu', accuracy_level: 'B',
    requires_confirmation: false, high_risk_tags: [],
  }),
  buffet_plate: dna({
    template_id: 'buffet_plate',
    canonical_food_name: '自助餐',
    category: 'independent_restaurant',
    kcal: 650, protein_g: 26, carbs_g: 70, fat_g: 28, fiber_g: 5, sodium_mg: 1100,
    portion_size: 1, portion_unit: '盤',
    portion_risk: 'high', sauce_risk: 'high', fried_risk: 'medium', sugar_risk: 'medium',
    source_type: 'betterbit_template', accuracy_level: 'C',
    requires_confirmation: true, high_risk_tags: ['buffet'],
  }),
}

const LABEL_TO_TEMPLATE: Array<{ pattern: RegExp; templateId: string; variants?: string[] }> = [
  { pattern: /健康餐|舒肥雞胸|餐盒/, templateId: 'healthy_meal_box' },
  { pattern: /雞胸肉|即食雞胸/, templateId: 'convenience_chicken_breast' },
  { pattern: /茶葉蛋/, templateId: 'convenience_tea_egg' },
  { pattern: /地瓜/, templateId: 'convenience_sweet_potato' },
  { pattern: /麥當勞|McDonald|套餐|薯條/, templateId: 'fast_food_combo', variants: ['主餐套餐', '大麥克套餐', '雙層牛肉吉士套餐'] },
  { pattern: /珍珠奶茶|半糖.*奶茶|奶茶.*半糖/, templateId: 'bubble_tea_half_sugar_pearl' },
  { pattern: /炸雞腿便當/, templateId: 'bento_fried_chicken_leg', variants: ['炸雞腿便當', '香酥雞腿便當'] },
  { pattern: /滷雞腿便當|雞腿便當/, templateId: 'bento_braised_chicken_leg', variants: ['滷雞腿便當', '雞腿便當', '雞排便當'] },
  { pattern: /滷味/, templateId: 'braised_snack_plate' },
  { pattern: /鹽酥雞/, templateId: 'fried_chicken_cutlet', variants: ['鹽酥雞', '鹹酥雞'] },
  { pattern: /火鍋/, templateId: 'hot_pot_meal' },
  { pattern: /燒肉/, templateId: 'bbq_meal' },
  { pattern: /夜市.*雞排|雞排/, templateId: 'night_market_chicken_cutlet' },
  { pattern: /Subway|潛艇堡/, templateId: 'subway_footlong' },
  { pattern: /蛋餅/, templateId: 'breakfast_egg_crepe' },
  { pattern: /牛肉麵/, templateId: 'beef_noodle' },
  { pattern: /咖哩飯|咖哩/, templateId: 'curry_rice' },
  { pattern: /鐵板燒/, templateId: 'teppanyaki_set' },
  { pattern: /沙拉.*醬|沙拉/, templateId: 'salad_with_dressing' },
  { pattern: /烏龍|丸龜/, templateId: 'mall_udon' },
  { pattern: /自助餐|buffet/i, templateId: 'buffet_plate' },
]

export function resolveTemplateIdFromLabel(label: string): string | null {
  for (const row of LABEL_TO_TEMPLATE) {
    if (row.pattern.test(label)) return row.templateId
  }
  return null
}

export function generateVariantsForLabel(label: string): string[] {
  for (const row of LABEL_TO_TEMPLATE) {
    if (row.pattern.test(label) && row.variants?.length) return row.variants
  }
  return [label]
}

export function getFoodDNATemplate(templateId: string): FoodDNATemplate | null {
  return FOOD_DNA_TEMPLATES[templateId] ?? null
}

export function templateFromVerifiedMenu(
  menu: Partial<FoodDNATemplate> & { kcal: number; protein_g: number; carbs_g: number; fat_g: number },
  overrides: { canonical_food_name: string; source_type: FoodDNATemplate['source_type']; accuracy_level: FoodDNATemplate['accuracy_level'] }
): FoodDNATemplate {
  return dna({
    template_id: menu.template_id ?? `verified_${overrides.canonical_food_name}`,
    canonical_food_name: overrides.canonical_food_name,
    category: menu.category,
    kcal: menu.kcal,
    protein_g: menu.protein_g,
    carbs_g: menu.carbs_g,
    fat_g: menu.fat_g,
    fiber_g: menu.fiber_g,
    sodium_mg: menu.sodium_mg,
    portion_size: menu.portion_size ?? 1,
    portion_unit: menu.portion_unit ?? '份',
    portion_risk: menu.portion_risk ?? 'medium',
    sauce_risk: menu.sauce_risk ?? 'medium',
    fried_risk: menu.fried_risk ?? 'low',
    sugar_risk: menu.sugar_risk ?? 'low',
    source_type: overrides.source_type,
    accuracy_level: overrides.accuracy_level,
    requires_confirmation: menu.requires_confirmation ?? false,
    high_risk_tags: menu.high_risk_tags ?? [],
    add_on_options: menu.add_on_options,
    substitution_options: menu.substitution_options,
  })
}
