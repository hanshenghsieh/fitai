#!/usr/bin/env npx tsx
/**
 * BetterBit Recommendation QA — offline report only.
 * Run: npm run qa:recommendation
 * Full bulk audit: npm run qa:recommendation -- --with-bulk
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { eatOutMenu } from '../src/lib/convenience-store-menu'
import {
  formatRecommendationQaMarkdown,
  runRecommendationQa,
  type AllowlistEntryMeta,
} from '../src/lib/nutrition/recommendation-qa'
import type { AllowlistFile } from '../src/lib/nutrition/restaurant-menu-audit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T
}

function main() {
  const withBulk = process.argv.includes('--with-bulk')
  const sampleOnly = process.argv.includes('--sample')

  const allowlist = loadJson<AllowlistFile & { entries: AllowlistEntryMeta[] }>(
    'data/food-kb/top300-allowlist.json'
  )

  let bulk: typeof eatOutMenu = []
  if (withBulk) {
    try {
      bulk = loadJson<typeof eatOutMenu>('data/food-kb/dice-menu-bulk.json')
    } catch {
      console.warn('⚠ dice-menu-bulk.json not found — core menu only')
    }
  }

  console.log('=== BetterBit Recommendation QA ===\n')
  console.log(`Mode: ${sampleOnly ? 'sample' : withBulk ? 'core+bulk full' : 'core full'}`)
  console.log('Does NOT modify production or runtime database.\n')

  const report = runRecommendationQa({
    coreMenu: eatOutMenu,
    bulkMenu: bulk,
    allowlist,
    maxItems: sampleOnly ? 2000 : undefined,
    runRecommendationSamples: true,
  })

  const mdPath = path.join(ROOT, 'docs/RECOMMENDATION_QA_REPORT.md')
  const jsonPath = path.join(ROOT, 'docs/RECOMMENDATION_QA_REPORT.json')

  fs.mkdirSync(path.dirname(mdPath), { recursive: true })
  fs.writeFileSync(mdPath, formatRecommendationQaMarkdown(report), 'utf8')
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8')

  console.log('Restaurant coverage:', `${report.restaurant_coverage.with_menu}/${report.restaurant_coverage.allowlist_total}`)
  console.log('Items audited:', report.menu_coverage.items_audited)
  console.log('Recommendable (A/B):', report.menu_coverage.items_recommendable)
  console.log('Nutrition outliers:', report.nutrition_outliers)
  console.log('Placeholder menus:', report.menu_coverage.placeholder_count)
  console.log('Recommendation pass rate:', `${report.recommendation_samples.pass_rate_pct}%`)
  console.log(`\nMarkdown: ${mdPath}`)
  console.log(`JSON: ${jsonPath}`)
  console.log('\nAwaiting Founder approval before any production changes.')
}

main()
