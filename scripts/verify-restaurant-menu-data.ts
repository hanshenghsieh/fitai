#!/usr/bin/env npx tsx
/**
 * Restaurant + menu data verification for BetterBit.
 * Run: npm run verify:restaurant-menu
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { eatOutMenu } from '../src/lib/convenience-store-menu'
import {
  auditRestaurantMenuData,
  mergeMenuSources,
  type AllowlistFile,
} from '../src/lib/nutrition/restaurant-menu-audit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadJson<T>(rel: string): T {
  const full = path.join(ROOT, rel)
  return JSON.parse(fs.readFileSync(full, 'utf8')) as T
}

function main() {
  const allowlist = loadJson<AllowlistFile>('data/food-kb/top300-allowlist.json')
  let bulk: typeof eatOutMenu = []
  try {
    bulk = loadJson<typeof eatOutMenu>('data/food-kb/dice-menu-bulk.json')
  } catch {
    console.warn('⚠ dice-menu-bulk.json not found — auditing core menu only')
  }

  const coreAudit = auditRestaurantMenuData(eatOutMenu, allowlist)
  const fullMenu = mergeMenuSources(eatOutMenu, bulk)
  const fullAudit = auditRestaurantMenuData(fullMenu, allowlist)

  const reportPath = path.join(ROOT, 'docs/RESTAURANT_MENU_DATA_REPORT.md')
  const lines: string[] = [
    '# BetterBit Restaurant & Menu Data Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Data sources',
    '',
    '| Source | Role |',
    '|--------|------|',
    '| `src/lib/convenience-store-menu.ts` | Runtime core menu (eatOutMenu) |',
    '| `data/food-kb/dice-menu-bulk.json` | Bulk variants merged at runtime |',
    '| `data/food-kb/top300-allowlist.json` | Canonical 600-restaurant list |',
    '| Supabase `kb_food_items` | Pipeline mirror — **not used at runtime** |',
    '',
    '## Summary (core menu only)',
    '',
    formatStats(coreAudit),
    '',
    '## Summary (core + bulk)',
    '',
    formatStats(fullAudit),
    '',
    '## Restaurants without menu (allowlist, core only)',
    '',
    ...formatList(coreAudit.restaurantsWithoutMenu, 50),
    '',
    '## Restaurants with fewer than 3 items (core only)',
    '',
    ...formatList(coreAudit.restaurantsWithFewerThan3Items, 80),
    '',
    '## Stores in menu but NOT in 600 allowlist (core only)',
    '',
    ...formatList(coreAudit.storesInMenuNotInAllowlist, 80),
    '',
    '## Items missing nutrition (core, first 30)',
    '',
    ...coreAudit.itemsMissingNutrition.slice(0, 30).map(
      i => `- \`${i.id}\` @ ${i.store} — missing: ${i.missing.join(', ')}`
    ),
    '',
    '## Answers',
    '',
    `1. **Restaurant total (allowlist):** ${fullAudit.restaurantTotal}`,
    `2. **Menu items total (core + bulk):** ${fullAudit.menuItemTotal}`,
    `3. **Restaurants with zero menu:** ${fullAudit.restaurantsWithoutMenuCount}`,
    `4. **See list above** for restaurants without menu_items`,
    `5. **Avg items per restaurant (with menu):** ${fullAudit.avgItemsPerRestaurant}`,
    `6. **Restaurants with <3 items:** ${fullAudit.restaurantsWithFewerThan3Items.length}`,
    `7. **Menu items without store:** ${fullAudit.orphanMenuItemsNoStore}`,
    `8. **Stores not in allowlist:** ${fullAudit.orphanMenuItemsUnknownStore} unique store names`,
    `9. **Duplicate restaurant names in allowlist:** ${fullAudit.duplicateRestaurantNames.length}`,
    `10. **Items missing nutrition fields:** ${fullAudit.itemsMissingNutrition.length}`,
    '',
  ]

  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')

  console.log('=== BetterBit Restaurant & Menu Verification ===\n')
  console.log('CORE MENU')
  printConsole(coreAudit)
  console.log('\nCORE + BULK')
  printConsole(fullAudit)
  console.log(`\nFull report: ${reportPath}`)
}

function formatStats(audit: ReturnType<typeof auditRestaurantMenuData>): string {
  return [
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Restaurant total (allowlist) | ${audit.restaurantTotal} |`,
    `| Menu items total | ${audit.menuItemTotal} |`,
    `| Restaurants without menu | ${audit.restaurantsWithoutMenuCount} |`,
    `| Avg items / restaurant (with menu) | ${audit.avgItemsPerRestaurant} |`,
    `| Restaurants with <3 items | ${audit.restaurantsWithFewerThan3Items.length} |`,
    `| Items missing store | ${audit.orphanMenuItemsNoStore} |`,
    `| Stores not in allowlist | ${audit.storesInMenuNotInAllowlist.length} |`,
    `| Items missing nutrition | ${audit.itemsMissingNutrition.length} |`,
  ].join('\n')
}

function formatList(items: string[], max: number): string[] {
  if (!items.length) return ['_None_']
  const shown = items.slice(0, max)
  const rest = items.length - shown.length
  return [...shown.map(s => `- ${s}`), ...(rest > 0 ? [`- … and ${rest} more`] : [])]
}

function printConsole(audit: ReturnType<typeof auditRestaurantMenuData>) {
  console.log(`  Restaurants (allowlist): ${audit.restaurantTotal}`)
  console.log(`  Menu items: ${audit.menuItemTotal}`)
  console.log(`  No menu: ${audit.restaurantsWithoutMenuCount}`)
  console.log(`  Avg items/restaurant: ${audit.avgItemsPerRestaurant}`)
  console.log(`  <3 items: ${audit.restaurantsWithFewerThan3Items.length}`)
  console.log(`  Missing nutrition: ${audit.itemsMissingNutrition.length}`)
  console.log(`  Not in allowlist: ${audit.storesInMenuNotInAllowlist.length}`)
}

main()
