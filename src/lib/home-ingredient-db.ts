/** 自己煮模組食材庫 */

export type IngredientCategory = 'protein' | 'carb' | 'veg' | 'fat'
export type ComboTag = 'normal' | 'weekend' | 'lazy' | 'rainy' | 'comfort' | 'light'

export interface HomeIngredient {
  id: string
  name_zh: string
  category: IngredientCategory
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  unit: 'g' | '顆' | '片' | 'ml'
  defaultAmount: number
  vegan?: boolean
  tags?: ComboTag[]
}

export interface CookingMethod {
  id: string
  name_zh: string
  verb: string
  tags?: ComboTag[]
}

export const PROTEINS: HomeIngredient[] = [
  { id: 'chicken_breast', name_zh: '雞胸肉', category: 'protein', caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, unit: 'g', defaultAmount: 120 },
  { id: 'chicken_thigh', name_zh: '雞腿肉', category: 'protein', caloriesPer100g: 190, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 9, unit: 'g', defaultAmount: 130, tags: ['weekend', 'comfort'] },
  { id: 'egg', name_zh: '雞蛋', category: 'protein', caloriesPer100g: 143, proteinPer100g: 13, carbsPer100g: 1, fatPer100g: 10, unit: '顆', defaultAmount: 2 },
  { id: 'salmon', name_zh: '鮭魚', category: 'protein', caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13, unit: 'g', defaultAmount: 120 },
  { id: 'tuna', name_zh: '鮪魚', category: 'protein', caloriesPer100g: 132, proteinPer100g: 28, carbsPer100g: 0, fatPer100g: 1, unit: 'g', defaultAmount: 100 },
  { id: 'pork_loin', name_zh: '豬里肌', category: 'protein', caloriesPer100g: 143, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 4, unit: 'g', defaultAmount: 120 },
  { id: 'beef', name_zh: '牛里肌', category: 'protein', caloriesPer100g: 180, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 8, unit: 'g', defaultAmount: 120, tags: ['weekend'] },
  { id: 'shrimp', name_zh: '蝦仁', category: 'protein', caloriesPer100g: 99, proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 0.3, unit: 'g', defaultAmount: 120 },
  { id: 'tofu', name_zh: '板豆腐', category: 'protein', caloriesPer100g: 76, proteinPer100g: 8, carbsPer100g: 2, fatPer100g: 4.8, unit: 'g', defaultAmount: 150, vegan: true },
  { id: 'tempeh', name_zh: '天貝', category: 'protein', caloriesPer100g: 192, proteinPer100g: 19, carbsPer100g: 9, fatPer100g: 11, unit: 'g', defaultAmount: 100, vegan: true },
  { id: 'greek_yogurt', name_zh: '希臘優格', category: 'protein', caloriesPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.4, unit: 'g', defaultAmount: 150, tags: ['light'] },
  { id: 'milk', name_zh: '牛奶', category: 'protein', caloriesPer100g: 64, proteinPer100g: 3.3, carbsPer100g: 4.8, fatPer100g: 3.6, unit: 'ml', defaultAmount: 200 },
  { id: 'edamame', name_zh: '毛豆', category: 'protein', caloriesPer100g: 121, proteinPer100g: 11, carbsPer100g: 8, fatPer100g: 5, unit: 'g', defaultAmount: 100, vegan: true, tags: ['light', 'lazy'] },
  { id: 'white_fish', name_zh: '白肉魚', category: 'protein', caloriesPer100g: 96, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 1.2, unit: 'g', defaultAmount: 120, tags: ['light'] },
  { id: 'ground_turkey', name_zh: '火雞絞肉', category: 'protein', caloriesPer100g: 150, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 7, unit: 'g', defaultAmount: 120 },
]

export const CARBS: HomeIngredient[] = [
  { id: 'rice', name_zh: '白飯', category: 'carb', caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, unit: 'g', defaultAmount: 150 },
  { id: 'half_rice', name_zh: '半碗飯', category: 'carb', caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, unit: 'g', defaultAmount: 75, tags: ['light'] },
  { id: 'sweet_potato', name_zh: '地瓜', category: 'carb', caloriesPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1, unit: 'g', defaultAmount: 150 },
  { id: 'pumpkin', name_zh: '南瓜', category: 'carb', caloriesPer100g: 26, proteinPer100g: 1, carbsPer100g: 7, fatPer100g: 0.1, unit: 'g', defaultAmount: 200, tags: ['rainy', 'comfort'] },
  { id: 'oats', name_zh: '燕麥', category: 'carb', caloriesPer100g: 389, proteinPer100g: 17, carbsPer100g: 66, fatPer100g: 7, unit: 'g', defaultAmount: 40 },
  { id: 'whole_wheat_toast', name_zh: '全麥吐司', category: 'carb', caloriesPer100g: 250, proteinPer100g: 9, carbsPer100g: 43, fatPer100g: 4, unit: '片', defaultAmount: 2 },
  { id: 'noodles', name_zh: '麵條', category: 'carb', caloriesPer100g: 138, proteinPer100g: 4.5, carbsPer100g: 25, fatPer100g: 2, unit: 'g', defaultAmount: 120, tags: ['comfort', 'rainy'] },
  { id: 'rice_noodles', name_zh: '冬粉', category: 'carb', caloriesPer100g: 109, proteinPer100g: 0.2, carbsPer100g: 27, fatPer100g: 0, unit: 'g', defaultAmount: 80, tags: ['light'] },
  { id: 'brown_rice', name_zh: '糙米', category: 'carb', caloriesPer100g: 111, proteinPer100g: 2.6, carbsPer100g: 23, fatPer100g: 0.9, unit: 'g', defaultAmount: 150 },
  { id: 'corn', name_zh: '玉米', category: 'carb', caloriesPer100g: 86, proteinPer100g: 3.3, carbsPer100g: 19, fatPer100g: 1.2, unit: 'g', defaultAmount: 100 },
  { id: 'quinoa', name_zh: '藜麥', category: 'carb', caloriesPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 21, fatPer100g: 1.9, unit: 'g', defaultAmount: 80, tags: ['light'] },
  { id: 'barley', name_zh: '大麥', category: 'carb', caloriesPer100g: 123, proteinPer100g: 2.3, carbsPer100g: 28, fatPer100g: 0.4, unit: 'g', defaultAmount: 100, tags: ['comfort', 'rainy'] },
]

