#!/usr/bin/env npx tsx
/**
 * BDGS — generate Database Health Report (read-only, no new data).
 */
import fs from 'fs'
import path from 'path'
import {
  buildDatabaseHealthReport,
  formatDatabaseHealthReportMd,
  runSourceMonitorDaily,
  loadGovernanceEngineState,
  saveGovernanceFingerprints,
} from '@/lib/data-governance'

const OUT = path.join(process.cwd(), 'docs', 'DATABASE_HEALTH_REPORT.md')

function main() {
  const state = loadGovernanceEngineState()
  const monitor = runSourceMonitorDaily(state)
  saveGovernanceFingerprints(monitor.updated_fingerprints)

  const report = buildDatabaseHealthReport(state)
  fs.writeFileSync(OUT, formatDatabaseHealthReportMd(report))

  console.log('\n=== BetterBit Data Governance System ===\n')
  console.log(`Freeze active: ${report.freeze_active}`)
  console.log(`Health score: ${report.health_score} (${report.health_grade})`)
  console.log(`Restaurant coverage: ${report.coverage.restaurant_coverage_pct}%`)
  console.log(`ONR coverage: ${report.coverage.onr_coverage_pct}%`)
  console.log(`Pending review: ${report.coverage.pending_review_count}`)
  console.log(`Need review: ${report.coverage.need_review_count}`)
  console.log(`Deprecated: ${report.coverage.deprecated_count}`)
  console.log(`Source monitor changes: ${monitor.results.filter(r => r.changed).length}`)
  console.log(`\nReport: ${OUT}\n`)
}

main()
