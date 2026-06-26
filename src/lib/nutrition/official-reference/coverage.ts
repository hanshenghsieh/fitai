import fs from 'fs'
import path from 'path'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import type { VerifiedMenuItem } from '../menu-backfill/types'
import { compareNutritionToOfficial, officialItemToSnapshot, toMacroSnapshot } from './diff'
import { findOfficialMenuItem, loadAllOfficialReferences } from './loader'
import type { BrandCoverageRow, OfficialCoverageDashboard } from './types'

const STAGING_MANIFEST = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'manifest.json')

function hasFullCoreNutrition(item: { calories: number; protein: number; fat: number; carbs: number }): boolean {
  return (
    Number.isFinite(item.calories) &&
    Number.isFinite(item.protein) &&
    Number.isFinite(item.fat) &&
    Number.isFinite(item.carbs)
  )
}

function hasExtendedNutrition(item: {
  fiber?: number | null
  sugar?: number | null
  sodium?: number | null
}): boolean {
  return item.fiber != null || item.sugar != null || item.sodium != null
}

function loadStagingItems(): VerifiedMenuItem[] {
  if (!fs.existsSync(STAGING_MANIFEST)) return []
  const manifest = JSON.parse(fs.readFileSync(STAGING_MANIFEST, 'utf8')) as {
    restaurants: Array<{ items: VerifiedMenuItem[] }>
  }
  return manifest.restaurants.flatMap(r => r.items)
}

function runtimeItemsForBrand(canonical: string, aliases: string[]): Array<{
  name: string
  store: string
  macros: ReturnType<typeof toMacroSnapshot>
  source: string
}> {
  const stores = new Set([canonical, ...aliases])
  return eatOutMenu
    .filter(i => stores.has(i.store))
    .filter(i => typeof i.calories === 'number')
    .map(i => ({
      name: i.name,
      store: i.store,
      macros: toMacroSnapshot(i),
      source: i.source ?? 'runtime',
    }))
}

export function buildBrandCoverageRow(input: {
  brand_id: string
  canonical_name: string
  store_aliases: string[]
  menu_count: number
  menu_target?: number
  nutrition_source_url: string
  staging_items: VerifiedMenuItem[]
  pending_review_names: Set<string>
}): BrandCoverageRow {
  const menu_target = input.menu_target ?? 20
  const brandStaging = input.staging_items.filter(i => i.store === input.canonical_name)
  const recommendable = brandStaging.filter(
    i => i.verification?.confidence === 'A' || i.verification?.confidence === 'B'
  )
  const pendingManual = brandStaging.filter(
    i =>
      i.verification?.conflict_status === 'pending_review' ||
      input.pending_review_names.has(i.name)
  )
  const promoteReady = recommendable.filter(
    i => !pendingManual.some(p => p.name === i.name)
  )

  const nutritionComplete = input.menu_count > 0 ? 100 : 0

  return {
    brand_id: input.brand_id,
    canonical_name: input.canonical_name,
    source_complete: Boolean(input.nutrition_source_url?.trim()),
    menu_count: input.menu_count,
    menu_target,
    official_menu_coverage_pct: Math.min(100, Math.round((input.menu_count / menu_target) * 100)),
    official_nutrition_coverage_pct: nutritionComplete,
    recommendable_count: recommendable.length,
    recommendable_pct:
      input.menu_count > 0 ? Math.round((recommendable.length / input.menu_count) * 100) : 0,
    pending_manual_count: pendingManual.length,
    pending_manual_pct:
      input.menu_count > 0 ? Math.round((pendingManual.length / input.menu_count) * 100) : 0,
    promote_ready_count: promoteReady.length,
  }
}

