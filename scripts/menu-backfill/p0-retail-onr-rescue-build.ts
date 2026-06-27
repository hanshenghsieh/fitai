#!/usr/bin/env npx tsx
/**
 * P0 Retail ONR Rescue — merge 3-brand ONR batch into staging (NOT production).
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
const BRANDS_PATH = path.join(ROOT, 'data', 'food-kb', 'staging', 'p0-retail-onr-rescue', 'brands.json')
const MANIFEST_IN = path.join(ROOT, 'data', 'food-kb', 'staging', 'manifest.json')
const REPORT_OUT = path.join(ROOT, 'docs', 'P0_RETAIL_ONR_RESCUE_STAGING.md')

const VERIFIED_AT = new Date().toISOString()
const VERIFIED_BY = 'p0-retail-onr-rescue'

function main() {
  if (BDGS_DATA_FREEZE) {
    console.error('\nBDGS_DATA_FREEZE is active.\n')
    process.exit(1)
  }

  const { brands } = JSON.parse(fs.readFileSync(BRANDS_PATH, 'utf8')) as {
    brands: StagingBuildBrand[]
  }
  const rescueNames = new Set(brands.map(b => b.canonical_name))

  const existing: StagingManifest | null = fs.existsSync(MANIFEST_IN)
    ? (JSON.parse(fs.readFileSync(MANIFEST_IN, 'utf8')) as StagingManifest)
    : null

  const preserved =
    existing?.restaurants.filter(r => !rescueNames.has(r.canonical_name)) ?? []

  const rescueRestaurants = buildStagingRestaurants({
    brands,
    verifiedAt: VERIFIED_AT,
    verifiedBy: VERIFIED_BY,
    itemIdPrefix: 'p0retail-',
    sprintLabel: 'P0RetailONR',
  })
  runStagingRestaurantQa(rescueRestaurants, VERIFIED_AT)

  const restaurants = [...preserved, ...rescueRestaurants]
  const conflicts = collectStagingConflicts(rescueRestaurants)

  const manifest: StagingManifest = {
    version: '1.0.0-p0-retail-onr-rescue',
    generated_at: new Date().toISOString(),
    policy: 'zero_hallucination',
    restaurants,
  }

  fs.writeFileSync(MANIFEST_IN, JSON.stringify(manifest, null, 2))
  fs.writeFileSync(
    REPORT_OUT,
    formatSprintBackfillReport({
      sprintNumber: 0,
      sprintTarget: brands.length,
      brands,
      restaurants: rescueRestaurants,
      conflicts,
      preservedFromPriorSprint: preserved.length,
      nextSprintSuggestions: [
        '包裝營養標示人工录入（Priority B）',
        '向萊爾富/OK/全聯索取官方 Excel 鮮食營養表',
        '維持停止 Sprint 7 bulk draft',
      ],
    }).replace('Sprint 0', 'P0 Retail ONR Rescue')
  )

  const stats = computeSprintReportStats(brands, rescueRestaurants)
  console.log('\n=== P0 Retail ONR Rescue Staging ===\n')
  console.log(`With items: ${stats.withItems}/${brands.length}`)
  console.log(`New items: ${stats.totalItems}`)
  console.log(`Report: ${REPORT_OUT}\n`)
}

main()
