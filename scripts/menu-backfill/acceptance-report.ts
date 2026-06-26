#!/usr/bin/env npx tsx
/**
 * Menu Backfill — 10-section acceptance report (read-only).
 * Does NOT write to production or runtime menu.
 */
import fs from 'fs'
import path from 'path'
import {
  formatAcceptanceMarkdown,
  generateAcceptanceReport,
  type StagingManifest,
} from '@/lib/nutrition/menu-backfill'

const STAGING_PATH = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'manifest.json')
const DOCS_DIR = path.join(process.cwd(), 'docs')

function loadStaging(): StagingManifest | null {
  if (!fs.existsSync(STAGING_PATH)) return null
  return JSON.parse(fs.readFileSync(STAGING_PATH, 'utf8')) as StagingManifest
}

function main() {
  const staging = loadStaging()
  const report = generateAcceptanceReport(staging)
  const md = formatAcceptanceMarkdown(report)

  fs.mkdirSync(DOCS_DIR, { recursive: true })
  const mdPath = path.join(DOCS_DIR, 'MENU_BACKFILL_ACCEPTANCE_REPORT.md')
  const jsonPath = path.join(DOCS_DIR, 'MENU_BACKFILL_ACCEPTANCE_REPORT.json')
  fs.writeFileSync(mdPath, md)
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))

  console.log('\n=== Menu Backfill Acceptance Report ===\n')
  console.log(`Runtime recommendable (A/B): ${report.menu_coverage.runtime_recommendable}`)
  console.log(`D blocked: ${report.runtime_ready.blocked_d_count}`)
  console.log(`Missing restaurants: ${report.missing_restaurants.length}`)
  console.log(`Staging restaurants: ${report.restaurant_coverage.with_staging_menu}`)
  console.log(`\nMarkdown: ${mdPath}`)
  console.log(`JSON: ${jsonPath}`)
  console.log('\nNo production writes. Add verified items to data/food-kb/staging/manifest.json\n')
}

main()
