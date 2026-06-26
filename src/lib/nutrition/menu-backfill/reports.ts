import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { auditRestaurantMenuData, type AllowlistFile } from '../restaurant-menu-audit'
import { buildRestaurantMenuRegistry } from '../restaurant-menu-registry'
import { evaluateMenuItemConfidence } from '../menu-confidence-runtime'
import { auditMenuItem } from '../recommendation-qa/item-qa'
import { buildAllowlistMetaMap } from '../menu-confidence-runtime'
import allowlistJson from '../../../../data/food-kb/food-source-allowlist.json'
import { traceCoverageStats } from '../nutrition-source-trace'
import {
  detectNutritionConflicts,
  isHallucinatedComboName,
  itemHasTraceableSource,
  itemVerificationOk,
  restaurantVerificationOk,
} from './verification'
import { findDuplicateGroups } from './duplicate'
import type { MenuBackfillAcceptanceReport, StagingManifest, VerifiedMenuItem } from './types'

const MIN_ITEMS_PER_RESTAURANT = 20

function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 1000) / 10 : 0
}

function hasField(item: ConvenienceItem, field: 'fiber_g' | 'sugar_g' | 'sodium_mg'): boolean {
  const v = (item as Record<string, unknown>)[field]
  return typeof v === 'number' && !Number.isNaN(v)
}

export function loadStagingManifest(manifest: StagingManifest | null): StagingManifest {
  return manifest ?? { version: '1.0.0', generated_at: new Date().toISOString(), policy: 'zero_hallucination', restaurants: [] }
}

export function runRestaurantBackfillQa(
  restaurant: StagingManifest['restaurants'][number]
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = []

  const rv = restaurantVerificationOk(restaurant)
  if (!rv.ok) reasons.push(...rv.reasons)

  if (restaurant.items.length < MIN_ITEMS_PER_RESTAURANT) {
    reasons.push(`${restaurant.canonical_name}：需至少 ${MIN_ITEMS_PER_RESTAURANT} 道真實熱門菜（目前 ${restaurant.items.length}）`)
  }

  for (const item of restaurant.items) {
    const iv = itemVerificationOk(item)
    if (!iv.ok) reasons.push(...iv.reasons)
    if (isHallucinatedComboName(item.name)) {
      reasons.push(`${item.name}：疑似 AI 拼接套餐名稱`)
    }
    const conflicts = detectNutritionConflicts(item.verification?.sources ?? [])
    if (conflicts.some(c => c.threshold_exceeded) && item.verification?.conflict_status !== 'resolved') {
      reasons.push(`${item.name}：營養來源衝突待人工驗證`)
    }
  }

  const registry = buildRestaurantMenuRegistry([...eatOutMenu, ...restaurant.items])
  const allowlistMeta = buildAllowlistMetaMap(allowlistJson as AllowlistFile)
  for (const item of restaurant.items) {
    const audit = auditMenuItem(item, registry, allowlistMeta)
    if (audit.confidence === 'D') {
      reasons.push(`${item.name}：confidence D — ${audit.issues.join('；')}`)
    }
  }

  return { passed: reasons.length === 0, reasons }
}

