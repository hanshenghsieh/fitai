import {
  getDishTemplates,
  getVariantsForTemplate,
  getBrandItemsForTemplate,
  normalizeDishLabel,
} from './catalog'
import type { DishSearchHit } from './types'

function scoreMatch(query: string, labels: string[]): number {
  const q = normalizeDishLabel(query)
  if (!q) return 0
  let best = 0
  for (const label of labels) {
    const norm = normalizeDishLabel(label)
    if (!norm) continue
    if (norm === q) best = Math.max(best, 100)
    else if (norm.startsWith(q)) best = Math.max(best, 70)
    else if (norm.includes(q)) best = Math.max(best, 45)
    else if (q.includes(norm) && norm.length >= 2) best = Math.max(best, 35)
  }
  return best
}

export function searchDishCatalog(query: string, limit = 8): DishSearchHit[] {
  const q = query.trim()
  if (!q) return []
  const hits: DishSearchHit[] = []

  for (const template of getDishTemplates()) {
    const score = scoreMatch(q, [template.name, ...template.aliases, ...template.tags])
    if (score > 0) {
      hits.push({
        kind: 'template',
        score: score + 20,
        template,
        label: template.name,
        subtitle: template.category,
      })
    }
  }

  for (const template of getDishTemplates()) {
    for (const variant of getVariantsForTemplate(template.id)) {
      const score = scoreMatch(q, [variant.name, ...variant.aliases, ...variant.tags])
      if (score > 0) {
        hits.push({
          kind: 'variant',
          score,
          template,
          variant,
          label: variant.name,
          subtitle: template.name,
        })
      }
    }
  }

  for (const template of getDishTemplates()) {
    for (const brand of getBrandItemsForTemplate(template.id)) {
      const score = scoreMatch(q, [
        brand.brandName + brand.itemName,
        `${brand.brandName}${brand.itemName}`,
        ...brand.aliases,
      ])
      if (score > 0) {
        hits.push({
          kind: 'brand',
          score: score - 5,
          template,
          brandItem: brand,
          label: `${brand.brandName}｜${brand.itemName}`,
          subtitle: template.name,
        })
      }
    }
  }

  return hits
    .sort((a, b) => {
      if (a.kind === 'variant' && b.kind !== 'variant' && a.score >= 70) return -1
      if (b.kind === 'variant' && a.kind !== 'variant' && b.score >= 70) return 1
      return b.score - a.score
    })
    .filter((hit, i, arr) => arr.findIndex(h => h.label === hit.label && h.kind === hit.kind) === i)
    .slice(0, limit)
}
