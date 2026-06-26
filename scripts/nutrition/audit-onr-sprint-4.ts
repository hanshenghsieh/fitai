#!/usr/bin/env npx tsx
/** Audit ONR coverage for Sprint 4 brands — no writes, report only. */
import fs from 'fs'
import path from 'path'
import { loadAllOfficialReferences } from '@/lib/nutrition/official-reference/loader'

const BRANDS_PATH = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'sprint-4', 'brands.json')
const REPORT_OUT = path.join(process.cwd(), 'docs', 'ONR_SPRINT_4_PENDING.md')

function main() {
  const { brands } = JSON.parse(fs.readFileSync(BRANDS_PATH, 'utf8')) as {
    brands: Array<{ canonical_name: string; sprint4_theme?: string; nutrition_source_url?: string | null }>
  }
  const onr = loadAllOfficialReferences()
  const onrNames = new Set(onr.map(r => r.metadata.canonical_name))

  const lines = [
    '# ONR Sprint 4 — Pending Official Nutrition',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '> Zero Hallucination: no ONR entry without traceable official nutrition per item.',
    '',
    '## Status',
    '',
    '| Brand | Theme | ONR | Official URL | Blocker |',
    '|-------|-------|-----|--------------|---------|',
  ]

  let withOnr = 0
  for (const b of brands) {
    const has = onrNames.has(b.canonical_name)
    if (has) withOnr++
    const blocker = has
      ? '—'
      : b.sprint4_theme === 'hotpot'
        ? '官網無公開營養成分表'
        : '待人工擷取官方營養頁'
    lines.push(
      `| ${b.canonical_name} | ${b.sprint4_theme ?? '—'} | ${has ? '✅' : '❌'} | ${b.nutrition_source_url ?? '—'} | ${blocker} |`
    )
  }

  lines.push(
    '',
    '## Summary',
    '',
    `- Sprint 4 brands: **${brands.length}**`,
    `- ONR covered: **${withOnr}**`,
    `- Pending manual ONR: **${brands.length - withOnr}**`,
    '',
    '## Manual collection checklist (per brand)',
    '',
    '1. Locate official nutrition PDF/page (priority A)',
    '2. Add `data/food-kb/official-reference/{brand_id}.json`',
    '3. Update `index.json`',
    '4. `npm run onr:coverage`',
    '5. `npm run backfill:sprint-4`',
    '',
    '## Hotpot priority (P0)',
    '',
    '辛殿麻辣鍋 · 無老鍋 · 老四川 · 肉多多 · 鼎王 · 石二鍋 · 這一鍋 · 馬辣',
    ''
  )

  fs.writeFileSync(REPORT_OUT, lines.join('\n'))
  console.log(`\nONR Sprint 4 audit: ${withOnr}/${brands.length} covered`)
  console.log(`Report: ${REPORT_OUT}\n`)
}

main()
