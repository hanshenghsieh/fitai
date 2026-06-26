#!/usr/bin/env npx tsx
/**
 * Audit runtime menu for meal-target fallback bugs (632 kcal pattern).
 * Run: npm run nutrition:audit-fallback
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { eatOutMenu } from '../../src/lib/convenience-store-menu'
import {
  auditMenuForMealTargetFallback,
  type MealTargetAuditIssue,
} from '../../src/lib/nutrition/meal-target-fallback-audit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

function loadBulk(): typeof eatOutMenu {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data/food-kb/dice-menu-bulk.json'), 'utf8')
    ) as typeof eatOutMenu
  } catch {
    return []
  }
}

function summarize(issues: MealTargetAuditIssue[]) {
  const byKind = new Map<string, number>()
  for (const i of issues) byKind.set(i.kind, (byKind.get(i.kind) ?? 0) + 1)
  return Object.fromEntries(byKind)
}

function main() {
  const withBulk = process.argv.includes('--with-bulk')
  const bulk = withBulk ? loadBulk() : []
  const seen = new Set(eatOutMenu.map(i => i.id))
  const merged = [...eatOutMenu, ...bulk.filter(i => i.id && !seen.has(i.id))]

  console.log('=== Meal-target fallback audit ===\n')
  console.log(`Items: ${eatOutMenu.length} core + ${bulk.length} bulk → ${merged.length} scanned\n`)

  const report = auditMenuForMealTargetFallback(merged)

  if (report.pass) {
    console.log('✓ PASS — no meal-target fallback or suspicious clusters detected')
    process.exit(0)
  }

  console.log('✗ FAIL — issues found:', summarize(report.issues))
  for (const issue of report.issues.slice(0, 40)) {
    console.log(JSON.stringify(issue))
  }
  if (report.issues.length > 40) {
    console.log(`… and ${report.issues.length - 40} more`)
  }
  process.exit(1)
}

main()
