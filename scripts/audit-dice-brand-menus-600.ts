#!/usr/bin/env npx tsx
/**
 * 600-brand dice menu completeness audit.
 * Run: npm run audit:dice-brands
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { eatOutMenu } from '../src/lib/convenience-store-menu'
import { mergeMenuSources, type AllowlistFile } from '../src/lib/nutrition/restaurant-menu-audit'
import {
  auditDiceBrandMenus,
  DICE_BRAND_MENU_TARGET,
} from '../src/lib/nutrition/dice-brand-menu-audit'
import { rebuildDiceStoreVariantIndex } from '../src/lib/dice-store-aliases'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T
}

function pct(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 1000) / 10}%` : '0%'
}

function main() {
  const allowlist = loadJson<AllowlistFile>('data/food-kb/food-source-allowlist.json')
  let bulk: typeof eatOutMenu = []
  try {
    bulk = loadJson<typeof eatOutMenu>('data/food-kb/dice-menu-bulk.json')
  } catch {
    console.warn('⚠ dice-menu-bulk.json not found — auditing core menu only')
  }

  const fullMenu = mergeMenuSources(eatOutMenu, bulk)
  rebuildDiceStoreVariantIndex(fullMenu)

  const coreAudit = auditDiceBrandMenus(eatOutMenu, allowlist)
  const fullAudit = auditDiceBrandMenus(fullMenu, allowlist)

  const reportPath = path.join(ROOT, 'docs/DICE_BRAND_MENU_AUDIT_600.md')
  const jsonPath = path.join(ROOT, 'data/food-kb/dice-brand-menu-audit.json')

  const incomplete = fullAudit.brands.filter(b => b.status !== 'complete')
  const missing = fullAudit.brands.filter(b => b.status === 'missing')
  const partial = fullAudit.brands.filter(b => b.status === 'partial')
  const sparse = fullAudit.brands.filter(b => b.status === 'sparse')
  const complete = fullAudit.brands.filter(b => b.status === 'complete')

  const lines: string[] = [
    '# 600 品牌骰子菜單完整度稽核',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## 判定標準（complete）',
    '',
    '- 品項數 ≥ ' + String(DICE_BRAND_MENU_TARGET),
    '- 營養四欄位完整 ≥ ' + String(DICE_BRAND_MENU_TARGET),
    '- 骰子可推主餐 ≥ 3（isDiceRecommendable + 主餐判定）',
    '',
    '## 總覽（core + bulk，600 品牌）',
    '',
    '| 狀態 | 家數 | 比例 |',
    '|------|------|------|',
    '| complete | ' + fullAudit.complete_count + ' | ' + pct(fullAudit.complete_count, fullAudit.brand_total) + ' |',
    '| partial | ' + fullAudit.partial_count + ' | ' + pct(fullAudit.partial_count, fullAudit.brand_total) + ' |',
    '| sparse (<3) | ' + fullAudit.sparse_count + ' | ' + pct(fullAudit.sparse_count, fullAudit.brand_total) + ' |',
    '| missing (0) | ' + fullAudit.missing_count + ' | ' + pct(fullAudit.missing_count, fullAudit.brand_total) + ' |',
    '| split store names | ' + fullAudit.split_store_brands + ' | — |',
    '',
    '## Core only vs Core+bulk',
    '',
    '| 指標 | Core | Core+Bulk |',
    '|------|------|-----------|',
    `| complete | ${coreAudit.complete_count} | ${fullAudit.complete_count} |`,
    `| missing | ${coreAudit.missing_count} | ${fullAudit.missing_count} |`,
    `| menu items | ${coreAudit.summary.menuItemTotal} | ${fullAudit.summary.menuItemTotal} |`,
    '',
    '## 無菜單（missing）',
    '',
    ...(missing.length
      ? missing.map(b => `- ${b.rank}. **${b.canonical_name}** (${b.seed_priority})`)
      : ['_無_']),
    '',
    '## 極少品項（sparse）',
    '',
    ...(sparse.length
      ? sparse.slice(0, 80).map(b => `- ${b.rank}. **${b.canonical_name}** — ${b.item_count} 品項`)
      : ['_無_']),
    ...(sparse.length > 80 ? [`- … 另有 ${sparse.length - 80} 家`] : []),
    '',
    '## 待補強（partial，前 60 家）',
    '',
    ...(partial.length
      ? partial.slice(0, 60).map(b => `- ${b.rank}. **${b.canonical_name}** — ${b.item_count} 品項 · ${b.issues.join('；')}`)
      : ['_無_']),
    ...(partial.length > 60 ? [`- … 另有 ${partial.length - 60} 家`] : []),
    '',
    '## 已完善（complete，前 40 家）',
    '',
    ...(complete.length
      ? complete.slice(0, 40).map(
          b =>
            `- ${b.rank}. **${b.canonical_name}** — ${b.item_count} 品項 · 骰子主餐 ${b.dice_recommendable_main_count}`
        )
      : ['_無_']),
    ...(complete.length > 40 ? [`- … 另有 ${complete.length - 40} 家`] : []),
    '',
    '## 引擎設定',
    '',
    '- 店名合併：`dice-store-aliases.ts` ← allowlist `search_aliases`（600 品牌）',
    '- 骰子推薦門檻：`menu-confidence-runtime` `dice` 模式',
    '- 候選生成：每家店掃全部主餐（`meal-suggest` path F）',
    '',
  ]

  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        target_items_per_brand: DICE_BRAND_MENU_TARGET,
        full: {
          complete: fullAudit.complete_count,
          partial: fullAudit.partial_count,
          sparse: fullAudit.sparse_count,
          missing: fullAudit.missing_count,
          split_store: fullAudit.split_store_brands,
        },
        incomplete_brands: incomplete.map(b => ({
          rank: b.rank,
          canonical_name: b.canonical_name,
          status: b.status,
          item_count: b.item_count,
          issues: b.issues,
        })),
      },
      null,
      2
    ),
    'utf8'
  )

  console.log('=== 600-brand dice menu audit ===\n')
  console.log(`Complete: ${fullAudit.complete_count} / ${fullAudit.brand_total}`)
  console.log(`Partial:  ${fullAudit.partial_count}`)
  console.log(`Sparse:   ${fullAudit.sparse_count}`)
  console.log(`Missing:  ${fullAudit.missing_count}`)
  console.log(`Split store names: ${fullAudit.split_store_brands}`)
  console.log(`\nReport: ${reportPath}`)
  console.log(`JSON:   ${jsonPath}`)
}

main()
