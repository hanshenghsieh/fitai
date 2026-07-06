import {
  PROTEINS,
  CARBS,
  VEGETABLES,
  FATS,
  type HomeIngredient,
} from '@/lib/home-ingredient-db'
import type { WholeFoodCategory, WholeFoodReference } from '@/lib/nutrition/home-cooked/types'

const EXTRA_ALIASES: Record<string, string[]> = {
  salmon: ['鮭魚', '鮭魚塊', '三文魚', '鮭'],
  tofu: ['豆腐', '板豆腐', '嫩豆腐', '絹豆腐'],
  cabbage: ['高麗菜', '卷心菜', '甘藍'],
  carrot: ['紅蘿蔔', '胡蘿蔔'],
  bean_sprouts: ['豆芽', '豆芽菜'],
  ground_meat: ['絞肉', '炒絞肉', '豬絞肉', '牛絞肉', '肉末'],
  curry_sauce: ['咖哩', '咖哩醬', '咖哩醬汁', '咖喱醬'],
  chicken_breast: ['雞胸', '雞胸肉'],
  egg: ['雞蛋', '蛋'],
}

function mapCategory(cat: HomeIngredient['category']): WholeFoodCategory {
  if (cat === 'protein') return 'protein'
  if (cat === 'carb') return 'carb'
  if (cat === 'veg') return 'veg'
  if (cat === 'fat') return 'fat'
  return 'other'
}

function homeIngredientToReference(ing: HomeIngredient): WholeFoodReference {
  const unit = ing.unit === 'ml' ? 'ml' : ing.unit === '顆' || ing.unit === '片' ? 'piece' : 'g'
  return {
    id: ing.id,
    name_zh: ing.name_zh,
    category: mapCategory(ing.category),
    aliases: [ing.name_zh, ...(EXTRA_ALIASES[ing.id] ?? [])],
    calories_per_100: ing.caloriesPer100g,
    protein_g_per_100: ing.proteinPer100g,
    carbs_g_per_100: ing.carbsPer100g,
    fat_g_per_100: ing.fatPer100g,
    default_unit: unit,
    grams_per_piece: ing.unit === '顆' ? 50 : ing.unit === '片' ? 35 : undefined,
    vegan: ing.vegan,
    source: 'home_ingredient_db',
  }
}

/** Built-in whole foods — will migrate to DB table `whole_foods`. */
const BUILTIN: WholeFoodReference[] = [
  ...PROTEINS.map(homeIngredientToReference),
  ...CARBS.map(homeIngredientToReference),
  ...VEGETABLES.map(homeIngredientToReference),
  ...FATS.map(homeIngredientToReference),
  {
    id: 'bean_sprouts',
    name_zh: '豆芽菜',
    category: 'veg',
    aliases: ['豆芽', '豆芽菜'],
    calories_per_100: 30,
    protein_g_per_100: 3,
    carbs_g_per_100: 6,
    fat_g_per_100: 0.2,
    default_unit: 'g',
    source: 'manual',
  },
  {
    id: 'ground_meat',
    name_zh: '絞肉',
    category: 'protein',
    aliases: ['絞肉', '炒絞肉', '豬絞肉', '牛絞肉', '肉末', '豬或牛'],
    calories_per_100: 250,
    protein_g_per_100: 20,
    carbs_g_per_100: 0,
    fat_g_per_100: 18,
    default_unit: 'g',
    source: 'manual',
  },
  {
    id: 'curry_sauce',
    name_zh: '咖哩醬汁',
    category: 'sauce',
    aliases: ['咖哩', '咖哩醬', '咖哩醬汁', '咖喱', '咖喱醬'],
    calories_per_100: 120,
    protein_g_per_100: 2,
    carbs_g_per_100: 10,
    fat_g_per_100: 8,
    default_unit: 'ml',
    source: 'manual',
  },
]

const REGISTRY = new Map<string, WholeFoodReference>(BUILTIN.map(f => [f.id, f]))

export function listWholeFoods(): WholeFoodReference[] {
  return [...REGISTRY.values()]
}

export function getWholeFoodById(id: string): WholeFoodReference | null {
  return REGISTRY.get(id) ?? null
}

function normLabel(label: string): string {
  return label
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

/** Match AI-detected label to a whole food reference. */
export function resolveWholeFoodLabel(rawLabel: string): {
  food: WholeFoodReference | null
  confidence: 'high' | 'medium' | 'low' | 'unmatched'
} {
  const norm = normLabel(rawLabel)
  if (!norm) return { food: null, confidence: 'unmatched' }

  for (const food of REGISTRY.values()) {
    if (normLabel(food.name_zh) === norm) {
      return { food, confidence: 'high' }
    }
    for (const alias of food.aliases) {
      if (normLabel(alias) === norm) {
        return { food, confidence: 'high' }
      }
    }
  }

  let best: WholeFoodReference | null = null
  let bestLen = 0
  for (const food of REGISTRY.values()) {
    const candidates = [food.name_zh, ...food.aliases]
    for (const c of candidates) {
      const n = normLabel(c)
      if (n.length < 2) continue
      if (norm.includes(n) && n.length > bestLen) {
        best = food
        bestLen = n.length
      }
    }
  }

  if (best) {
    return { food: best, confidence: bestLen >= 3 ? 'medium' : 'low' }
  }

  return { food: null, confidence: 'unmatched' }
}
