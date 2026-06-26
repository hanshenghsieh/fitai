import fs from 'fs'
import path from 'path'
import allowlistJson from '../../../data/food-kb/food-source-allowlist.json'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { FOOD_DNA_TEMPLATES } from '@/lib/nutrition/food-dna-catalog'
import { loadAllOfficialReferences } from '@/lib/nutrition/official-reference/loader'
import { buildOfficialCoverageDashboard } from '@/lib/nutrition/official-reference/coverage'
import { evaluateMenuItemConfidence } from '@/lib/nutrition/menu-confidence-runtime'
import type { StagingManifest } from '@/lib/nutrition/menu-backfill/types'
import type { BrandRiskRow, CoverageMetrics, GovernedMenuRecord } from './types'
import { buildReviewQueue, partitionReviewQueue } from './review-queue'

const STAGING_MANIFEST = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'manifest.json')
const MENU_TARGET_PER_BRAND = 20

function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 1000) / 10 : 0
}

function loadStaging(): StagingManifest | null {
  if (!fs.existsSync(STAGING_MANIFEST)) return null
  return JSON.parse(fs.readFileSync(STAGING_MANIFEST, 'utf8')) as StagingManifest
}

export function ingestGovernedRecordsFromStaging(manifest: StagingManifest | null): GovernedMenuRecord[] {
  if (!manifest) return []
  const records: GovernedMenuRecord[] = []
  for (const restaurant of manifest.restaurants) {
    const stageMap: Record<string, GovernedMenuRecord['promotion_stage']> = {
      draft: 'draft',
      qa_pending: 'qa',
      production_candidate: 'production_candidate',
      promoted: 'runtime',
      rejected: 'draft',
    }
    const promotion_stage = stageMap[restaurant.status] ?? 'staging'
    for (const item of restaurant.items) {
      records.push({
        record_id: item.id,
        brand: restaurant.canonical_name,
        item_name: item.name,
        created_at: item.verification?.verified_at ?? manifest.generated_at,
        updated_at: manifest.generated_at,
        verified_at: item.verification?.verified_at ?? null,
        review_due_at: item.verification?.verified_at
          ? new Date(new Date(item.verification.verified_at).getTime() + 180 * 86400000).toISOString()
          : manifest.generated_at,
        version: '1.0.0',
        status: 'active',
        promotion_stage,
        confidence: item.verification?.confidence ?? item.nutrition_trace?.confidence ?? null,
        source_url: item.verification?.source_url ?? null,
        source_fingerprint: item.verification?.source_url
          ? `url:${item.verification.source_url}`
          : null,
      })
    }
  }
  return records
}

export function buildCoverageMetrics(records: GovernedMenuRecord[]): CoverageMetrics {
  const allowlistTotal = (allowlistJson as { count: number }).count ?? 600
  const runtimeStores = new Set(eatOutMenu.map(i => i.store))
  const restaurantWithMenu = [...runtimeStores].filter(s => s !== '自助餐組件').length

  const stagingItems = records.length
  const menuTarget = allowlistTotal * MENU_TARGET_PER_BRAND

  const onr = buildOfficialCoverageDashboard()
  const onrRefs = loadAllOfficialReferences()
  const foodDnaCount = Object.keys(FOOD_DNA_TEMPLATES).length

  const recommendable = eatOutMenu.filter(i => {
    const c = evaluateMenuItemConfidence(i)
    return c.recommendable
  }).length

  const qaPassed = records.filter(
    r => r.confidence === 'A' || r.confidence === 'B'
  ).length

  const queue = buildReviewQueue(records)
  const parts = partitionReviewQueue(queue)

  const deprecated = records.filter(r => r.status === 'deprecated').length

  return {
    restaurant_coverage_pct: pct(restaurantWithMenu, allowlistTotal),
    restaurant_with_menu: restaurantWithMenu,
    restaurant_allowlist_total: allowlistTotal,
    menu_coverage_pct: pct(stagingItems, menuTarget),
    menu_items_total: stagingItems,
    menu_items_target: menuTarget,
    onr_coverage_pct: onr.overall_coverage_pct,
    onr_brands: onr.brands_total,
    onr_items: onr.menu_items_total,
    food_dna_coverage_pct: pct(foodDnaCount, 100),
    food_dna_templates: foodDnaCount,
    recommendation_coverage_pct: pct(recommendable, eatOutMenu.length),
    recommendable_items: recommendable,
    qa_coverage_pct: stagingItems ? pct(qaPassed, stagingItems) : 0,
    qa_passed_items: qaPassed,
    pending_review_count: parts.pending_review.length,
    need_review_count: parts.need_review.length,
    deprecated_count: deprecated,
  }
}

export function computeHealthScore(coverage: CoverageMetrics): number {
  let score = 0
  score += Math.min(15, (coverage.restaurant_coverage_pct / 100) * 15)
  score += Math.min(10, (coverage.menu_coverage_pct / 100) * 10)
  score += Math.min(10, (coverage.onr_coverage_pct / 100) * 10)
  score += Math.min(5, (coverage.food_dna_coverage_pct / 100) * 5)
  score += Math.min(10, (coverage.recommendation_coverage_pct / 100) * 10)
  score += Math.min(10, (coverage.qa_coverage_pct / 100) * 10)

  const reviewPenalty = Math.min(
    25,
    coverage.pending_review_count * 2 + coverage.need_review_count * 1
  )
  score += Math.max(0, 25 - reviewPenalty)

  const deprecatedPenalty = Math.min(10, coverage.deprecated_count)
  score += Math.max(0, 10 - deprecatedPenalty)

  const pipelineBonus = coverage.qa_passed_items > 0 ? 5 : 0
  score += pipelineBonus

  return Math.round(Math.min(100, Math.max(0, score)))
}

export function healthGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

export function buildTopRiskBrands(records: GovernedMenuRecord[]): BrandRiskRow[] {
  const onrBrands = new Set(loadAllOfficialReferences().map(r => r.metadata.canonical_name))
  const byBrand = new Map<string, GovernedMenuRecord[]>()
  for (const r of records) {
    if (!byBrand.has(r.brand)) byBrand.set(r.brand, [])
    byBrand.get(r.brand)!.push(r)
  }

  const queue = partitionReviewQueue(buildReviewQueue(records))
  const pendingByBrand = new Map<string, number>()
  const needByBrand = new Map<string, number>()
  for (const q of queue.pending_review) {
    pendingByBrand.set(q.brand, (pendingByBrand.get(q.brand) ?? 0) + 1)
  }
  for (const q of queue.need_review) {
    needByBrand.set(q.brand, (needByBrand.get(q.brand) ?? 0) + 1)
  }

  const rows: BrandRiskRow[] = []
  for (const [brand, items] of byBrand) {
    const deprecated = items.filter(i => i.status === 'deprecated').length
    const pending = pendingByBrand.get(brand) ?? 0
    const need = needByBrand.get(brand) ?? 0
    const onr_missing = !onrBrands.has(brand)
    const reasons: string[] = []
    if (onr_missing) reasons.push('missing_onr')
    if (pending > 0) reasons.push('pending_review')
    if (need > 0) reasons.push('need_review')
    if (deprecated > 0) reasons.push('deprecated_items')
    const risk_score = pending * 3 + need * 2 + deprecated * 2 + (onr_missing ? 5 : 0)
    rows.push({ brand, risk_score, pending_review: pending, need_review: need, deprecated, onr_missing, reasons })
  }

  return rows.sort((a, b) => b.risk_score - a.risk_score).slice(0, 15)
}
