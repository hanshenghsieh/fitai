import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { searchFoodMenu } from '@/lib/food-search'
import { resolveFreeTextMealClient } from '@/lib/nutrition/search-v2/client-resolve'

export type Top100Expectation =
  | { mode: 'search'; minHits?: number; topCaloriesMin?: number; topNameIncludes?: string }
  | { mode: 'unknown'; textAction: 'create_unknown' }
  | { mode: 'clarify'; textAction: 'clarify' }

export interface Top100Term {
  id: string
  query: string
  category: string
  expect: Top100Expectation
}

export interface Top100Fixture {
  version: string
  description: string
  terms: Top100Term[]
}

export interface Top100TermResult {
  id: string
  query: string
  category: string
  pass: boolean
  failures: string[]
  searchHits?: number
  topName?: string
  topCalories?: number
  textAction?: string
}

let cachedFixture: Top100Fixture | null = null

export function loadTop100Fixture(): Top100Fixture {
  if (cachedFixture) return cachedFixture
  const path = join(process.cwd(), 'data/nutrition/top100-search-terms.json')
  cachedFixture = JSON.parse(readFileSync(path, 'utf8')) as Top100Fixture
  return cachedFixture
}

export function evaluateTop100Term(term: Top100Term): Top100TermResult {
  const failures: string[] = []
  const searchHits = searchFoodMenu(term.query, 8)
  const top = searchHits[0]
  const text = resolveFreeTextMealClient(term.query)

  if (term.expect.mode === 'search') {
    const minHits = term.expect.minHits ?? 1
    if (searchHits.length < minHits) {
      failures.push(`search: expected ≥${minHits} hits, got ${searchHits.length}`)
    }
    const calMin = term.expect.topCaloriesMin ?? 1
    if (top && top.calories < calMin) {
      failures.push(`search: top calories ${top.calories} < ${calMin}`)
    }
    if (term.expect.topNameIncludes && top && !top.name.includes(term.expect.topNameIncludes)) {
      failures.push(`search: top name "${top.name}" missing "${term.expect.topNameIncludes}"`)
    }
    if (text.action === 'create_unknown' && text.payload.calories === 0) {
      failures.push('text: resolved as unknown with zero macros')
    }
  }

  if (term.expect.mode === 'unknown') {
    if (text.action !== term.expect.textAction) {
      failures.push(`text: expected ${term.expect.textAction}, got ${text.action}`)
    }
    if (text.payload.calories != null && text.payload.calories > 0) {
      failures.push('text: unknown must not invent calories')
    }
  }

  if (term.expect.mode === 'clarify') {
    if (text.action !== 'clarify') {
      failures.push(`text: expected clarify, got ${text.action}`)
    }
  }

  return {
    id: term.id,
    query: term.query,
    category: term.category,
    pass: failures.length === 0,
    failures,
    searchHits: searchHits.length,
    topName: top?.name,
    topCalories: top?.calories,
    textAction: text.action,
  }
}

export function runTop100FoodLogQa(): Top100TermResult[] {
  return loadTop100Fixture().terms.map(evaluateTop100Term)
}

export function summarizeTop100Results(results: Top100TermResult[]) {
  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass)
  const byCategory = new Map<string, { pass: number; total: number }>()
  for (const r of results) {
    const row = byCategory.get(r.category) ?? { pass: 0, total: 0 }
    row.total += 1
    if (r.pass) row.pass += 1
    byCategory.set(r.category, row)
  }
  return { passed, total: results.length, failed, byCategory }
}
