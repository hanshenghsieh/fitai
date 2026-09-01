#!/usr/bin/env npx tsx
/**
 * CLI wrapper for the menu nutrition integrity audit — see
 * src/lib/nutrition/menu-nutrition-audit.ts for the actual (tested) logic.
 *
 * Usage: npx tsx scripts/food-kb/audit-menu-nutrition-integrity.ts
 * Writes a JSON artifact (all failing items, full detail) to
 * scripts/food-kb/.audit-output/ (gitignored, not committed) and prints a
 * markdown-style summary to stdout.
 */
import fs from 'fs'
import path from 'path'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { runAudit, formatAuditMarkdownSummary } from '@/lib/nutrition/menu-nutrition-audit'

function main() {
  const { audited, summary } = runAudit(eatOutMenu)
  const md = formatAuditMarkdownSummary(summary)
  console.log(md)

  const outDir = path.join(process.cwd(), 'scripts', 'food-kb', '.audit-output')
  fs.mkdirSync(outDir, { recursive: true })
  const failingOnly = audited.filter(a => !a.passes_gate)
  fs.writeFileSync(path.join(outDir, 'menu-nutrition-audit.json'), JSON.stringify({ summary, failingItems: failingOnly }, null, 2))
  fs.writeFileSync(path.join(outDir, 'menu-nutrition-audit-summary.md'), md)
  console.log(`\nFull JSON artifact: ${path.join(outDir, 'menu-nutrition-audit.json')}`)
  console.log(`Markdown summary: ${path.join(outDir, 'menu-nutrition-audit-summary.md')}`)
}

main()
