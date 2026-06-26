import { eatOutMenu, type ConvenienceItem } from '@/lib/convenience-store-menu'
import { searchFoodMenuExtended } from '@/lib/food-menu-lookup'
import { passesMenuAccessGate } from '@/lib/nutrition/menu-confidence-runtime'

/** Client-safe search — food-kb + runtime menu (no ONR fs). */
export function searchFoodMenu(query: string, limit = 8): ConvenienceItem[] {
  const q = query.trim().toLowerCase()
  if (!q || q.length < 1) return []

  const kbHits = searchFoodMenuExtended(query, limit)
  if (kbHits.length) {
    return kbHits.map(hit => ({
      id: hit.id,
      name: hit.name,
      store: hit.store,
      source: hit.store === '7-11' || hit.store === '全家' ? ('convenience' as const) : ('chain' as const),
      category: 'lunch' as const,
      role: 'combo' as const,
      portionable: false,
      tags: [],
      calories: hit.calories,
      protein_g: hit.protein_g,
      carbs_g: hit.carbs_g,
      fat_g: hit.fat_g,
      price: 0,
      photo_url: '',
      description: hit.source === 'food_kb' ? '7-11 官網營養 · food-kb verified' : 'verified menu',
    }))
  }

  const scored = eatOutMenu
    .filter(item => passesMenuAccessGate(item, 'search'))
    .map(item => {
      const name = item.name.toLowerCase()
      const store = item.store.toLowerCase()
      let score = 0
      if (name === q) score += 100
      else if (name.startsWith(q)) score += 50
      else if (name.includes(q)) score += 30
      else if (store.includes(q)) score += 10
      else return null
      return { item, score }
    })
    .filter((x): x is { item: ConvenienceItem; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item)

  return scored
}
