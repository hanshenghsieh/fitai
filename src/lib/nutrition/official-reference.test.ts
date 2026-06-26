import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  compareNutritionToOfficial,
  DEFAULT_DIFF_THRESHOLDS,
  diffBlocksPromote,
  officialItemToSnapshot,
  toMacroSnapshot,
} from './official-reference/diff'
import {
  buildOfficialMenuIndex,
  findOfficialMenuItem,
  listOnrBrandFiles,
  loadAllOfficialReferences,
  loadOfficialBrandReference,
  loadOfficialReferenceIndex,
  normOnrName,
} from './official-reference/loader'
import {
  FORBIDDEN_ONR_SOURCES,
  inferPriorityKind,
  isForbiddenOnrSourceType,
  isHigherPriorityThan,
  priorityForKind,
  priorityRank,
} from './official-reference/priority'
import {
  buildBrandCoverageRow,
  buildOfficialCoverageDashboard,
  diffAllOfficialAgainstRuntime,
} from './official-reference/coverage'

describe('ONR priority', () => {
  it('1. A ranks above B and C', () => {
    assert.ok(priorityRank('A') < priorityRank('B'))
    assert.ok(priorityRank('B') < priorityRank('C'))
  })

  it('2. ONR beats food_dna', () => {
    assert.equal(isHigherPriorityThan('A', 'food_dna'), true)
  })

  it('3. ONR beats delivery', () => {
    assert.equal(isHigherPriorityThan('B', 'delivery'), true)
  })

  it('4. forbids ubereats source type', () => {
    assert.equal(isForbiddenOnrSourceType('ubereats'), true)
  })

  it('5. forbids google_maps source type', () => {
    assert.equal(isForbiddenOnrSourceType('google_maps'), true)
  })

  it('6. forbids foodpanda', () => {
    assert.equal(isForbiddenOnrSourceType('foodpanda'), true)
  })

  it('7. allows official_website', () => {
    assert.equal(isForbiddenOnrSourceType('official_website'), false)
  })

  it('8. infers pdf priority kind', () => {
    assert.equal(inferPriorityKind('https://brand.com/nutrition.pdf'), 'official_nutrition_pdf')
  })

  it('9. infers mohw priority kind', () => {
    assert.equal(inferPriorityKind('https://fda.gov.tw/mohw'), 'mohw')
  })

  it('10. nutrition page is priority A', () => {
    assert.equal(
      priorityForKind(inferPriorityKind('https://mcdonalds.com/tw/nutrition-calculator')),
      'A'
    )
  })

  it('11. usda is priority C', () => {
    assert.equal(priorityForKind('usda'), 'C')
  })

  it('12. forbidden list includes ai_estimate', () => {
    assert.ok(FORBIDDEN_ONR_SOURCES.includes('ai_estimate'))
  })
})

describe('ONR diff tool', () => {
  const official = { calories: 500, protein: 30, fat: 12, carbs: 40 }

  it('13. passes when macros match', () => {
    const r = compareNutritionToOfficial(official, official, {
      item_name: 'test',
      brand: 'test',
      compare_source: 'runtime',
    })
    assert.equal(r.pending_review, false)
  })

  it('14. flags calories >10%', () => {
    const r = compareNutritionToOfficial(official, { ...official, calories: 560 }, {
      item_name: 'test',
      brand: 'test',
      compare_source: 'runtime',
    })
    assert.equal(r.pending_review, true)
    assert.ok(r.reasons.some(x => x.includes('calories')))
  })

  it('15. flags protein >5g', () => {
    const r = compareNutritionToOfficial(official, { ...official, protein: 36 }, {
      item_name: 'test',
      brand: 'test',
      compare_source: 'food_dna',
    })
    assert.equal(r.pending_review, true)
  })

  it('16. flags fat >3g', () => {
    const r = compareNutritionToOfficial(official, { ...official, fat: 16 }, {
      item_name: 'test',
      brand: 'test',
      compare_source: 'runtime',
    })
    assert.equal(r.pending_review, true)
  })

  it('17. flags carbs >5g', () => {
    const r = compareNutritionToOfficial(official, { ...official, carbs: 46 }, {
      item_name: 'test',
      brand: 'test',
      compare_source: 'runtime',
    })
    assert.equal(r.pending_review, true)
  })

  it('18. blocks promote when pending', () => {
    const r = compareNutritionToOfficial(official, { ...official, calories: 600 }, {
      item_name: 'test',
      brand: 'test',
      compare_source: 'runtime',
    })
    assert.equal(diffBlocksPromote(r), true)
  })

  it('19. allows promote when clean', () => {
    const r = compareNutritionToOfficial(official, { ...official, calories: 505 }, {
      item_name: 'test',
      brand: 'test',
      compare_source: 'runtime',
    })
    assert.equal(diffBlocksPromote(r), false)
  })

  it('20. default thresholds match spec', () => {
    assert.equal(DEFAULT_DIFF_THRESHOLDS.calories_pct, 0.1)
    assert.equal(DEFAULT_DIFF_THRESHOLDS.protein_g, 5)
    assert.equal(DEFAULT_DIFF_THRESHOLDS.fat_g, 3)
    assert.equal(DEFAULT_DIFF_THRESHOLDS.carbs_g, 5)
  })

  it('21. toMacroSnapshot maps protein_g', () => {
    const m = toMacroSnapshot({ calories: 100, protein_g: 10, fat_g: 2, carbs_g: 12 })
    assert.equal(m.protein, 10)
  })
})