export const VEGETABLES: HomeIngredient[] = [
  { id: 'broccoli', name_zh: '花椰菜', category: 'veg', caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4, unit: 'g', defaultAmount: 150 },
  { id: 'spinach', name_zh: '菠菜', category: 'veg', caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, unit: 'g', defaultAmount: 150 },
  { id: 'cabbage', name_zh: '高麗菜', category: 'veg', caloriesPer100g: 25, proteinPer100g: 1.3, carbsPer100g: 6, fatPer100g: 0.1, unit: 'g', defaultAmount: 150 },
  { id: 'carrot', name_zh: '紅蘿蔔', category: 'veg', caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.2, unit: 'g', defaultAmount: 100 },
  { id: 'tomato', name_zh: '番茄', category: 'veg', caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, unit: 'g', defaultAmount: 150 },
  { id: 'mushroom', name_zh: '菇類', category: 'veg', caloriesPer100g: 22, proteinPer100g: 3.1, carbsPer100g: 3.3, fatPer100g: 0.3, unit: 'g', defaultAmount: 120 },
  { id: 'bok_choy', name_zh: '小白菜', category: 'veg', caloriesPer100g: 13, proteinPer100g: 1.5, carbsPer100g: 2.2, fatPer100g: 0.2, unit: 'g', defaultAmount: 150 },
  { id: 'pepper', name_zh: '青椒', category: 'veg', caloriesPer100g: 20, proteinPer100g: 0.9, carbsPer100g: 4.6, fatPer100g: 0.2, unit: 'g', defaultAmount: 100 },
  { id: 'cucumber', name_zh: '小黃瓜', category: 'veg', caloriesPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, unit: 'g', defaultAmount: 120, tags: ['light'] },
  { id: 'lettuce', name_zh: '生菜', category: 'veg', caloriesPer100g: 15, proteinPer100g: 1.4, carbsPer100g: 2.9, fatPer100g: 0.2, unit: 'g', defaultAmount: 100, tags: ['light'] },
  { id: 'eggplant', name_zh: '茄子', category: 'veg', caloriesPer100g: 25, proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.2, unit: 'g', defaultAmount: 150, tags: ['comfort'] },
  { id: 'asparagus', name_zh: '蘆筍', category: 'veg', caloriesPer100g: 20, proteinPer100g: 2.2, carbsPer100g: 3.9, fatPer100g: 0.1, unit: 'g', defaultAmount: 120, tags: ['light'] },
]

export const FATS: HomeIngredient[] = [
  { id: 'avocado', name_zh: '酪梨', category: 'fat', caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15, unit: 'g', defaultAmount: 50 },
  { id: 'nuts', name_zh: '堅果', category: 'fat', caloriesPer100g: 607, proteinPer100g: 20, carbsPer100g: 21, fatPer100g: 54, unit: 'g', defaultAmount: 15 },
  { id: 'olive_oil', name_zh: '橄欖油', category: 'fat', caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, unit: 'g', defaultAmount: 5 },
  { id: 'cheese', name_zh: '起司', category: 'fat', caloriesPer100g: 402, proteinPer100g: 25, carbsPer100g: 1.3, fatPer100g: 33, unit: 'g', defaultAmount: 20, tags: ['weekend'] },
]

export const COOKING_METHODS: CookingMethod[] = [
  { id: 'boiled', name_zh: '水煮', verb: '水煮' },
  { id: 'pan_fried', name_zh: '煎', verb: '煎' },
  { id: 'air_fry', name_zh: '氣炸', verb: '氣炸', tags: ['lazy'] },
  { id: 'steamed', name_zh: '蒸', verb: '蒸' },
  { id: 'soup', name_zh: '湯品', verb: '煮湯', tags: ['rainy', 'comfort'] },
  { id: 'japanese', name_zh: '日式', verb: '日式料理', tags: ['light'] },
  { id: 'korean', name_zh: '韓式', verb: '韓式拌', tags: ['weekend'] },
  { id: 'taiwanese', name_zh: '台式', verb: '台式快炒' },
  { id: 'simple', name_zh: '簡單', verb: '簡單做', tags: ['lazy'] },
  { id: 'one_pot', name_zh: '一鍋', verb: '一鍋搞定', tags: ['lazy', 'rainy'] },
  { id: 'stir_fry', name_zh: '快炒', verb: '快炒', tags: ['lazy'] },
  { id: 'salad', name_zh: '沙拉', verb: '拌沙拉', tags: ['light', 'lazy'] },
]

export const ZAIJIAN_COMBO_NOTES = [
  '懶人但像樣。',
  '這組不難，真的。',
  '週末也可以這樣吃。',
  '不用很會煮。',
  '看起來普通，吃起來穩。',
  '今天這樣就夠了。',
  '三步驟，別想太多。',
  '簡單但不算敷衍。',
  '我會選這個。',
  '煮完就可以躺了。',
]
