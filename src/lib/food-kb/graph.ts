import type {
  CoverageGap,
  CoverageReport,
  FoodKnowledgeGraph,
  KbBrand,
  KbFoodCluster,
  KbFoodItem,
  KbGraphStats,
  KbObservation,
  KbSourceRecord,
  RawFoodObservation,
} from './types'
import { allTargetBrandNames } from './brand-registry'
import { crossValidateNutrition, scoreObservation, SOURCE_TRUST } from './confidence'
import { findBestMatch } from './dedupe'
import {
  clusterKey,
  contentHash,
  expandAliases,
  inferBrandType,
  normalizeBrandName,
  normalizeFoodName,
  slugify,
} from './normalize'

const TARGET_BRANDS = allTargetBrandNames()

let idCounter = 0
export function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`
}

export function emptyGraph(): FoodKnowledgeGraph {
  return {
    version: 1,
    updated_at: new Date().toISOString(),
    brands: [],
    clusters: [],
    items: [],
    sources: [],
    observations: [],
    stats: computeStats([], [], [], []),
  }
}

function ensureBrand(graph: FoodKnowledgeGraph, storeName: string): KbBrand {
  const slug = slugify(normalizeBrandName(storeName))
  let brand = graph.brands.find(b => b.slug === slug)
  if (!brand) {
    brand = {
      id: nextId('brand'),
      slug,
      name_zh: normalizeBrandName(storeName),
      brand_type: inferBrandType(storeName),
    }
    graph.brands.push(brand)
  }
  return brand
}

function ensureSource(graph: FoodKnowledgeGraph, obs: RawFoodObservation): KbSourceRecord {
  const key = `${obs.source_type}::${obs.source_name}`
  let source = graph.sources.find(s => `${s.source_type}::${s.source_name}` === key)
  if (!source) {
    source = {
      id: nextId('src'),
      source_type: obs.source_type,
      source_name: obs.source_name,
      source_url: obs.source_url,
      trust_weight: SOURCE_TRUST[obs.source_type] ?? 0.4,
    }
    graph.sources.push(source)
  }
  return source
}

export function ingestObservation(
  graph: FoodKnowledgeGraph,
  obs: RawFoodObservation
): { item: KbFoodItem; isNew: boolean } {
  const brand = ensureBrand(graph, obs.brand ?? obs.store ?? 'unknown')
  const source = ensureSource(graph, obs)
  const hash = contentHash(obs)

  if (graph.observations.some(o => o.content_hash === hash && o.source_id === source.id)) {
    const existing = graph.items.find(i =>
      i.source_observation_ids.some(oid => {
        const o = graph.observations.find(x => x.id === oid)
        return o?.content_hash === hash
      })
    )
    if (existing) return { item: existing, isNew: false }
  }

  const match = findBestMatch(obs, graph.items, graph.clusters)
  const now = new Date().toISOString()
  const obsWeight = scoreObservation(obs)

  const observation: KbObservation = {
    id: nextId('obs'),
    source_id: source.id,
    raw_name: obs.name,
    raw_store: obs.store,
    nutrition: obs.nutrition,
    content_hash: hash,
    observed_at: obs.observed_at ?? now,
  }

  let item: KbFoodItem
  let cluster: KbFoodCluster
  const isNew = !match?.item

  if (match?.item) {
    item = match.item
    item.last_seen_at = now
    item.source_observation_ids.push(observation.id)
    if (obs.legacy_id && !item.legacy_id) item.legacy_id = obs.legacy_id
    if (obs.image_urls?.length) {
      item.image_urls = [...new Set([...item.image_urls, ...obs.image_urls])]
    }
    observation.item_id = item.id
    cluster = graph.clusters.find(c => c.id === item.cluster_id)!
  } else {
    const cKey = clusterKey(brand.name_zh, obs.name)
    let existingCluster = graph.clusters.find(c => c.cluster_key === cKey)
    if (!existingCluster) {
      existingCluster = {
        id: nextId('cluster'),
        cluster_key: cKey,
        canonical_name_zh: obs.name,
        brand_slug: brand.slug,
        category: obs.category,
        aliases: expandAliases(obs.name, obs.aliases),
        nutrition: {},
        confidence: obsWeight,
        source_count: 1,
        item_ids: [],
        updated_at: now,
      }
      graph.clusters.push(existingCluster)
    }
    cluster = existingCluster
    observation.cluster_id = cluster.id

    item = {
      id: nextId('item'),
      legacy_id: obs.legacy_id,
      cluster_id: cluster.id,
      brand_slug: brand.slug,
      store_name: obs.store ?? brand.name_zh,
      name_zh: obs.name,
      name_normalized: normalizeFoodName(obs.name),
      category: obs.category,
      role: obs.role,
      price_twd: obs.price_twd,
      image_urls: obs.image_urls ?? [],
      ingredients: obs.ingredients,
      tags: obs.tags ?? [],
      portionable: false,
      nutrition: { ...obs.nutrition },
      confidence: obsWeight,
      source_observation_ids: [observation.id],
      first_seen_at: now,
      last_seen_at: now,
      is_available: true,
    }
    graph.items.push(item)
    cluster.item_ids.push(item.id)
    observation.item_id = item.id
  }

  graph.observations.push(observation)

  const relatedObs = graph.observations
    .filter(o => o.item_id === item.id || o.cluster_id === cluster.id)
    .map(o => {
      const src = graph.sources.find(s => s.id === o.source_id)!
      return { nutrition: o.nutrition, weight: src.trust_weight }
    })

  const validated = crossValidateNutrition(relatedObs)
  item.nutrition = validated.nutrition
  item.confidence = validated.confidence
  cluster.nutrition = validated.nutrition
  cluster.confidence = validated.confidence
  cluster.source_count = relatedObs.length
  cluster.updated_at = now
  cluster.aliases = [...new Set([...cluster.aliases, ...expandAliases(obs.name, obs.aliases)])]

  graph.updated_at = now
  graph.stats = computeStats(graph.brands, graph.clusters, graph.items, graph.observations)

  return { item, isNew }
}

export function ingestBatch(
  graph: FoodKnowledgeGraph,
  observations: RawFoodObservation[]
): { newCount: number; updatedCount: number } {
  let newCount = 0
  let updatedCount = 0
  for (const obs of observations) {
    const { isNew } = ingestObservation(graph, obs)
    if (isNew) newCount++
    else updatedCount++
  }
  return { newCount, updatedCount }
}

export function computeStats(
  brands: KbBrand[],
  clusters: KbFoodCluster[],
  items: KbFoodItem[],
  observations: KbObservation[]
): KbGraphStats {
  const by_source_type: Record<string, number> = {}
  const by_brand_type: Record<string, number> = {}
  for (const b of brands) {
    by_brand_type[b.brand_type] = (by_brand_type[b.brand_type] ?? 0) + 1
  }
  let confSum = 0
  let lowConf = 0
  let missingNut = 0
  for (const item of items) {
    confSum += item.confidence
    if (item.confidence < 0.5) lowConf++
    if (!item.nutrition.calories) missingNut++
  }
  return {
    total_items: items.length,
    total_clusters: clusters.length,
    total_brands: brands.length,
    total_observations: observations.length,
    by_source_type,
    by_brand_type,
    avg_confidence: items.length ? Math.round((confSum / items.length) * 1000) / 1000 : 0,
    low_confidence_count: lowConf,
    missing_nutrition_count: missingNut,
  }
}

export function searchGraph(
  graph: FoodKnowledgeGraph,
  query: string,
  limit = 12
): KbFoodItem[] {
  const q = normalizeFoodName(query)
  if (!q) return []
  const scored = graph.items.map(item => {
    let score = 0
    if (item.name_normalized.includes(q)) score += 10
    if (item.name_zh.includes(query)) score += 8
    if (item.store_name.includes(query)) score += 5
    const cluster = graph.clusters.find(c => c.id === item.cluster_id)
    if (cluster?.aliases.some(a => a.includes(query) || normalizeFoodName(a).includes(q))) score += 6
    score += item.confidence * 2
    return { item, score }
  })
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.item)
}

export function buildCoverageReport(graph: FoodKnowledgeGraph): CoverageReport {
  const gaps: CoverageGap[] = []
  const presentBrands = new Set(graph.brands.map(b => b.name_zh))

  for (const target of TARGET_BRANDS) {
    if (!presentBrands.has(target) && !graph.brands.some(b => b.name_zh.includes(target))) {
      gaps.push({
        gap_type: 'missing_brand',
        brand_slug: slugify(target),
        description: `尚未收錄品牌：${target}`,
        priority: 9,
      })
    }
  }

  for (const item of graph.items) {
    if (!item.nutrition.calories) {
      gaps.push({
        gap_type: 'missing_nutrition',
        brand_slug: item.brand_slug,
        description: `缺少熱量：${item.store_name} ${item.name_zh}`,
        priority: 7,
      })
    } else if (item.confidence < 0.5) {
      gaps.push({
        gap_type: 'low_confidence',
        brand_slug: item.brand_slug,
        description: `信心偏低 (${item.confidence})：${item.store_name} ${item.name_zh}`,
        priority: 6,
      })
    }
  }

  const thirtyDaysAgo = Date.now() - 30 * 86400000
  const stale = graph.items
    .filter(i => new Date(i.last_seen_at).getTime() < thirtyDaysAgo)
    .slice(0, 50)
    .map(i => ({ id: i.id, name: `${i.store_name} ${i.name_zh}`, last_seen_at: i.last_seen_at }))

  const brandCounts = new Map<string, { name_zh: string; count: number }>()
  for (const item of graph.items) {
    const b = graph.brands.find(x => x.slug === item.brand_slug)
    const cur = brandCounts.get(item.brand_slug) ?? { name_zh: b?.name_zh ?? item.brand_slug, count: 0 }
    cur.count++
    brandCounts.set(item.brand_slug, cur)
  }

  return {
    generated_at: new Date().toISOString(),
    stats: graph.stats,
    gaps: gaps.sort((a, b) => b.priority - a.priority).slice(0, 200),
    top_brands_by_items: [...brandCounts.entries()]
      .map(([slug, v]) => ({ slug, name_zh: v.name_zh, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30),
    missing_brands: TARGET_BRANDS.filter(t => !presentBrands.has(t)),
    stale_items: stale,
  }
}

export function itemToRuntimeMenu(item: KbFoodItem, cluster?: KbFoodCluster) {
  return {
    id: item.legacy_id ?? item.id,
    name: item.name_zh,
    store: item.store_name,
    source: inferSourceFromBrand(item.brand_slug),
    category: (item.category ?? 'lunch') as 'breakfast' | 'lunch' | 'dinner',
    role: (item.role ?? 'combo') as string,
    portionable: item.portionable,
    tags: item.tags,
    calories: Math.round(item.nutrition.calories ?? 0),
    protein_g: Math.round(item.nutrition.protein_g ?? 0),
    carbs_g: Math.round(item.nutrition.carbs_g ?? 0),
    fat_g: Math.round(item.nutrition.fat_g ?? 0),
    price: item.price_twd ?? 0,
    photo_url: item.image_urls[0] ?? '',
    description: `${item.name_zh} · ${item.confidence} confidence · ${cluster?.source_count ?? 1} sources`,
  }
}

function inferSourceFromBrand(slug: string): 'convenience' | 'chain' | 'delivery' {
  if (['7-11', '全家', '萊爾富', 'ok超商'].some(s => slug.includes(s))) return 'convenience'
  if (slug.includes('uber') || slug.includes('foodpanda')) return 'delivery'
  return 'chain'
}
