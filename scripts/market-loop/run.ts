#!/usr/bin/env npx tsx
/**
 * Phase 8 — Market Reality Loop (permanent process)
 * Run after every major product change: npm run market-loop
 */
import { generateCharacterCards } from './generators'
import { CURRENT_PRODUCT } from './product-model'
import { simulateAll, aggregateResults, majorIssues } from './simulate'
import { writeMarketLoopReports } from './reports'
import { thresholdVerdict } from './adversarial'
import { topPatterns } from './adversarial'

const runId = `loop-${new Date().toISOString().slice(0, 10)}-${CURRENT_PRODUCT.version}`

console.log('Market Reality Loop — generating 500 character cards…')
const characters = generateCharacterCards(500, 20260620)

console.log(`Simulating D1→D180 against product ${CURRENT_PRODUCT.version}…`)
const results = simulateAll(characters, CURRENT_PRODUCT, Date.now())
const agg = aggregateResults(runId, CURRENT_PRODUCT, characters, results)

const n = results.length
const d30 = results.filter(r => r.milestones.d30).length
const subs = results.filter(r => r.outcome === 'subscribed' || r.outcome === 'churned_sub').length

console.log(`  D30=${((d30 / n) * 100).toFixed(1)}%  subscribe=${((subs / n) * 100).toFixed(1)}%  recommend=${((results.filter(r => r.would_recommend).length / n) * 100).toFixed(1)}%`)

writeMarketLoopReports(agg)

const major = majorIssues(agg.complaint_counts, agg.conversion_blockers)
const top = topPatterns(agg.complaint_counts, 8)

console.log('\n── Threshold scan ──')
for (const [t, c] of top) console.log(`  ${thresholdVerdict(c, t)}`)

if (major.length === 0) {
  console.log('\n✅ No major issues (100+ redesign / 50+ investigate on top complaints). Loop pass.')
} else {
  console.log(`\n⚠️  ${major.length} major issue(s) remain:`)
  for (const m of major) console.log(`  · ${m.text} (${m.count}) [${m.level}]`)
  console.log('\nFix P0 → update product-model.ts → re-run npm run market-loop')
}

console.log('\nHow would 10,000 users kill BetterBit tomorrow?')
console.log('  1. Trial cliff before felt behavioral win')
console.log('  2. Tracking friction vs free alternatives')
console.log('  3. Home-cook / mom segment still narrow')
console.log('  4. Barcode / MFP-speed gap (P1)')

process.exit(major.some(m => m.level === 'redesign') ? 1 : 0)