export function generateAcceptanceReport(
  staging: StagingManifest | null = null
): MenuBackfillAcceptanceReport {
  const manifest = loadStagingManifest(staging)
  const allowlist = allowlistJson as AllowlistFile
  const runtimeAudit = auditRestaurantMenuData(eatOutMenu, allowlist)
  const mergedItems = [...eatOutMenu, ...manifest.restaurants.flatMap(r => r.items)]
  const registry = buildRestaurantMenuRegistry(mergedItems, allowlist)
  const allowlistMeta = buildAllowlistMetaMap(allowlist)

  const confidence_distribution = { A: 0, B: 0, C: 0, D: 0 }
  for (const item of eatOutMenu) {
    const g = evaluateMenuItemConfidence(item, registry, allowlistMeta)
    confidence_distribution[g]++
  }

  const stagingProductionCandidates = manifest.restaurants.filter(r => {
    const qa = runRestaurantBackfillQa(r)
    return qa.passed
  })

  const stagingItemCount = manifest.restaurants.reduce((n, r) => n + r.items.length, 0)
  const runtimeRecommendable = eatOutMenu.filter(i => {
    const g = evaluateMenuItemConfidence(i, registry, allowlistMeta)
    return g === 'A' || g === 'B'
  }).length

  const conflict_report: MenuBackfillAcceptanceReport['conflict_report'] = []
  for (const r of manifest.restaurants) {
    for (const item of r.items) {
      const conflicts = detectNutritionConflicts(item.verification?.sources ?? [])
      if (conflicts.length) {
        conflict_report.push({ item_id: item.id, store: item.store, name: item.name, conflicts })
      }
    }
  }

  const missing_menus = runtimeAudit.restaurantsWithoutMenu.map(name => ({
    restaurant: name,
    needed: MIN_ITEMS_PER_RESTAURANT,
    have: 0,
  }))

  for (const r of manifest.restaurants) {
    const idx = missing_menus.findIndex(m => m.restaurant === r.canonical_name)
    if (idx >= 0) {
      missing_menus[idx] = {
        restaurant: r.canonical_name,
        needed: MIN_ITEMS_PER_RESTAURANT,
        have: r.items.length,
      }
    }
  }

  const restaurantsWith2Sources = manifest.restaurants.filter(r => restaurantVerificationOk(r).ok).length
  const traceableItems = manifest.restaurants
    .flatMap(r => r.items)
    .filter(itemHasTraceableSource).length

  const runtimeReadyRestaurants = new Set(
    eatOutMenu
      .filter(i => {
        const g = evaluateMenuItemConfidence(i, registry, allowlistMeta)
        return g === 'A' || g === 'B'
      })
      .map(i => i.store)
  )

  return {
    generated_at: new Date().toISOString(),
    restaurant_coverage: {
      allowlist_total: 600,
      with_runtime_menu: runtimeAudit.restaurantTotal - runtimeAudit.restaurantsWithoutMenuCount,
      with_staging_menu: manifest.restaurants.length,
      missing: runtimeAudit.restaurantsWithoutMenuCount,
      coverage_pct: pct(
        runtimeAudit.restaurantTotal - runtimeAudit.restaurantsWithoutMenuCount + manifest.restaurants.length,
        600
      ),
    },
    menu_coverage: {
      runtime_items: eatOutMenu.length,
      staging_items: stagingItemCount,
      runtime_recommendable: runtimeRecommendable,
      staging_production_candidates: stagingProductionCandidates.reduce((n, r) => n + r.items.length, 0),
    },
    nutrition_coverage: {
      calories_pct: 100,
      protein_pct: 100,
      fat_pct: 100,
      carbs_pct: 100,
      fiber_pct: pct(eatOutMenu.filter(i => hasField(i, 'fiber_g')).length, eatOutMenu.length),
      sugar_pct: pct(eatOutMenu.filter(i => hasField(i, 'sugar_g')).length, eatOutMenu.length),
      sodium_pct: pct(eatOutMenu.filter(i => hasField(i, 'sodium_mg')).length, eatOutMenu.length),
    },
    verification_coverage: {
      restaurants_with_2plus_sources: restaurantsWith2Sources,
      items_with_traceable_source: traceableItems,
      items_pending_conflict_review: conflict_report.filter(c =>
        c.conflicts.some(x => x.threshold_exceeded)
      ).length,
    },
    duplicate_report: findDuplicateGroups(eatOutMenu).slice(0, 50),
    conflict_report: conflict_report.slice(0, 100),
    confidence_distribution,
    missing_restaurants: runtimeAudit.restaurantsWithoutMenu.slice(0, 450),
    missing_menus: missing_menus
      .filter(m => m.have < MIN_ITEMS_PER_RESTAURANT)
      .slice(0, 100),
    runtime_ready: {
      restaurants_ready: runtimeReadyRestaurants.size,
      items_ready: runtimeRecommendable,
      blocked_d_count: confidence_distribution.D,
      search_only_c_count: confidence_distribution.C,
    },
  }
}

