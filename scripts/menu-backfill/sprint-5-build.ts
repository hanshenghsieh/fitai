#!/usr/bin/env npx tsx
/**
 * Menu Backfill Sprint 5 — merge 50-brand batch into staging manifest.
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
const BRANDS_PATH = path.join(ROOT, 'data', 'food-kb', 'staging', 'sprint-5', 'brands.json')
const MANIFEST_IN = path.join(ROOT, 'data', 'food-kb', 'staging', 'manifest.json')
const REPORT_OUT = path.join(ROOT, 'docs', 'MENU_BACKFILL_SPRINT_5_REPORT.md')

const VERIFIED_AT = new Date().toISOString()
const VERIFIED_BY = 'menu-backfill-sprint-5'

function main() {
  if (BDGS_DATA_FREEZE) {
    console.error('\nBDGS_DATA_FREEZE is active. Founder must lift freeze before Sprint 5 build.\n')
    process.exit(1)
  }

  const { brands } = JSON.parse(fs.readFileSync(BRANDS_PATH, 'utf8')) as {
    brands: StagingBuildBrand[]
  }
  const sprint5Names = new Set(brands.map(b => b.canonical_name))

  const existing: StagingManifest | null = fs.existsSync(MANIFEST_IN)
    ? (JSON.parse(fs.readFileSync(MANIFEST_IN, 'utf8')) as StagingManifest)
    : null

  const preserved =
    existing?.restaurants.filter(r => !sprint5Names.has(r.canonical_name)) ?? []

  const buildOpts = {
    brands,
    verifiedAt: VERIFIED_AT,
    verifiedBy: VERIFIED_BY,
    itemIdPrefix: 'sprint5-',
    sprintLabel: 'Sprint5',
  }

  const sprint5Restaurants = buildStagingRestaurants(buildOpts)
  runStagingRestaurantQa(sprint5Restaurants, VERIFIED_AT)

  const restaurants = [...preserved, ...sprint5Restaurants]
  const conflicts = collectStagingConflicts(sprint5Restaurants)

  const manifest: StagingManifest = {
    version: '1.0.0-sprint-5',
    generated_at: new Date().toISOString(),
    policy: 'zero_hallucination',
    restaurants,
  }

  fs.writeFileSync(MANIFEST_IN, JSON.stringify(manifest, null, 2))
  fs.writeFileSync(
    REPORT_OUT,
    formatSprintBackfillReport({
      sprintNumber: 5,
      sprintTarget: brands.length,
      brands,
      restaurants: sprint5Restaurants,
      conflicts,
      preservedFromPriorSprint: preserved.length,
      nextSprintSuggestions: [
        'Sprint 6：泰式·咖啡甜點',
        '牛排/西餐官方營養頁 → ONR',
        '火鍋 ONR 人工補齊後重跑 Sprint 4',
      ],
    })
  )

  const stats = computeSprintReportStats(brands, sprint5Restaurants)
  const total = restaurants.reduce((n, r) => n + r.items.length, 0)

  console.log('\n=== Menu Backfill Sprint 5 ===\n')
  console.log(`Preserved: ${preserved.length}`)
  console.log(`Sprint 5 with items: ${stats.withItems}/${brands.length}`)
  console.log(`Sprint 5 new items: ${stats.totalItems}`)
  console.log(`Manifest total: ${total}`)
  console.log(`Report: ${REPORT_OUT}\n`)
}

main()
