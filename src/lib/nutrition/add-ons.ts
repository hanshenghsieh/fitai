import type { AddOnDelta } from './types'

/** Common side items & modifiers — each has macro deltas */
export const ADD_ON_CATALOG: Record<string, AddOnDelta> = {
  tea_egg: { id: 'tea_egg', label: '茶葉蛋', kcal_delta: 75, protein_delta: 6, carbs_delta: 1, fat_delta: 5, diet_score_delta: 4 },
  boiled_egg: { id: 'boiled_egg', label: '水煮蛋', kcal_delta: 70, protein_delta: 6, carbs_delta: 0.5, fat_delta: 5, diet_score_delta: 5 },
  sous_vide_chicken: { id: 'sous_vide_chicken', label: '舒肥雞胸', kcal_delta: 120, protein_delta: 23, carbs_delta: 0, fat_delta: 3, diet_score_delta: 8 },
  chicken_tender: { id: 'chicken_tender', label: '雞里肌', kcal_delta: 140, protein_delta: 26, carbs_delta: 0, fat_delta: 4, diet_score_delta: 7 },
  sugar_free_soy_milk: { id: 'sugar_free_soy_milk', label: '無糖豆漿', kcal_delta: 80, protein_delta: 7, carbs_delta: 4, fat_delta: 4, diet_score_delta: 5 },
  high_protein_milk: { id: 'high_protein_milk', label: '高蛋白牛奶', kcal_delta: 150, protein_delta: 20, carbs_delta: 8, fat_delta: 3, diet_score_delta: 6 },
  edamame: { id: 'edamame', label: '毛豆', kcal_delta: 120, protein_delta: 11, carbs_delta: 9, fat_delta: 5, diet_score_delta: 6 },
  sweet_potato: { id: 'sweet_potato', label: '地瓜', kcal_delta: 130, protein_delta: 2, carbs_delta: 30, fat_delta: 0.2, diet_score_delta: 4 },
  banana: { id: 'banana', label: '香蕉', kcal_delta: 105, protein_delta: 1.3, carbs_delta: 27, fat_delta: 0.4, diet_score_delta: 2 },
  greek_yogurt: { id: 'greek_yogurt', label: '希臘優格', kcal_delta: 100, protein_delta: 10, carbs_delta: 6, fat_delta: 3, diet_score_delta: 6 },
  whole_wheat_toast: { id: 'whole_wheat_toast', label: '全麥吐司', kcal_delta: 80, protein_delta: 4, carbs_delta: 14, fat_delta: 1, diet_score_delta: 3 },
  corn: { id: 'corn', label: '玉米', kcal_delta: 90, protein_delta: 3, carbs_delta: 19, fat_delta: 1.5, diet_score_delta: 2 },
  side_salad: { id: 'side_salad', label: '沙拉', kcal_delta: 45, protein_delta: 2, carbs_delta: 6, fat_delta: 2, diet_score_delta: 5 },
  tofu: { id: 'tofu', label: '豆腐', kcal_delta: 80, protein_delta: 8, carbs_delta: 2, fat_delta: 4, diet_score_delta: 5 },
  tuna_can: { id: 'tuna_can', label: '鮪魚罐頭', kcal_delta: 120, protein_delta: 20, carbs_delta: 0, fat_delta: 3, diet_score_delta: 7 },
  egg_white: { id: 'egg_white', label: '蛋白', kcal_delta: 50, protein_delta: 11, carbs_delta: 1, fat_delta: 0, diet_score_delta: 8 },
  chicken_thigh: { id: 'chicken_thigh', label: '雞腿排', kcal_delta: 220, protein_delta: 18, carbs_delta: 2, fat_delta: 15, diet_score_delta: -2 },
  salmon: { id: 'salmon', label: '鮭魚', kcal_delta: 200, protein_delta: 22, carbs_delta: 0, fat_delta: 12, diet_score_delta: 5 },
  shrimp: { id: 'shrimp', label: '蝦仁', kcal_delta: 85, protein_delta: 18, carbs_delta: 1, fat_delta: 1, diet_score_delta: 7 },
  extra_egg: { id: 'extra_egg', label: '加蛋', kcal_delta: 70, protein_delta: 6, carbs_delta: 0.5, fat_delta: 5, diet_score_delta: 3 },
  extra_meat: { id: 'extra_meat', label: '加肉', kcal_delta: 150, protein_delta: 18, carbs_delta: 0, fat_delta: 8, diet_score_delta: 2 },
  extra_rice: { id: 'extra_rice', label: '加飯', kcal_delta: 180, protein_delta: 3, carbs_delta: 40, fat_delta: 0.5, diet_score_delta: -6 },
  less_rice: { id: 'less_rice', label: '少飯', kcal_delta: -90, protein_delta: -1, carbs_delta: -20, fat_delta: 0, diet_score_delta: 5 },
  half_rice: { id: 'half_rice', label: '半飯', kcal_delta: -90, protein_delta: -1.5, carbs_delta: -20, fat_delta: 0, diet_score_delta: 4 },
  rice_to_veg: { id: 'rice_to_veg', label: '飯換菜', kcal_delta: -60, protein_delta: 1, carbs_delta: -15, fat_delta: 0, diet_score_delta: 6 },
  rice_to_sweet_potato: { id: 'rice_to_sweet_potato', label: '飯換地瓜', kcal_delta: -50, protein_delta: 0, carbs_delta: -10, fat_delta: 0, diet_score_delta: 4 },
  drink_no_sugar: { id: 'drink_no_sugar', label: '飲料無糖', kcal_delta: -120, protein_delta: 0, carbs_delta: -30, fat_delta: 0, diet_score_delta: 8 },
  drink_half_sugar: { id: 'drink_half_sugar', label: '飲料半糖', kcal_delta: -60, protein_delta: 0, carbs_delta: -15, fat_delta: 0, diet_score_delta: 4 },
  sauce_less: { id: 'sauce_less', label: '醬少', kcal_delta: -40, protein_delta: 0, carbs_delta: -3, fat_delta: -4, diet_score_delta: 5 },
  sauce_on_side: { id: 'sauce_on_side', label: '醬另外放', kcal_delta: -60, protein_delta: 0, carbs_delta: -4, fat_delta: -6, diet_score_delta: 6 },
  skin_removed: { id: 'skin_removed', label: '去皮', kcal_delta: -50, protein_delta: 0, carbs_delta: 0, fat_delta: -8, diet_score_delta: 5 },
  no_fry: { id: 'no_fry', label: '不要炸', kcal_delta: -120, protein_delta: 0, carbs_delta: -8, fat_delta: -12, diet_score_delta: 10 },
  grill_instead: { id: 'grill_instead', label: '改烤', kcal_delta: -80, protein_delta: 0, carbs_delta: 0, fat_delta: -10, diet_score_delta: 8 },
  braise_instead: { id: 'braise_instead', label: '改滷', kcal_delta: -40, protein_delta: 0, carbs_delta: 2, fat_delta: -6, diet_score_delta: 4 },
  combo_to_single: { id: 'combo_to_single', label: '套餐改單點', kcal_delta: -150, protein_delta: -2, carbs_delta: -25, fat_delta: -8, diet_score_delta: 5 },
}

export function getAddOn(id: string): AddOnDelta | undefined {
  return ADD_ON_CATALOG[id]
}

export function sumAddOnDeltas(ids: string[]): AddOnDelta {
  const base: AddOnDelta = {
    id: 'sum',
    label: 'modifiers',
    kcal_delta: 0,
    protein_delta: 0,
    carbs_delta: 0,
    fat_delta: 0,
    diet_score_delta: 0,
  }
  for (const id of ids) {
    const a = ADD_ON_CATALOG[id]
    if (!a) continue
    base.kcal_delta += a.kcal_delta
    base.protein_delta += a.protein_delta
    base.carbs_delta += a.carbs_delta
    base.fat_delta += a.fat_delta
    base.diet_score_delta += a.diet_score_delta
  }
  return base
}
