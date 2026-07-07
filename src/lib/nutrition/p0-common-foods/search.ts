import { getP0Catalog } from './catalog'
import { normalizeP0Name } from './normalize'
import type { CommonFoodItem, P0SearchHit } from './types'

function normalizeEnglishAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function scoreItem(query: string, item: CommonFoodItem): number {
  const q = normalizeP0Name(query)
  if (!q) return 0

  const nameNorm = normalizeP0Name(item.name)
  const qEnglish = normalizeEnglishAlias(query)

  if (nameNorm === q) return 100

  for (const alias of item.aliases) {
    if (normalizeP0Name(alias) === q) return 95
    if (normalizeEnglishAlias(alias) === qEnglish) return 95
  }

  if (nameNorm.includes(q) || q.includes(nameNorm)) return 72

  for (const alias of item.aliases) {
    const a = normalizeP0Name(alias)
    const aEnglish = normalizeEnglishAlias(alias)
    if (a === q) return 95
    if (a.includes(q) || q.includes(a)) return 62
    if (aEnglish.includes(qEnglish) || qEnglish.includes(aEnglish)) return 60
  }

  const categoryNorm = normalizeP0Name(item.category)
  if (categoryNorm.includes(q)) return 35

  for (const tag of item.tags) {
    if (normalizeP0Name(tag).includes(q)) return 32
  }

  if (item.brand && normalizeP0Name(item.brand).includes(q)) return 28

  const tokens = [...new Set(query.match(/[\u4e00-\u9fff]{1,}|[a-z0-9]{2,}/gi) ?? [])]
  if (!tokens.length) return 0
  const haystack = [item.name, ...item.aliases, item.category, ...item.tags, item.brand ?? '']
    .map(s => normalizeP0Name(s))
    .join(' ')
  const hits = tokens.filter(t => haystack.includes(normalizeP0Name(t))).length
  if (hits === 0) return 0
  return 20 + (hits / tokens.length) * 18
}

export function searchP0CommonFoods(query: string, limit = 8): P0SearchHit[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  return getP0Catalog()
    .map(item => ({ item, score: scoreItem(trimmed, item) }))
    .filter(hit => hit.score >= 28)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const aExact = normalizeP0Name(a.item.name) === normalizeP0Name(trimmed)
      const bExact = normalizeP0Name(b.item.name) === normalizeP0Name(trimmed)
      if (aExact !== bExact) return aExact ? -1 : 1
      if (a.item.sourceType !== b.item.sourceType) {
        if (a.item.sourceType === 'official') return -1
        if (b.item.sourceType === 'official') return 1
      }
      return a.item.name.localeCompare(b.item.name, 'zh-Hant')
    })
    .slice(0, limit)
}
