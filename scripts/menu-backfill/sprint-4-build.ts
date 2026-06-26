#!/usr/bin/env npx tsx
/**
 * Menu Backfill Sprint 4 — merge 50-brand batch into staging manifest.
 * BDGS: all items follow promotion pipeline. Does NOT write production.
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
const BRANDS_PATH = path.join(ROOT, 'data', 'food-kb', 'staging', 'sprint-4', 'brands.json')
const MANIFEST_IN = path.join(ROOT, 'data', 'food-kb', 'staging', 'manifest.json')
const REPORT_OUT = path.join(ROOT, 'docs', 'MENU_BACKFILL_SPRINT_4_REPORT.md')

const VERIFIED_AT = new Date().toISOString()
const VERIFIED_BY = 'menu-backfill-sprint-4'

function main() {
  if (BDGS_DATA_FREEZE) {
    console.error('\nBDGS_DATA_FREEZE is active. Founder must lift freeze before Sprint 4 build.\n')
    process.exit(1)
  }

  const { brands } = JSON.parse(fs.readFileSync(BRANDS_PATH, 'utf8')) as {
    brands: StagingBuildBrand[]
  }
  const sprint4Names = new Set(brands.map(b => b.canonical_name))

  const existing: StagingManifest | null = fs.existsSync(MANIFEST_IN)
    ? (JSON.parse(fs.readFileSync(MANIFEST_IN, 'utf8')) as StagingManifest)
    : null

  const preserved =
    existing?.restaurants.filter(r => !sprint4Names.has(r.canonical_name)) ?? []

  const buildOpts = {
    brands,
    verifiedAt: VERIFIED_AT,
    verifiedBy: VERIFIED_BY,
    itemIdPrefix: 'sprint4-',
    sprintLabel: 'Sprint4',
  }

  const sprint4Restaurants = buildStagingRestaurants(buildOpts)
  runStagingRestaurantQa(sprint4Restaurants, VERIFIED_AT)

  const restaurants = [...preserved, ...sprint4Restaurants]
  const conflicts = collectStagingConflicts(sprint4Restaurants)

  const manifest: StagingManifest = {
    version: '1.0.0-sprint-4',
    generated_at: new Date().toISOString(),
    policy: 'zero_hallucination',
    restaurants,
  }

  fs.writeFileSync(MANIFEST_IN, JSON.stringify(manifest, null, 2))
  fs.writeFileSync(
    REPORT_OUT,
    formatSprintBackfillReport({
      sprintNumber: 4,
      sprintTarget: brands.length,
      brands,
      restaurants: sprint4Restaurants,
      conflicts,
      preservedFromPriorSprint: preserved.length,
      nextSprintSuggestions: [
        'Sprint 5：牛排·西餐（王品、夏慕尼、茹絲葵）',
        '火鍋品牌官方營養頁 → ONR',
        'BDGS Founder Review 後 Promotion',
      ],
    })
  )

  const stats = computeSprintReportStats(brands, sprint4Restaurants)
  const total = restaurants.reduce((n, r) => n + r.items.length, 0)

  console.log('\n=== Menu Backfill Sprint 4 ===\n')
  console.log(`Preserved: ${preserved.length}`)
  console.log(`Sprint 4 with items: ${stats.withItems}/${brands.length}`)
  console.log(`Sprint 4 new items: ${stats.totalItems}`)
  console.log(`Manifest total: ${total}`)
  console.log(`Report: ${REPORT_OUT}\n`)
}

main()
