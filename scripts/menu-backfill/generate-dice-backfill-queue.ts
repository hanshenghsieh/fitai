#!/usr/bin/env npx tsx
/**
 * Generate dice menu backfill queue from 600-brand audit.
 * Priority: P0 partial → P0 missing → P1 partial → P1 missing
 * Run: npm run backfill:generate-queue
 */
import fs from 'fs'
import path from 'path'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { mergeMenuSources, type AllowlistFile } from '@/lib/nutrition/restaurant-menu-audit'
import { auditDiceBrandMenus } from '@/lib/nutrition/dice-brand-menu-audit'
import { buildDiceBackfillQueue } from '@/lib/nutrition/dice-backfill-queue'
import { rebuildDiceStoreVariantIndex } from '@/lib/dice-store-aliases'

const ROOT = process.cwd()
const ALLOWLIST = path.join(ROOT, 'data', 'food-kb', 'food-source-allowlist.json')
const BULK = path.join(ROOT, 'data', 'food-kb', 'dice-menu-bulk.json')
const OUT = path.join(ROOT, 'data', 'food-kb', 'staging', 'dice-backfill-queue.json')
const DOC = path.join(ROOT, 'docs', 'DICE_BACKFILL_QUEUE.md')

function main() {
  const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')) as AllowlistFile
  let bulk: typeof eatOutMenu = []
  if (fs.existsSync(BULK)) {
    bulk = JSON.parse(fs.readFileSync(BULK, 'utf8')) as typeof eatOutMenu
  }
  const menu = mergeMenuSources(eatOutMenu, bulk)
  rebuildDiceStoreVariantIndex(menu)

  const audit = auditDiceBrandMenus(menu, allowlist)
  const queue = buildDiceBackfillQueue(audit)

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(queue, null, 2))

  const lines = [
    '# Dice Menu Backfill Queue',
    '',
    `Generated: ${queue.generated_at}`,
    '',
    '## 優先序',
    '',
    '1. **P0 partial** — 已有 bulk/placeholder，需 verified A/B 主餐',
    '2. **P0 missing** — 0 品項，從官方/ONR 建菜單',
    '3. **P1 partial**',
    '4. **P1 missing**',
    '',
    '## 摘要',
    '',
    '| 階段 | 家數 | Sprint 批數 |',
    '|------|------|------------|',
    ...queue.phases.map(
      p => `| ${p.label.split(' — ')[0]} | ${p.count} | ${p.batches.length} |`
    ),
    '',
    `| **合計 incomplete** | **${queue.summary.total_incomplete}** | **${queue.summary.sprint_batches}** |`,
    '',
    '## Sprint 批次',
    '',
    ...queue.all_batches.map(b => {
      const names = b.brands.map(x => x.canonical_name).join(' · ')
      return `### ${b.batch_id} (${b.phase}) — ${b.brands.length} 家\n\n${names}\n`
    }),
  ]

  fs.writeFileSync(DOC, lines.join('\n'))

  console.log('=== Dice backfill queue ===\n')
  console.log(`P0 partial:  ${queue.summary.p0_partial}`)
  console.log(`P0 missing:  ${queue.summary.p0_missing}`)
  console.log(`P1 partial:  ${queue.summary.p1_partial}`)
  console.log(`P1 missing:  ${queue.summary.p1_missing}`)
  console.log(`Sprint batches (from sprint-6): ${queue.summary.sprint_batches}`)
  console.log(`\nJSON: ${OUT}`)
  console.log(`Doc:  ${DOC}`)
}

main()