export function buildOfficialCoverageDashboard(): OfficialCoverageDashboard {
  const refs = loadAllOfficialReferences()
  const stagingItems = loadStagingItems()
  const pendingReviewNames = new Set<string>()

  for (const ref of refs) {
    const runtime = runtimeItemsForBrand(ref.metadata.canonical_name, ref.metadata.store_aliases)
    for (const item of ref.menu) {
      const official = officialItemToSnapshot(item)
      const match = runtime.find(r => r.name === item.name)
      if (match) {
        const diff = compareNutritionToOfficial(official, match.macros, {
          item_name: item.name,
          brand: ref.metadata.canonical_name,
          compare_source: 'runtime',
        })
        if (diff.pending_review) pendingReviewNames.add(`${ref.metadata.canonical_name}::${item.name}`)
      }
      const foodDna = runtime.find(
        r => r.source === 'food_dna' || /food.dna/i.test(r.source)
      )
      if (foodDna && foodDna.name === item.name) {
        const diff = compareNutritionToOfficial(official, foodDna.macros, {
          item_name: item.name,
          brand: ref.metadata.canonical_name,
          compare_source: 'food_dna',
        })
        if (diff.pending_review) pendingReviewNames.add(`${ref.metadata.canonical_name}::${item.name}`)
      }
    }
  }

  const brands: BrandCoverageRow[] = refs.map(ref =>
    buildBrandCoverageRow({
      brand_id: ref.metadata.brand_id,
      canonical_name: ref.metadata.canonical_name,
      store_aliases: ref.metadata.store_aliases,
      menu_count: ref.menu.length,
      nutrition_source_url: ref.metadata.nutrition_source_url,
      staging_items: stagingItems,
      pending_review_names: new Set(
        [...pendingReviewNames]
          .filter(k => k.startsWith(`${ref.metadata.canonical_name}::`))
          .map(k => k.split('::')[1]!)
      ),
    })
  )

  const menu_items_total = refs.reduce((n, r) => n + r.menu.length, 0)
  const nutrition_complete_total = refs.reduce(
    (n, r) => n + r.menu.filter(m => hasFullCoreNutrition(m) && hasExtendedNutrition(m) === false || hasFullCoreNutrition(m)).length,
    0
  )
  const brands_complete = refs.filter(r => r.menu.length > 0 && r.metadata.nutrition_source_url).length
  const promote_ready_total = brands.reduce((n, b) => n + b.promote_ready_count, 0)
  const pending_review_total = pendingReviewNames.size

  const allSprintBrands = new Set(
    [...loadSprintBrandNames()]
  )
  const missing_official_source = [...allSprintBrands].filter(
    name => !refs.some(r => r.metadata.canonical_name === name)
  )

  return {
    generated_at: new Date().toISOString(),
    brands_complete,
    brands_total: refs.length,
    menu_items_total,
    nutrition_complete_total,
    overall_coverage_pct:
      brands.length > 0
        ? Math.round(brands.reduce((s, b) => s + b.official_menu_coverage_pct, 0) / brands.length)
        : 0,
    pending_review_total,
    promote_ready_total,
    missing_official_source,
    brands,
  }
}

function loadSprintBrandNames(): string[] {
  const names: string[] = []
  for (const sprint of ['sprint-1', 'sprint-2']) {
    const p = path.join(process.cwd(), 'data', 'food-kb', 'staging', sprint, 'brands.json')
    if (!fs.existsSync(p)) continue
    const data = JSON.parse(fs.readFileSync(p, 'utf8')) as { brands: Array<{ canonical_name: string }> }
    names.push(...data.brands.map(b => b.canonical_name))
  }
  return names
}

export function formatCoverageMarkdown(dashboard: OfficialCoverageDashboard): string {
  const lines = [
    '# Official Reference Coverage Dashboard',
    '',
    `Generated: ${dashboard.generated_at}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Official brands complete | ${dashboard.brands_complete} / ${dashboard.brands_total} |`,
    `| Official menu items | ${dashboard.menu_items_total} |`,
    `| Official nutrition rows | ${dashboard.nutrition_complete_total} |`,
    `| Overall menu coverage | ${dashboard.overall_coverage_pct}% |`,
    `| Pending review (diff) | ${dashboard.pending_review_total} |`,
    `| Promote-ready (staging) | ${dashboard.promote_ready_total} |`,
    '',
    '## Per brand',
    '',
    '| Brand | Source | Menu | Menu % | Nutrition % | Recommendable | Pending manual | Promote ready |',
    '|-------|--------|-----:|-------:|------------:|--------------:|---------------:|--------------:|',
  ]

  for (const b of dashboard.brands) {
    lines.push(
      `| ${b.canonical_name} | ${b.source_complete ? '✅' : '❌'} | ${b.menu_count}/${b.menu_target} | ${b.official_menu_coverage_pct}% | ${b.official_nutrition_coverage_pct}% | ${b.recommendable_count} (${b.recommendable_pct}%) | ${b.pending_manual_count} | ${b.promote_ready_count} |`
    )
  }

  lines.push('', '## Missing official source (sprint brands)', '')
  if (!dashboard.missing_official_source.length) lines.push('_None_')
  else for (const m of dashboard.missing_official_source.slice(0, 80)) lines.push(`- ${m}`)

  return lines.join('\n')
}

export function diffAllOfficialAgainstRuntime(): ReturnType<typeof compareNutritionToOfficial>[] {
  const results: ReturnType<typeof compareNutritionToOfficial>[] = []
  const refs = loadAllOfficialReferences()
  for (const ref of refs) {
    const runtime = runtimeItemsForBrand(ref.metadata.canonical_name, ref.metadata.store_aliases)
    for (const item of ref.menu) {
      const official = officialItemToSnapshot(item)
      const match = runtime.find(r => r.name === item.name)
      if (!match) continue
      results.push(
        compareNutritionToOfficial(official, match.macros, {
          item_name: item.name,
          brand: ref.metadata.canonical_name,
          compare_source: 'runtime',
        })
      )
    }
  }
  return results
}

export { findOfficialMenuItem }
