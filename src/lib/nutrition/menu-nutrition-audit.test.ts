import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { isRuntimeSearchable, clearMenuConfidenceCache } from './menu-confidence-runtime'
import {
  auditItem,
  classifyFailureReasons,
  detectSuspiciousDuplicateTuples,
  isNutritionCorrupted,
  runAudit,
} from './menu-nutrition-audit'

function makeItem(overrides: Partial<ConvenienceItem> & { id: string; name: string }): ConvenienceItem {
  return {
    store: '測試品牌',
    source: 'chain',
    category: 'lunch',
    role: 'drink',
    portionable: false,
    tags: [],
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    price: 30,
    photo_url: '',
    description: '連鎖餐廳營養參考',
    ...overrides,
  }
}

describe('isNutritionCorrupted — severe energy mismatch', () => {
  it('rejects a severe calorie/macro mismatch (326 kcal implied vs 80 declared)', () => {
    const item = makeItem({ id: 'a', name: '測試飲料', calories: 80, protein_g: 3, carbs_g: 38, fat_g: 18 })
    assert.equal(isNutritionCorrupted(item), true)
  })

  it('accepts a plausible, internally-consistent item', () => {
    const item = makeItem({ id: 'b', name: '測試飲料', calories: 180, protein_g: 0, carbs_g: 40, fat_g: 0 })
    assert.equal(isNutritionCorrupted(item), false)
  })
})

describe('isNutritionCorrupted — implausible beverage protein', () => {
  it('rejects a tea-like drink claiming 29g protein', () => {
    const item = makeItem({ id: 'c', name: '冬瓜茶', role: 'drink', calories: 115, protein_g: 29, carbs_g: 0, fat_g: 0 })
    assert.equal(isNutritionCorrupted(item), true)
  })

  it('does not apply the beverage-protein check to a non-drink role', () => {
    // Energy-balanced (29g protein ≈ 116 kcal, declared 120 kcal) so only the
    // role-gated beverage-protein heuristic is under test here — the
    // heuristic must not fire outside its intended (role:'drink') scope.
    const item = makeItem({ id: 'd', name: '高蛋白食品', role: 'side', calories: 120, protein_g: 29, carbs_g: 0, fat_g: 0 })
    assert.equal(isNutritionCorrupted(item), false)
  })
})

