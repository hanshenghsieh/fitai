#!/usr/bin/env npx tsx
/**
 * Menu Backfill Sprint 6 — P0 partial upgrade batch into staging manifest.
 */
import fs from 'fs'
import path from 'path'
import type { StagingManifest } from '@/lib/nutrition/menu-backfill/types'
import {
  buildStagingRestaurants,
  collectStagingConflicts,
  computeSprintReportStats,
  formatSprintBackfillReport,
  runStagingRestaurantQa,
  type StagingBuildBrand,
} from '@/lib/nutrition/menu-backfill/staging-build'
import { BDGS_DATA_FREEZE } from '@/lib/data-governance'

const ROOT = process.cwd()
const BRANDS_PATH = path.join(ROOT, 'data', 'food-kb', 'staging', 'sprint-6', 'brands.json')
const MANIFEST_IN = path.join(ROOT, 'data', 'food-kb', 'staging', 'manifest.json')
const REPORT_OUT = path.join(ROOT, 'docs', 'MENU_BACKFILL_SPRINT_6_REPORT.md')

const VERIFIED_AT = new Date().toISOString()
const VERIFIED_BY = 'menu-backfill-sprint-6'

function main() {
  if (BDGS_DATA_FREEZE) {
    console.error('\nBDGS_DATA_FREEZE is active. Founder must lift freeze before Sprint 6 build.\n')
    process.exit(1)
  }

  const { brands, phase, theme, batch_id } = JSON.parse(fs.readFileSync(BRANDS_PATH, 'utf8')) as {
    brands: StagingBuildBrand[]
    phase?: string
    theme?: string
    batch_id?: string
  }
  const sprint6Names = new Set(brands.map(b => b.canonical_name))

  const existing: StagingManifest | null = fs.existsSync(MANIFEST_IN)
    ? (JSON.parse(fs.readFileSync(MANIFEST_IN, 'utf8')) as StagingManifest)
    : null

  const preserved =
    existing?.restaurants.filter(r => !sprint6Names.has(r.canonical_name)) ?? []

  const buildOpts = {
    brands,
    verifiedAt: VERIFIED_AT,
    verifiedBy: VERIFIED_BY,
    itemIdPrefix: 'sprint6-',
    sprintLabel: 'Sprint6',
  }

  const sprint6Restaurants = buildStagingRestaurants(buildOpts)
  runStagingRestaurantQa(sprint6Restaurants, VERIFIED_AT)

  const restaurants = [...preserved, ...sprint6Restaurants]
  const conflicts = collectStagingConflicts(sprint6Restaurants)

  const manifest: StagingManifest = {
    version: '1.0.0-sprint-6',
    generated_at: new Date().toISOString(),
    policy: 'zero_hallucination',
    restaurants,
  }

  fs.writeFileSync(MANIFEST_IN, JSON.stringify(manifest, null, 2))
  fs.writeFileSync(
    REPORT_OUT,
    formatSprintBackfillReport({
      sprintNumber: 6,
      sprintTarget: brands.length,
      brands,
      restaurants: sprint6Restaurants,
      conflicts,
      preservedFromPriorSprint: preserved.length,
      nextSprintSuggestions: [
        `Sprint 7：P0 partial 殘餘（phase: ${phase ?? 'p0_partial'}）`,
        'Sprint 8+：P0 missing（169 家）',
        'placeholder-heavy 零售（萊爾富/OK）優先 ONR verified 主餐',
      ],
    })
  )

  const stats = computeSprintReportStats(brands, sprint6Restaurants)
  const total = restaurants.reduce((n, r) => n + r.items.length, 0)

  console.log('\n=== Menu Backfill Sprint 6 ===\n')
  console.log(`Phase: ${phase ?? 'p0_partial'}`)
  console.log(`Preserved: ${preserved.length}`)
  console.log(`Sprint 6 with items: ${stats.withItems}/${brands.length}`)
  console.log(`Sprint 6 new items: ${stats.totalItems}`)
  console.log(`Manifest total: ${total}`)
  console.log(`Report: ${REPORT_OUT}\n`)
}

main()
