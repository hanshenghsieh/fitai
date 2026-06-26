#!/usr/bin/env npx tsx
import fs from 'fs'
import path from 'path'
import {
  buildOfficialCoverageDashboard,
  formatCoverageMarkdown,
} from '@/lib/nutrition/official-reference'

const OUT_MD = path.join(process.cwd(), 'docs', 'OFFICIAL_REFERENCE_COVERAGE.md')

function main() {
  const dashboard = buildOfficialCoverageDashboard()
  fs.writeFileSync(OUT_MD, formatCoverageMarkdown(dashboard))

  console.log('\n=== ONR Coverage Dashboard ===\n')
  console.log(`Brands complete: ${dashboard.brands_complete}/${dashboard.brands_total}`)
  console.log(`Menu items: ${dashboard.menu_items_total}`)
  console.log(`Overall coverage: ${dashboard.overall_coverage_pct}%`)
  console.log(`Pending review: ${dashboard.pending_review_total}`)
  console.log(`Promote ready: ${dashboard.promote_ready_total}`)
  console.log(`Missing official source: ${dashboard.missing_official_source.length}`)
  console.log(`\nReport: ${OUT_MD}\n`)
}

main()
