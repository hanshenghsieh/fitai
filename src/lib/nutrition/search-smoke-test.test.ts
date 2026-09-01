import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { searchFoodMenu } from '@/lib/food-search'
import { SEARCH_SMOKE_TEST_QUERIES } from './search-smoke-test-queries'

describe('high-frequency Taiwan food/drink search smoke test', () => {
  it('the query set is de-duplicated and non-trivial', () => {
    const queries = SEARCH_SMOKE_TEST_QUERIES.map(q => `${q.category}:${q.query}`)
    assert.equal(new Set(queries).size, queries.length, 'no duplicate (category, query) pairs')
    assert.ok(SEARCH_SMOKE_TEST_QUERIES.length >= 80, 'expected a representative-sized set (80-150 queries)')
  })

  for (const { query, category, expected } of SEARCH_SMOKE_TEST_QUERIES) {
    it(`[${category}] "${query}" → ${expected}`, () => {
      const hits = searchFoodMenu(query, 6)
      if (expected === 'searchable') {
        assert.ok(
          hits.length > 0,
          `"${query}" was searchable and must not silently regress to zero results — if this is now a deliberate, verified gap, update its \`expected\` in search-smoke-test-queries.ts with a note explaining why`
        )
      }
      // known_coverage_gap queries are intentionally NOT asserted to keep
      // failing — that would make a real fix invisible. They exist so the
      // gap is documented and coverage-scored, not to lock in the absence.
    })
  }
})
