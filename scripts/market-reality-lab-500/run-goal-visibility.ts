#!/usr/bin/env npx tsx
/**
 * MR500 — Goal Visibility A/B (iter4 without vs iter5 with)
 * npm run mr500:goal-visibility
 */
import fs from 'fs'
import path from 'path'
import { generateHumans } from './generators'
import { PRODUCT_ITERATIONS, simulateAll } from './simulate'
import type { SimAggregate } from './types'

const OUT = path.join(process.cwd(), 'docs', 'market-reality-lab-500', 'GOAL_VISIBILITY_REPORT.md')
const SEED = 20260621

const GOAL_COMPLAINTS = [
  '沒進度感',
  '不懂為什麼沒瘦',
  '沒有解釋為什麼沒瘦',
  '體重沒變以為app壞了',
  '不知道平台期是正常',
  '數字看不懂',
  '沒進度感',
]

const GOAL_DELIGHTS = [
  '知道還差多少公斤',
  '目標時間看得懂',
  '熱量目標清楚',
  '平台期有安慰到',
  'D3就知道有在幫我',
]

function pct(n: number, total: number) {
  return total ? `${((n / total) * 100).toFixed(1)}%` : '0%'
}

function sumComplaints(agg: SimAggregate, keys: string[]) {
  return keys.reduce((s, k) => s + (agg.complaint_counts.get(k) ?? 0), 0)
}

function sumDelights(agg: SimAggregate, keys: string[]) {
  return keys.reduce((s, k) => s + (agg.delight_counts.get(k) ?? 0), 0)
}

function countLines(agg: SimAggregate, keys: string[], map: Map<string, number>) {
  return keys
    .map(k => `| ${k} | ${map.get(k) ?? 0} |`)
    .join('\n')
}

const withoutGV = PRODUCT_ITERATIONS.find(p => p.iteration === 4)!
const withGV = PRODUCT_ITERATIONS.find(p => p.iteration === 5)!

console.log('MR500 Goal Visibility — generating 500 humans (seed', SEED, ')…')
const humans = generateHumans(500, SEED)

console.log('Simulating WITHOUT goal visibility (iter 4)…')
const aggOff = simulateAll(humans, withoutGV)

console.log('Simulating WITH goal visibility (iter 5)…')
const aggOn = simulateAll(humans, withGV)

const n = aggOn.n
const offComplaints = sumComplaints(aggOff, GOAL_COMPLAINTS)
const onComplaints = sumComplaints(aggOn, GOAL_COMPLAINTS)
const offDelights = sumDelights(aggOff, GOAL_DELIGHTS)
const onDelights = sumDelights(aggOn, GOAL_DELIGHTS)

const report = `# MR500 — Goal Visibility

**Date:** ${new Date().toISOString().slice(0, 10)}  
**Method:** Same 500 Taiwan humans · A/B product flag has_goal_visibility  
**Product:** iter4 baseline (dice 95%, meal trust, plateau) vs iter5 (+ has_goal_visibility)

Goal Visibility = 進度頁可看目標距離（還差多少、時間感、脂肪銀行）、平台期解釋，不變回 KPI 儀表板。

---

## Headline

| Metric | Without GV | With GV | Δ |
|--------|------------|---------|---|
| D30 | ${pct(aggOff.d30, n)} (${aggOff.d30}) | ${pct(aggOn.d30, n)} (${aggOn.d30}) | ${aggOn.d30 - aggOff.d30 >= 0 ? '+' : ''}${aggOn.d30 - aggOff.d30} |
| D90 | ${pct(aggOff.d90, n)} | ${pct(aggOn.d90, n)} | ${aggOn.d90 - aggOff.d90 >= 0 ? '+' : ''}${aggOn.d90 - aggOff.d90} |
| Subscribe | ${pct(aggOff.subscribed, n)} | ${pct(aggOn.subscribed, n)} | ${aggOn.subscribed - aggOff.subscribed >= 0 ? '+' : ''}${aggOn.subscribed - aggOff.subscribed} |
| Would recommend | ${pct(aggOff.would_recommend, n)} | ${pct(aggOn.would_recommend, n)} | ${aggOn.would_recommend - aggOff.would_recommend >= 0 ? '+' : ''}${aggOn.would_recommend - aggOff.would_recommend} |
| Goal-related complaints (sum) | ${offComplaints} | ${onComplaints} | ${onComplaints - offComplaints <= 0 ? '' : '+'}${onComplaints - offComplaints} |
| Goal-related delights (sum) | ${offDelights} | ${onDelights} | +${onDelights - offDelights} |

---

## Goal-related complaints

| Complaint | Without GV | With GV |
|-----------|------------|---------|
${GOAL_COMPLAINTS.filter((k, i, a) => a.indexOf(k) === i).map(k => `| ${k} | ${aggOff.complaint_counts.get(k) ?? 0} | ${aggOn.complaint_counts.get(k) ?? 0} |`).join('\n')}

---

## Goal-related delights

| Delight | Without GV | With GV |
|---------|------------|---------|
${GOAL_DELIGHTS.map(k => `| ${k} | ${aggOff.delight_counts.get(k) ?? 0} | ${aggOn.delight_counts.get(k) ?? 0} |`).join('\n')}

---

## Verdict

${onComplaints < offComplaints && onDelights > offDelights
  ? '**PASS** — Goal Visibility reduces progress confusion complaints and increases goal-oriented delight moments.'
  : onComplaints <= offComplaints
    ? '**MIXED** — Complaints improved but delight lift modest; tighten Progress UI copy or surface goal distance on Week.'
    : '**INVESTIGATE** — Goal Visibility flag did not reduce complaints as expected; review simulation weights vs real UI.'}

**Ship check:** Progress page shows trend + fat bank + adaptation (Phase 10.3). Trial users see 14-day preview; full history after subscribe.

**Re-run:** npm run mr500:goal-visibility
`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, report, 'utf8')

console.log('\n── Goal Visibility A/B ──')
console.log(`  D30:  ${pct(aggOff.d30, n)} → ${pct(aggOn.d30, n)}`)
console.log(`  Sub:  ${pct(aggOff.subscribed, n)} → ${pct(aggOn.subscribed, n)}`)
console.log(`  Goal complaints: ${offComplaints} → ${onComplaints}`)
console.log(`  Goal delights:   ${offDelights} → ${onDelights}`)
console.log(`\nReport → ${OUT}`)
