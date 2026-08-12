import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { collectClientCandidates, classifyClientMatchLevel } from './matcher-core'
import { resolveAliasQuery } from '@/lib/nutrition/alias-engine'
import { normalizeFoodName } from '@/lib/food-kb/normalize'

/**
 * Build 36 — regression tests for 3 known nutrition-matching issues,
 * written and confirmed failing against the Build 35 code BEFORE any fix
 * was applied (see the conversation record / commit history for the
 * pre-fix failure output). Each root cause is a real, traced mechanism,
 * not a guess:
 *
 * A. 蛋餅 — a curated alias ("玉米起司蛋餅", a substring-suffix of a specific
 *    7-11/美而美 product) matches the bare category query "蛋餅" with no
 *    coverage-ratio guard (only `kind === 'official'` rows were guarded,
 *    not `kind === 'alias'`), so a 2-char category name gets swallowed by
 *    a 6-char specific product name at 98% confidence.
 *
 * B. 御飯糰/飯糰 — NOT a data gap. convenience-store-menu.ts has 193 real
 *    rice-ball products (e.g. "御飯糰-鮭魚"). The bare category query
 *    normalizes to a 2-char token ("飯糰") that IS a genuine prefix of
 *    those product names, but the existing coverage-ratio scoring treats
 *    prefix and buried-middle substrings identically, so the score (43)
 *    falls just under the runtime-menu search filter (>=45) and the query
 *    surfaces zero candidates instead of a lower-confidence "pick a
 *    flavor" result.
 *
 * C. 地瓜 — two independent bugs stack:
 *    C1. normalize.ts's SYNONYM_GROUPS wrongly lists '地瓜球' (sweet potato
 *        balls), '甜不辣' (tempura), and '雞排' (fried chicken cutlet) as
 *        synonyms of each other — three unrelated foods. This makes every
 *        "雞排"-family alias normalize through "地瓜球", which is a
 *        substring of "地瓜"'s own normalized form's superset, letting
 *        "地瓜" alias-match "雞排" itself.
 *    C2. food-menu-lookup.ts's searchFoodKb takes
 *        `Math.max(row.confidence, score/100)` as the final hit
 *        confidence — so even when the correctly-low name-match score
 *        (41, appropriately below the 0.8 coverage threshold) says "we
 *        are not sure", the row's own *data-quality* confidence
 *        (row.confidence, ~0.95 for a well-sourced but WRONG item) papers
 *        over it and reports 95% match confidence for "小菜籃有機地瓜葉"
 *        (an unrelated leafy-green product) against a bare "地瓜" query.
 */

describe('Build 36 — Issue A: 蛋餅 must not be swallowed by a specific product alias', () => {
  it('root cause: "玉米起司蛋餅" is a curated alias of a specific 7-11/美而美 product, and "蛋餅" (2 chars) is only 33% of its length', () => {
    const hit = resolveAliasQuery('蛋餅', {})
    // Documents the mechanism regardless of pass/fail state below.
    if (hit) {
      assert.equal(hit.official_name, '美而美玉米起司蛋餅')
    }
  })

  it('"蛋餅" must not resolve with Level A / high confidence to one specific branded product', () => {
    const candidates = collectClientCandidates('蛋餅')
    const result = classifyClientMatchLevel('蛋餅', candidates)
    assert.notEqual(
      result.best?.name,
      '美而美玉米起司蛋餅',
      '"蛋餅" is a generic category — it must not confidently resolve to one specific branded variant'
    )
  })
})

describe('Build 36 — Issue B: 御飯糰/飯糰 must surface real product candidates, not Level C', () => {
  it('convenience-store-menu.ts genuinely has rice-ball products (this is NOT a data gap)', () => {
    const fs = require('node:fs') as typeof import('node:fs')
    const source = fs.readFileSync(
      new URL('../../convenience-store-menu.ts', import.meta.url),
      'utf8'
    )
    const riceballCount = (source.match(/御飯糰/g) ?? []).length
    assert.ok(riceballCount > 20, `expected many 御飯糰 product rows, found ${riceballCount}`)
  })

  it('"御飯糰" must surface at least one real candidate (not Level C / zero candidates)', () => {
    const candidates = collectClientCandidates('御飯糰')
    assert.ok(candidates.length > 0, 'expected at least one rice-ball candidate, got zero')
  })

  it('"飯糰" must surface at least one real candidate (not Level C / zero candidates)', () => {
    const candidates = collectClientCandidates('飯糰')
    assert.ok(candidates.length > 0, 'expected at least one rice-ball candidate, got zero')
  })
})

describe('Build 36 — Issue C: 地瓜 must not resolve to unrelated products', () => {
  it('root cause C1: normalize.ts must not group 地瓜球/甜不辣/雞排 as synonyms (three different foods)', () => {
    const chickenCutlet = normalizeFoodName('雞排')
    assert.notEqual(
      chickenCutlet,
      normalizeFoodName('地瓜球'),
      '雞排 (fried chicken cutlet) and 地瓜球 (sweet potato balls) are different foods and must not normalize to the same token'
    )
  })

  it('"地瓜" must not alias-resolve to 雞排 (fried chicken cutlet — an unrelated food)', () => {
    const hit = resolveAliasQuery('地瓜', {})
    assert.notEqual(hit?.official_name, '雞排')
  })

  it('root cause C2: a weak name-match score must not be overridden by the target row\'s own data-quality confidence', () => {
    const candidates = collectClientCandidates('地瓜')
    const wrongMatch = candidates.find(c => c.name === '小菜籃有機地瓜葉')
    if (wrongMatch) {
      assert.ok(
        wrongMatch.match_score < 55,
        `a weak/wrong name match must not be reported as high confidence, got score ${wrongMatch.match_score}`
      )
    }
  })

  it('"地瓜" must not resolve with Level A / high confidence to "小菜籃有機地瓜葉" (unrelated leafy-green product)', () => {
    const candidates = collectClientCandidates('地瓜')
    const result = classifyClientMatchLevel('地瓜', candidates)
    assert.notEqual(result.best?.name, '小菜籃有機地瓜葉')
  })
})
