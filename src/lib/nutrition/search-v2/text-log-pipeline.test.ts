import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { resolveFreeTextMeal } from '@/lib/nutrition/search-v2/text-log-pipeline'
import { resolveOrEstimateFreeTextMeal } from '@/lib/food-estimate'
import { searchFoodMenu } from '@/lib/food-search'
import { clearUnknownQueueForTests } from '@/lib/nutrition/search-v2/unknown-queue'

beforeEach(() => clearUnknownQueueForTests())

describe('Text Log V2 — Level A', () => {
  it('T1: 711竹筍排骨湯 resolves official with calories', () => {
    const r = resolveFreeTextMeal('711竹筍排骨湯')
    assert.equal(r.can_commit, true)
    if (r.action === 'create_official') {
      assert.equal(r.payload.nutrition_status, 'official')
      assert.equal(r.payload.calories, 103)
      assert.notEqual(r.payload.calories, 632)
    }
  })

  it('T2: resolveOrEstimate uses kb before v2', () => {
    const est = resolveOrEstimateFreeTextMeal('711竹筍排骨湯')
    assert.equal(est.estimated, false)
    assert.equal(est.calories, 103)
  })
})

describe('Text Log V2 — Level B blocked', () => {
  it('T3: 竹筍湯 cannot commit without clarification', () => {
    const r = resolveFreeTextMeal('竹筍湯')
    assert.equal(r.can_commit, false)
    assert.equal(r.action, 'clarify')
  })

  it('T4: 便當 blocked from free-text commit', () => {
    assert.equal(resolveFreeTextMeal('便當').can_commit, false)
  })

  it('T5: 滷味 blocked', () => {
    assert.equal(resolveFreeTextMeal('滷味').can_commit, false)
  })

  it('T6: 鹽酥雞 blocked', () => {
    assert.equal(resolveFreeTextMeal('鹽酥雞').can_commit, false)
  })

  it('T7: estimate wrapper sets blocked flag', () => {
    const est = resolveOrEstimateFreeTextMeal('竹筍湯')
    assert.equal(est.blocked, true)
    assert.equal(est.calories, null)
  })
})

describe('Text Log V2 — Level C unknown', () => {
  it('T8: 阿嬤家的竹筍湯 unknown null macros', () => {
    const r = resolveFreeTextMeal('阿嬤家的竹筍湯')
    assert.equal(r.can_commit, true)
    assert.equal(r.action, 'create_unknown')
    assert.equal(r.payload.calories, null)
    assert.equal(r.payload.protein_g, null)
    assert.notEqual(r.payload.calories, 0)
  })

  it('T9: unknown does not use meal target 632', () => {
    const est = resolveOrEstimateFreeTextMeal('隨便一道不存在的菜xyz')
    assert.notEqual(est.calories, 632)
    assert.equal(est.calories, null)
  })

  it('T10: unknown nutrition_status', () => {
    const est = resolveOrEstimateFreeTextMeal('媽媽煮的雞湯')
    assert.equal(est.nutrition_status, 'unknown')
    assert.equal(est.nutrition_confidence, 'Unknown')
  })
})

describe('Text Log V2 — search ranking', () => {
  it('T11: searchFoodMenu returns official items only', () => {
    const hits = searchFoodMenu('竹筍')
    for (const h of hits) {
      assert.ok(h.calories > 0)
      assert.ok(h.protein_g >= 0)
    }
  })

  it('T12: search never returns 632 placeholder for soup query', () => {
    const hits = searchFoodMenu('竹筍排骨湯')
    for (const h of hits) {
      if (h.name.includes('竹筍')) assert.notEqual(h.calories, 632)
    }
  })
})

describe('Text Log V2 — hard rules', () => {
  it('T13: no zero-fill on unknown', () => {
    const r = resolveFreeTextMeal('路邊攤神秘料理')
    if (r.can_commit && r.action === 'create_unknown') {
      assert.equal(r.payload.calories, null)
      assert.equal(r.payload.fat_g, null)
    }
  })

  it('T14: clarify never assigns nutrition', () => {
    const r = resolveFreeTextMeal('自助餐')
    assert.equal(r.can_commit, false)
  })
})
