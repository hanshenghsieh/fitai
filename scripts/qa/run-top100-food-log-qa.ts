#!/usr/bin/env npx tsx
/**
 * Milestone A — Top 100 Taiwan food search / log QA report generator.
 * Run: npm run qa:top100-food-log
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  runTop100FoodLogQa,
  summarizeTop100Results,
  loadTop100Fixture,
} from '../../src/lib/nutrition/top100-food-log-qa'

const results = runTop100FoodLogQa()
const { passed, total, failed, byCategory } = summarizeTop100Results(results)
const rate = ((passed / total) * 100).toFixed(1)
const fixture = loadTop100Fixture()

const categoryRows = [...byCategory.entries()]
  .sort((a, b) => a[0].localeCompare(b[0], 'zh-Hant'))
  .map(([cat, { pass, total: t }]) => `| ${cat} | ${pass}/${t} | ${((pass / t) * 100).toFixed(0)}% |`)
  .join('\n')

const failureRows = failed
  .map(
    f =>
      `| ${f.id} | ${f.category} | ${f.query} | ${f.failures.join('; ')} | ${f.topName ?? '—'} | ${f.textAction ?? '—'} |`
  )
  .join('\n')

const md = `# Top 100 Food Log QA Report

Generated: ${new Date().toISOString()}
Fixture: \`${fixture.version}\` — ${fixture.description}

## Summary

| Metric | Value |
|--------|-------|
| Passed | **${passed}/${total}** (${rate}%) |
| Failed | ${failed.length} |

## By category

| Category | Pass | Rate |
|----------|------|------|
${categoryRows}

## Failures

| ID | Category | Query | Reason | Top hit | Text action |
|----|----------|-------|--------|---------|-------------|
${failureRows || '| — | — | — | All passed | — | — |'}

## Milestone A exit target

- ≥95% pass on this matrix
- 10 users × 7 days with zero「記了不見 / 搜不到 / 熱量離譜」
`

const outPath = join(process.cwd(), 'docs/TOP_100_FOOD_LOG_QA_REPORT.md')
writeFileSync(outPath, md, 'utf8')
console.log(`Wrote ${outPath}`)
console.log(`${passed}/${total} passed (${rate}%)`)
if (failed.length) {
  console.log('Failures:')
  for (const f of failed.slice(0, 10)) {
    console.log(`  ${f.id} "${f.query}": ${f.failures.join('; ')}`)
  }
  if (failed.length > 10) console.log(`  … +${failed.length - 10} more`)
}
process.exit(failed.length > 0 ? 1 : 0)