describe('placeholder content is rejected, valid zero-calorie tea is not falsely rejected', () => {
  it('flags an item whose description carries the placeholder/pending-cross-validation marker', () => {
    const item = makeItem({
      id: 'e',
      name: '測試茶',
      description: '某品牌 · 測試茶 · 估計營養（待交叉驗證）',
      calories: 100,
      carbs_g: 25,
    })
    assert.ok(classifyFailureReasons(item).includes('placeholder_description'))
  })

  it('a genuine zero-calorie unsweetened tea is not classified as nutrition corruption', () => {
    // energyBalanceOk() can't compute a ratio against zero calories, so the
    // full gate's classifyFailureReasons() still lists 'energy_mismatch' for
    // any 0-kcal item (a separate, pre-existing gate characteristic this
    // audit does not touch or weaken) — but isNutritionCorrupted, the signal
    // this module uses to select repair candidates, correctly treats a truly
    // free item as not corrupted rather than misclassifying it.
    const item = makeItem({ id: 'f', name: '無糖綠茶', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
    assert.equal(isNutritionCorrupted(item), false)
  })
})

describe('detectSuspiciousDuplicateTuples', () => {
  it('detects a known corruption fingerprint shared across many unrelated brands', () => {
    const items: ConvenienceItem[] = []
    const names = ['冬瓜茶', '鮮奶茶', '無糖茶', '烏龍拿鐵', '仙草茶', '紅茶拿鐵', '綠茶', '奶茶']
    for (let i = 0; i < 8; i++) {
      items.push(makeItem({ id: `dup-${i}`, name: names[i]!, store: `品牌${i}`, calories: 80, protein_g: 3, carbs_g: 38, fat_g: 18 }))
    }
    const dupes = detectSuspiciousDuplicateTuples(items, { minCount: 8, minBrands: 5 })
    assert.equal(dupes.length, 1)
    assert.equal(dupes[0]!.fingerprint, '80|3|38|18')
    assert.equal(dupes[0]!.count, 8)
  })

  it('does not flag a handful of legitimately identical standardized products', () => {
    const items: ConvenienceItem[] = []
    for (let i = 0; i < 3; i++) {
      items.push(makeItem({ id: `std-${i}`, name: '御飯糰', store: `門市${i}`, calories: 210, protein_g: 6, carbs_g: 38, fat_g: 4 }))
    }
    const dupes = detectSuspiciousDuplicateTuples(items, { minCount: 8, minBrands: 5 })
    assert.equal(dupes.length, 0)
  })

  it('never flags an all-zero (unsweetened tea) fingerprint even at high volume', () => {
    const items: ConvenienceItem[] = []
    for (let i = 0; i < 20; i++) {
      items.push(makeItem({ id: `zero-${i}`, name: '無糖綠茶', store: `品牌${i}`, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }))
    }
    const dupes = detectSuspiciousDuplicateTuples(items, { minCount: 8, minBrands: 5 })
    assert.equal(dupes.length, 0)
  })

  it('requires breadth across brands, not just raw count within one brand', () => {
    const items: ConvenienceItem[] = []
    for (let i = 0; i < 10; i++) {
      items.push(makeItem({ id: `onebrand-${i}`, name: `品項${i}`, store: '單一品牌', calories: 80, protein_g: 3, carbs_g: 38, fat_g: 18 }))
    }
    const dupes = detectSuspiciousDuplicateTuples(items, { minCount: 8, minBrands: 5 })
    assert.equal(dupes.length, 0, 'ten items at one single brand is a normal shared menu template, not cross-brand corruption')
  })
})

describe('quality gate has not been weakened', () => {
  it('a severely corrupted item still fails isRuntimeSearchable (the gate itself is untouched)', () => {
    clearMenuConfidenceCache()
    const item = makeItem({ id: 'gate-check', name: '冬瓜茶', store: '清心', calories: 80, protein_g: 3, carbs_g: 38, fat_g: 18 })
    assert.equal(isRuntimeSearchable(item), false)
  })
})

describe('repaired records against the real eatOutMenu catalog', () => {
  it('every repaired 冬瓜茶 record in the live catalog passes energy-balance validation', () => {
    const dongguaItems = eatOutMenu.filter(i => i.name === '冬瓜茶')
    assert.ok(dongguaItems.length > 0, 'expected at least one 冬瓜茶 record in the catalog')
    for (const item of dongguaItems) {
      assert.equal(isNutritionCorrupted(item), false, `${item.id} should no longer be corrupted`)
    }
  })

  it('清心/老賴紅茶 冬瓜茶 keep their correct hand-verified macros specifically (regression for an id-collision repair bug)', () => {
    // A repair script in this same phase briefly re-broke these two by
    // trusting a same-id-but-unrelated record from generate-expanded-menu.mjs
    // (清心/老賴紅茶 both independently appear in that generator's brand
    // list too). Pinning the exact values so a "helpful" future repair pass
    // can't silently reintroduce the same class of mistake.
    const qingxin = eatOutMenu.find(i => i.id === '清心-冬瓜茶')
    const laolai = eatOutMenu.find(i => i.id === '老賴紅茶-冬瓜茶')
    assert.ok(qingxin && laolai)
    if (qingxin) assert.deepEqual({ p: qingxin.protein_g, c: qingxin.carbs_g, f: qingxin.fat_g }, { p: 0, c: 40, f: 0 })
    if (laolai) assert.deepEqual({ p: laolai.protein_g, c: laolai.carbs_g, f: laolai.fat_g }, { p: 0, c: 48, f: 0 })
  })

  it('unresolved Class C corruption remains blocked by the gate (not silently repaired)', () => {
    // A source-authored inconsistent bubbleteaBank() recipe (Group C, phase
    // 3 report §F) — its OWN listed calories don't balance against its own
    // listed macros even with the mapping bug fixed, so it is intentionally
    // left rejected rather than guessed at.
    const item = eatOutMenu.find(i => i.id === '50lan-珍珠奶茶-大杯')
    if (!item) return // catalog content may shift; skip rather than false-fail
    assert.equal(auditItem(item).passes_gate, false)
  })
})

describe('audit summary aggregation', () => {
  it('total equals passing + failing', () => {
    const items: ConvenienceItem[] = [
      makeItem({ id: 'ok-1', name: 'A', calories: 100, protein_g: 10, carbs_g: 10, fat_g: 2 }),
      makeItem({ id: 'bad-1', name: 'B', calories: 80, protein_g: 3, carbs_g: 38, fat_g: 18 }),
    ]
    const { summary } = runAudit(items)
    assert.equal(summary.total, summary.passing + summary.failing)
  })
})
