import type {
  FoodIntelligenceCatalog,
  FoodIntelligenceItemInput,
  FoodIntelligenceManifest,
  FoodIntelligenceProfile,
  FoodIntelligenceReport,
} from './types'
import { computeMealContext } from './meal-context'
import { inferDietTags, inferFoodCategory, inferProcessingLevel } from './tags'
import { computePopularityScore, computeSatietyScore, isHighRisk } from './score'
import {
  buildCatalog,
  buildMealGraphEdges,
  buildRecommendedAddons,
  buildRecommendedReplacements,
  inferRecommendationRules,
} from './relationship'

const LAYER_VERSION = '1.0.0'

export function buildFoodIntelligenceProfile(
  input: FoodIntelligenceItemInput,
  catalog: FoodIntelligenceCatalog,
  asOf = new Date().toISOString()
): FoodIntelligenceProfile {
  const category = inferFoodCategory(input)
  const processing = inferProcessingLevel(input, category)
  const diet_tags = inferDietTags(input, category, processing)
  const meal_context = computeMealContext(input, category)
  const popularity_score = computePopularityScore(input)
  const satiety_score = computeSatietyScore(input)
  const recommendation_rules = inferRecommendationRules(input, diet_tags, category)
  const recommended_addons = buildRecommendedAddons(input, catalog, category)
  const recommended_replacements = buildRecommendedReplacements(input, catalog)
  const meal_graph_edges = buildMealGraphEdges(
    input,
    catalog,
    recommended_addons,
    recommended_replacements,
    category
  )

  const explain: string[] = [
    `food_category=${category}`,
    `processing=${processing}`,
    `popularity=${popularity_score}（rule-based，非滿分預設）`,
    `satiety=${satiety_score}`,
    `tags=${diet_tags.join(',') || 'none'}`,
    `meal_context peak=${Math.max(...Object.values(meal_context))}`,
  ]
  if (recommended_addons.length) {
    explain.push(`addons=${recommended_addons.map(a => a.name).join('、')}（獨立品項，非套餐）`)
  }
  if (recommended_replacements.length) {
    explain.push(`replacements=${recommended_replacements.map(r => r.name).join('、')}`)
  }
  if (isHighRisk(input, satiety_score)) explain.push('high_risk=true')

  return {
    item_id: input.id,
    version: LAYER_VERSION,
    generated_at: asOf,
    popularity_score,
    meal_context,
    diet_tags,
    food_category: category,
    satiety_score,
    processing_level: processing,
    recommended_addons,
    recommended_replacements,
    recommendation_rules,
    meal_graph_edges,
    explain,
  }
}

export function runFoodIntelligenceLayer(
  items: FoodIntelligenceItemInput[],
  opts?: { source_manifest?: string; asOf?: string }
): { manifest: FoodIntelligenceManifest; report: FoodIntelligenceReport } {
  const asOf = opts?.asOf ?? new Date().toISOString()
  const catalog = buildCatalog(items)
  const profiles: Record<string, FoodIntelligenceProfile> = {}

  for (const item of items) {
    profiles[item.id] = buildFoodIntelligenceProfile(item, catalog, asOf)
  }

  const profileList = Object.values(profiles)
  let high_risk = 0
  let edges = 0
  let addons = 0
  let replacements = 0
  let blockedEdges = 0
  const by_category: FoodIntelligenceReport['by_category'] = {
    主餐: 0,
    副餐: 0,
    飲料: 0,
    甜點: 0,
    配菜: 0,
    早餐: 0,
    火鍋料: 0,
    便利商店商品: 0,
    手搖飲: 0,
  }
  const by_processing: FoodIntelligenceReport['by_processing'] = {
    whole_food: 0,
    lightly_processed: 0,
    processed: 0,
    ultra_processed: 0,
  }

  for (const p of profileList) {
    by_category[p.food_category]++
    by_processing[p.processing_level]++
    addons += p.recommended_addons.length
    replacements += p.recommended_replacements.length
    edges += p.meal_graph_edges.length
    blockedEdges += p.meal_graph_edges.filter(e => !e.runtime_safe).length
    const item = catalog.byId.get(p.item_id)
    if (item && isHighRisk(item, p.satiety_score)) high_risk++
  }

  const report: FoodIntelligenceReport = {
    generated_at: asOf,
    items_processed: profileList.length,
    coverage_pct: items.length ? Math.round((profileList.length / items.length) * 1000) / 10 : 0,
    high_risk_count: high_risk,
    meal_graph_edges: edges,
    recommended_addons: addons,
    recommended_replacements: replacements,
    by_category,
    by_processing,
    runtime_blocked_edges: blockedEdges,
  }

  const manifest: FoodIntelligenceManifest = {
    version: LAYER_VERSION,
    generated_at: asOf,
    policy: 'staging_intelligence_only',
    source_manifest: opts?.source_manifest ?? 'data/food-kb/staging/manifest.json',
    item_count: profileList.length,
    profiles,
  }

  return { manifest, report }
}

export function formatIntelligenceReportMd(report: FoodIntelligenceReport): string {
  return [
    '# Food Intelligence Layer Report',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '| Metric | Value |',
    '|--------|------:|',
    `| Items processed | ${report.items_processed} |`,
    `| Coverage | ${report.coverage_pct}% |`,
    `| High risk flags | ${report.high_risk_count} |`,
    `| meal_graph_edges | ${report.meal_graph_edges} |`,
    `| runtime_blocked_edges | ${report.runtime_blocked_edges} |`,
    `| recommended_addons | ${report.recommended_addons} |`,
    `| recommended_replacements | ${report.recommended_replacements} |`,
    '',
    '## By category',
    '',
    ...Object.entries(report.by_category).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## By processing',
    '',
    ...Object.entries(report.by_processing).map(([k, v]) => `- ${k}: ${v}`),
  ].join('\n')
}
