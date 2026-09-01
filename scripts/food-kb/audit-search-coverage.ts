#!/usr/bin/env npx tsx
/**
 * Coverage score for the high-frequency Taiwan food/drink search smoke
 * test — a product-facing metric ("can a normal user find what they
 * actually search for"), distinct from raw catalog size or the nutrition-
 * integrity audit's pass/fail counts.
 *
 * Usage: npx tsx scripts/food-kb/audit-search-coverage.ts
 */
import { searchFoodMenu } from '@/lib/food-search'
import { SEARCH_SMOKE_TEST_QUERIES, type SmokeTestCategory } from '@/lib/nutrition/search-smoke-test-queries'

function main() {
  const byCategory = new Map<SmokeTestCategory, { total: number; searchable: number }>()
  let totalSearchable = 0

  for (const { query, category } of SEARCH_SMOKE_TEST_QUERIES) {
    const hits = searchFoodMenu(query, 6)
    const searchable = hits.length > 0
    if (searchable) totalSearchable++

    const stat = byCategory.get(category) ?? { total: 0, searchable: 0 }
    stat.total++
    if (searchable) stat.searchable++
    byCategory.set(category, stat)
  }

  const total = SEARCH_SMOKE_TEST_QUERIES.length
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0)

  console.log(`# Search Coverage Report\n`)
  console.log(`Overall coverage: ${totalSearchable}/${total} (${pct(totalSearchable, total)}%)\n`)
  console.log(`| Category | Searchable | Total | Coverage |`)
  console.log(`|---|---|---|---|`)
  for (const [cat, stat] of [...byCategory.entries()].sort()) {
    console.log(`| ${cat} | ${stat.searchable} | ${stat.total} | ${pct(stat.searchable, stat.total)}% |`)
  }
}

main()