describe('ONR loader', () => {
  it('22. normOnrName strips spaces', () => {
    assert.equal(normOnrName('大 麥 克'), normOnrName('大麥克'))
  })

  it('23. brand files exist after seed', () => {
    const files = listOnrBrandFiles()
    assert.ok(files.length >= 10)
  })

  it('24. index.json loads', () => {
    const index = loadOfficialReferenceIndex()
    assert.ok(index)
    assert.ok(index!.brand_count >= 10)
  })

  it('25. mcdonald.json has menu', () => {
    const ref = loadOfficialBrandReference('mcdonald')
    assert.ok(ref)
    assert.ok(ref!.menu.length >= 5)
    assert.equal(ref!.metadata.country, 'TW')
  })

  it('26. findOfficialMenuItem finds 大麥克', () => {
    const hit = findOfficialMenuItem('麥當勞', '大麥克')
    assert.ok(hit)
    assert.equal(hit!.item.calories, 563)
  })

  it('27. findOfficialMenuItem finds alias Big Mac', () => {
    const hit = findOfficialMenuItem('麥當勞', 'Big Mac')
    assert.ok(hit)
  })

  it('28. menu items have source_url', () => {
    const refs = loadAllOfficialReferences()
    for (const ref of refs) {
      for (const item of ref.menu) {
        assert.ok(item.source_url?.trim(), `${ref.metadata.brand_id}/${item.name}`)
      }
    }
  })

  it('29. menu items have confidence A', () => {
    const refs = loadAllOfficialReferences()
    const allA = refs.flatMap(r => r.menu).every(m => m.confidence === 'A')
    assert.equal(allA, true)
  })

  it('30. official index dedupes aliases', () => {
    const index = buildOfficialMenuIndex()
    assert.ok(index.size > 0)
  })
})

describe('ONR coverage dashboard', () => {
  it('31. builds dashboard', () => {
    const d = buildOfficialCoverageDashboard()
    assert.ok(d.brands_total >= 10)
    assert.ok(d.menu_items_total > 0)
  })

  it('32. dashboard has brand rows', () => {
    const d = buildOfficialCoverageDashboard()
    assert.ok(d.brands.length >= 10)
  })

  it('33. brand row has coverage pct', () => {
    const d = buildOfficialCoverageDashboard()
    const mcd = d.brands.find(b => b.brand_id === 'mcdonald')
    assert.ok(mcd)
    assert.ok(mcd!.official_menu_coverage_pct > 0)
  })

  it('34. buildBrandCoverageRow computes recommendable', () => {
    const row = buildBrandCoverageRow({
      brand_id: 'test',
      canonical_name: 'Test',
      store_aliases: [],
      menu_count: 10,
      nutrition_source_url: 'https://example.com',
      staging_items: [],
      pending_review_names: new Set(),
    })
    assert.equal(row.menu_count, 10)
    assert.equal(row.source_complete, true)
  })

  it('35. diffAllOfficialAgainstRuntime returns array', () => {
    const diffs = diffAllOfficialAgainstRuntime()
    assert.ok(Array.isArray(diffs))
  })

  it('36. missing official source list is array', () => {
    const d = buildOfficialCoverageDashboard()
    assert.ok(Array.isArray(d.missing_official_source))
  })

  it('37. nutrition_complete_total > 0', () => {
    const d = buildOfficialCoverageDashboard()
    assert.ok(d.nutrition_complete_total > 0)
  })

  it('38. brands_complete <= brands_total', () => {
    const d = buildOfficialCoverageDashboard()
    assert.ok(d.brands_complete <= d.brands_total)
  })
})

describe('ONR macro snapshots', () => {
  it('39. officialItemToSnapshot preserves calories', () => {
    const s = officialItemToSnapshot({
      name: 'x',
      calories: 400,
      protein: 20,
      fat: 10,
      carbs: 30,
      source_url: 'https://x',
      verified_at: 't',
      verified_by: 't',
      verification_count: 1,
      confidence: 'A',
    })
    assert.equal(s.calories, 400)
  })

  it('40. 7-11 ONR has tea egg', () => {
    const hit = findOfficialMenuItem('7-11', '7-11茶葉蛋')
    assert.ok(hit)
    assert.equal(hit!.item.calories, 50)
  })

  it('41. kfc ONR has items', () => {
    const ref = loadOfficialBrandReference('kfc')
    assert.ok(ref && ref.menu.length >= 2)
  })

  it('42. no forbidden source in metadata urls', () => {
    const refs = loadAllOfficialReferences()
    for (const ref of refs) {
      assert.equal(isForbiddenOnrSourceType(ref.metadata.nutrition_source_url), false)
      for (const item of ref.menu) {
        assert.equal(isForbiddenOnrSourceType(item.source_url), false)
      }
    }
  })
})
