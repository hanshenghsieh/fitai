#!/usr/bin/env npx tsx
/**
 * Menu Backfill Sprint 2 — merge 50-brand batch into staging manifest.
 * Preserves Sprint 1 restaurants not in this batch. Does NOT write production.
 */
import fs from 'fs'
import path from 'path'
import type { StagingManifest, StagingRestaurant } from '@/lib/nutrition/menu-backfill/types'
import {
  buildStagingRestaurants,
  collectStagingConflicts,
  computeSprintReportStats,
  formatSprintBackfillReport,
  runStagingRestaurantQa,
  type StagingBuildBrand,
} from '@/lib/nutrition/menu-backfill/staging-build'

const ROOT = process.cwd()
const BRANDS_PATH = path.join(ROOT, 'data', 'food-kb', 'staging', 'sprint-2', 'brands.json')
const MANIFEST_IN = path.join(ROOT, 'data', 'food-kb', 'staging', 'manifest.json')
const MANIFEST_OUT = MANIFEST_IN
const REPORT_OUT = path.join(ROOT, 'docs', 'MENU_BACKFILL_SPRINT_2_REPORT.md')

const VERIFIED_AT = new Date().toISOString()
const VERIFIED_BY = 'menu-backfill-sprint-2'

interface Sprint2BrandFile {
  brands: Array<
    StagingBuildBrand & {
      nutrition_source_status?: string
      notes?: string
    }
  >
}

function loadExistingManifest(): StagingManifest | null {
  if (!fs.existsSync(MANIFEST_IN)) return null
  return JSON.parse(fs.readFileSync(MANIFEST_IN, 'utf8')) as StagingManifest
}

function main() {
  const { brands } = JSON.parse(fs.readFileSync(BRANDS_PATH, 'utf8')) as Sprint2BrandFile
  const sprint2Names = new Set(brands.map(b => b.canonical_name))
  const existing = loadExistingManifest()

  const preserved: StagingRestaurant[] =
    existing?.restaurants.filter(r => !sprint2Names.has(r.canonical_name)) ?? []

  const buildOpts = {
    brands,
    verifiedAt: VERIFIED_AT,
    verifiedBy: VERIFIED_BY,
    itemIdPrefix: 'sprint2-',
    sprintLabel: 'Sprint2',
  }

  const sprint2Restaurants = buildStagingRestaurants(buildOpts)
  runStagingRestaurantQa(sprint2Restaurants, VERIFIED_AT)

  const restaurants = [...preserved, ...sprint2Restaurants]
  const conflicts = collectStagingConflicts(sprint2Restaurants)

  const manifest: StagingManifest = {
    version: '1.0.0-sprint-2',
    generated_at: new Date().toISOString(),
    policy: 'zero_hallucination',
    restaurants,
  }

  fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true })
  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2))

  const report = formatSprintBackfillReport({
    sprintNumber: 2,
    sprintTarget: brands.length,
    brands,
    restaurants: sprint2Restaurants,
    conflicts,
    preservedFromPriorSprint: preserved.length,
    nextSprintSuggestions: [
      '燒肉集群：乾杯、老乾杯、胡同、茶六',
      '拉麵集群：一風堂、一蘭、Nagi、鬼金棒',
      '牛肉麵集群：永康、劉山東、建宏',
      '金峰、林東芳：補可追溯營養來源後納入',
    ],
  })
  fs.writeFileSync(REPORT_OUT, report)

  const sprint2Stats = computeSprintReportStats(brands, sprint2Restaurants)
  const totalItems = restaurants.reduce((n, r) => n + r.items.length, 0)
  const totalProd = restaurants.filter(r => r.status === 'production_candidate').length

  console.log('\n=== Menu Backfill Sprint 2 ===\n')
  console.log(`Preserved from prior sprint: ${preserved.length}`)
  console.log(`Sprint 2 restaurants with items: ${sprint2Stats.withItems}/${brands.length}`)
  console.log(`Sprint 2 new items: ${sprint2Stats.totalItems}`)
  console.log(`Sprint 2 production_candidate: ${sprint2Stats.prodCount}`)
  console.log(`Manifest total items: ${totalItems}`)
  console.log(`Manifest total production_candidate: ${totalProd}`)
  console.log(`pending_review conflicts: ${conflicts.length}`)
  console.log(`skipped (no nutrition URL): ${brands.filter(b => !b.nutrition_source_url).length}`)
  console.log(`\nManifest: ${MANIFEST_OUT}`)
  console.log(`Report: ${REPORT_OUT}\n`)
}

main()
