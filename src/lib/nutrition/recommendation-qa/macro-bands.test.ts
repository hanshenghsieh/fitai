import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { classifyDishBand, macroInBand, MACRO_BANDS } from './macro-bands'

describe('classifyDishBand — soup', () => {
  it('classifies common soup names as soup, not generic', () => {
    for (const name of ['玉米濃湯', '玉米湯', '酸辣湯', '味噌湯', '紫菜湯', '椰汁雞湯', '蛤蜊蒸蛋羹']) {
      assert.equal(classifyDishBand(name), 'soup', `"${name}" should classify as soup`)
    }
  })

  it('does not misclassify a dumplings combo that happens to include a soup side', () => {
    // The combo's macros describe the WHOLE meal (dumplings + soup), not
    // just the soup portion — it must stay in the dumplings band, not soup.
    assert.equal(classifyDishBand('鍋貼（10顆）+ 酸辣湯'), 'dumplings')
  })

  it('does not affect existing drink classification', () => {
    assert.equal(classifyDishBand('紅茶'), 'drink')
    assert.equal(classifyDishBand('無糖綠茶'), 'drink')
  })
})

describe('soup macro band — a legitimately low-calorie soup passes', () => {
  it('a real McDonald\'s-scale corn soup (120 kcal) is within the soup band', () => {
    const bandId = classifyDishBand('玉米濃湯')
    const inBand = macroInBand(bandId, { calories: 120, protein_g: 4, carbs_g: 18, fat_g: 4 })
    assert.equal(inBand, true)
  })

  it('the same calorie value would have failed the generic band (proving this was the actual bug)', () => {
    const inGenericBand = macroInBand('generic', { calories: 120, protein_g: 4, carbs_g: 18, fat_g: 4 })
    assert.equal(inGenericBand, false, 'generic band requires >=150 kcal — a real soup legitimately falls below that')
  })

  it('soup band has its own bounded range, not unlimited — still a real check', () => {
    assert.ok(MACRO_BANDS.soup.calories[1] < MACRO_BANDS.generic.calories[1])
    const implausible = macroInBand('soup', { calories: 120, protein_g: 60, carbs_g: 18, fat_g: 4 })
    assert.equal(implausible, false, 'an implausible 60g-protein "soup" should still fail the band check')
  })
})
