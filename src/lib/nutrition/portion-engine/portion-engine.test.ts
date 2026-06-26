import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyPortionSauceDeltas, countAllPortionSauceDeltas } from '@/lib/nutrition/portion-engine'
import { sauceDelta, countSauceLibrary } from '@/lib/nutrition/portion-engine/sauce'
import { countPortionDeltas } from '@/lib/nutrition/portion-engine/portion'

describe('Portion + Sauce Engine', () => {
  it('PE1: sauce library has 10+ sauces', () => {
    assert.ok(countSauceLibrary() >= 10)
  })

  it('PE2: sauce is delta only not new dish', () => {
    const d = sauceDelta('sesame', 'half')
    assert.ok(d.kcal >= 0)
    assert.ok(d.label?.includes('胡麻'))
  })

  it('PE3: portion deltas exist', () => {
    assert.ok(countPortionDeltas() >= 8)
  })

  it('PE4: combined portion+sauce adjusts base', () => {
    const base = { kcal: 500, protein_g: 25, carbs_g: 50, fat_g: 15 }
    const out = applyPortionSauceDeltas(base, {
      rice: 'less',
      protein: 'skin_removed',
      sauces: [{ id: 'mayo', level: 'none' }],
    })
    assert.ok(out.kcal < base.kcal)
  })

  it('PE5: total delta count', () => {
    const c = countAllPortionSauceDeltas()
    assert.ok(c.total >= 20)
  })
})
