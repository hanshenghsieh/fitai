import type { KbFoodCluster, KbFoodItem, RawFoodObservation } from './types'
import { clusterKey, expandAliases, normalizeBrandName, normalizeFoodName } from './normalize'

export interface DedupeMatch {
  item?: KbFoodItem
  cluster?: KbFoodCluster
  score: number
  reason: 'legacy_id' | 'cluster_key' | 'alias' | 'fuzzy_name'
}

const FUZZY_THRESHOLD = 0.72

function tokenOverlap(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.85
  const setA = new Set(a.split(''))
  const setB = new Set(b.split(''))
  let inter = 0
  for (const c of setA) if (setB.has(c)) inter++
  return (2 * inter) / (setA.size + setB.size)
}

export function findBestMatch(
  obs: RawFoodObservation,
  items: KbFoodItem[],
  clusters: KbFoodCluster[]
): DedupeMatch | null {
  const brand = normalizeBrandName(obs.brand ?? obs.store ?? 'unknown')
  const key = clusterKey(brand, obs.name)
  const normName = normalizeFoodName(obs.name)

  if (obs.legacy_id) {
    const byLegacy = items.find(i => i.legacy_id === obs.legacy_id)
    if (byLegacy) {
      return { item: byLegacy, cluster: clusters.find(c => c.id === byLegacy.cluster_id), score: 1, reason: 'legacy_id' }
    }
  }

  const byCluster = clusters.find(c => c.cluster_key === key)
  if (byCluster) {
    const item = items.find(i => i.cluster_id === byCluster.id && i.store_name === (obs.store ?? brand))
    return { item, cluster: byCluster, score: 0.95, reason: 'cluster_key' }
  }

  const aliases = expandAliases(obs.name, obs.aliases)
  for (const cluster of clusters) {
    if (cluster.brand_slug && cluster.brand_slug !== brand) continue
    for (const alias of cluster.aliases) {
      if (aliases.includes(alias) || aliases.includes(normalizeFoodName(alias))) {
        const item = items.find(i => i.cluster_id === cluster.id)
        return { item, cluster, score: 0.9, reason: 'alias' }
      }
    }
  }

  let best: DedupeMatch | null = null
  const fuzzyOk =
    obs.source_type !== 'blog' &&
    obs.source_type !== 'official_website' &&
    obs.source_type !== 'official_pdf'
  for (const item of items) {
    if (normalizeBrandName(item.brand_slug) !== brand) continue
    const score = tokenOverlap(normName, item.name_normalized)
    if (!fuzzyOk && score < 0.9) continue
    if (score >= FUZZY_THRESHOLD && (!best || score > best.score)) {
      best = {
        item,
        cluster: clusters.find(c => c.id === item.cluster_id),
        score,
        reason: 'fuzzy_name',
      }
    }
  }
  return best
}

export function shouldMergeClusters(a: KbFoodCluster, b: KbFoodCluster): boolean {
  if (a.brand_slug !== b.brand_slug) return false
  const overlap = tokenOverlap(normalizeFoodName(a.canonical_name_zh), normalizeFoodName(b.canonical_name_zh))
  if (overlap >= 0.9) return true
  const aliasCross = a.aliases.some(x => b.aliases.includes(x))
  return aliasCross && overlap >= 0.75
}

export function mergeClusterAliases(primary: KbFoodCluster, secondary: KbFoodCluster): string[] {
  return [...new Set([...primary.aliases, ...secondary.aliases, secondary.canonical_name_zh])]
}