export function formatAcceptanceMarkdown(report: MenuBackfillAcceptanceReport): string {
  const lines: string[] = [
    '# Menu Backfill Acceptance Report',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '> Zero Hallucination Policy — staging data only. Runtime D blocked; C search-only.',
    '',
    '## 1. Restaurant Coverage',
    '',
    `- Allowlist total: **${report.restaurant_coverage.allowlist_total}**`,
    `- Runtime with menu: **${report.restaurant_coverage.with_runtime_menu}**`,
    `- Staging restaurants: **${report.restaurant_coverage.with_staging_menu}**`,
    `- Still missing: **${report.restaurant_coverage.missing}**`,
    '',
    '## 2. Menu Coverage',
    '',
    `- Runtime items: **${report.menu_coverage.runtime_items}**`,
    `- Staging items: **${report.menu_coverage.staging_items}**`,
    `- Runtime recommendable (A/B): **${report.menu_coverage.runtime_recommendable}**`,
    `- Staging production candidates: **${report.menu_coverage.staging_production_candidates}**`,
    '',
    '## 3. Nutrition Coverage',
    '',
    `| Field | Coverage |`,
    `|-------|----------|`,
    `| Calories | ${report.nutrition_coverage.calories_pct}% |`,
    `| Protein | ${report.nutrition_coverage.protein_pct}% |`,
    `| Fat | ${report.nutrition_coverage.fat_pct}% |`,
    `| Carbs | ${report.nutrition_coverage.carbs_pct}% |`,
    `| Fiber | ${report.nutrition_coverage.fiber_pct}% |`,
    `| Sugar | ${report.nutrition_coverage.sugar_pct}% |`,
    `| Sodium | ${report.nutrition_coverage.sodium_pct}% |`,
    '',
    '## 4. Verification Coverage',
    '',
    `- Restaurants with 2+ sources: **${report.verification_coverage.restaurants_with_2plus_sources}**`,
    `- Items with traceable source: **${report.verification_coverage.items_with_traceable_source}**`,
    `- Pending conflict review: **${report.verification_coverage.items_pending_conflict_review}**`,
    '',
    '## 5. Duplicate Report (top)',
    '',
  ]

  for (const g of report.duplicate_report.slice(0, 15)) {
    lines.push(`- **${g.store}** / ${g.canonical_name}: ${g.variants.map(v => v.name).join(' · ')}`)
  }

  lines.push('', '## 6. Conflict Report (top)', '')
  if (!report.conflict_report.length) {
    lines.push('_No staging conflicts recorded._')
  } else {
    for (const c of report.conflict_report.slice(0, 10)) {
      lines.push(`- ${c.store} · ${c.name}: ${c.conflicts.map(x => x.message).join('; ')}`)
    }
  }

  lines.push(
    '',
    '## 7. Confidence Distribution (runtime core)',
    '',
    `| Grade | Count | Policy |`,
    `|-------|------:|--------|`,
    `| A | ${report.confidence_distribution.A} | Recommend |`,
    `| B | ${report.confidence_distribution.B} | Recommend |`,
    `| C | ${report.confidence_distribution.C} | Search only |`,
    `| D | ${report.confidence_distribution.D} | Blocked |`,
    '',
    '## 8. Missing Restaurant Report',
    '',
    `Total missing: **${report.missing_restaurants.length}**`,
    '',
    report.missing_restaurants.slice(0, 25).map(n => `- ${n}`).join('\n'),
    '',
    '## 9. Missing Menu Report',
    '',
  )

  for (const m of report.missing_menus.slice(0, 15)) {
    lines.push(`- ${m.restaurant}: ${m.have}/${m.needed} items`)
  }

  lines.push(
    '',
    '## 10. Runtime Ready Report',
    '',
    `- Restaurants ready (A/B items): **${report.runtime_ready.restaurants_ready}**`,
    `- Items ready for recommendation: **${report.runtime_ready.items_ready}**`,
    `- D blocked from runtime: **${report.runtime_ready.blocked_d_count}**`,
    `- C search-only: **${report.runtime_ready.search_only_c_count}**`,
    '',
    '---',
    '',
    '**Status: D-grade blocked at runtime. Staging backfill in progress — no production writes until per-restaurant QA passes.**'
  )

  return lines.join('\n')
}

export function listMissingRestaurants(): string[] {
  const allowlist = allowlistJson as AllowlistFile
  const audit = auditRestaurantMenuData(eatOutMenu, allowlist)
  return audit.restaurantsWithoutMenu
}

export function createStagingItemTemplate(
  partial: Pick<VerifiedMenuItem, 'id' | 'name' | 'store'> & Partial<VerifiedMenuItem>
): VerifiedMenuItem {
  return {
    category: 'lunch',
    source: 'chain',
    role: 'combo',
    portionable: false,
    tags: [],
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    price: 0,
    photo_url: '',
    description: '',
    ...partial,
    verification: partial.verification ?? {
      sources: [],
      source: '',
      source_url: '',
      verified_at: '',
      verified_by: '',
      verification_count: 0,
      confidence: 'D',
      conflict_status: 'none',
    },
    nutrition_trace: partial.nutrition_trace,
  }
}
