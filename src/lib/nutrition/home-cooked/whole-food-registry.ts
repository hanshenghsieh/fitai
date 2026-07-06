import ingredientDb from '@/lib/nutrition/home-cooked/data/ingredient-db.json'
import type { WholeFoodReference } from '@/lib/nutrition/home-cooked/types'

const REGISTRY = new Map<string, WholeFoodReference>(
  (ingredientDb as WholeFoodReference[]).map(f => [f.id, f])
)

export function listWholeFoods(): WholeFoodReference[] {
  return [...REGISTRY.values()]
}

export function getWholeFoodById(id: string): WholeFoodReference | null {
  const key = id.toLowerCase()
  return REGISTRY.get(key) ?? REGISTRY.get(id) ?? null
}

function normLabel(label: string): string {
  return label
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

/** Match AI-detected label to IngredientDB row */
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
      if (n.includes(norm) && norm.length > bestLen) {
        best = food
        bestLen = norm.length
      }
    }
  }

  if (best) {
    return { food: best, confidence: bestLen >= 3 ? 'medium' : 'low' }
  }

  return { food: null, confidence: 'unmatched' }
}
