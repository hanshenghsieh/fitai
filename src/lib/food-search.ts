import { eatOutMenu, type ConvenienceItem } from '@/lib/convenience-store-menu'

export function searchFoodMenu(query: string, limit = 8): ConvenienceItem[] {
  const q = query.trim().toLowerCase()
  if (!q || q.length < 1) return []

  const scored = eatOutMenu
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
