import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeBetterBitFoodScore,
  compositeToGrade,
  scoreMenuItem,
  compareFoodGrades,
} from './betterbit-food-score.ts'

describe('betterbit_food_score', () => {
  it('grades high-protein lean meal A or A+', () => {
    const s = computeBetterBitFoodScore({
      name: '舒肥雞胸沙拉碗',
      category: 'lunch',
      role: 'combo',
      calories: 420,
      protein_g: 38,
      carbs_g: 28,
      fat_g: 14,
      fiber_g: 6,
    })
    assert.ok(s.protein_score >= 75)
    assert.ok(['A+', 'A'].includes(s.overall_grade))
    assert.ok(s.composite_score >= 78)
  })

  it('grades sugary drink low', () => {
    const s = computeBetterBitFoodScore({
      name: '珍珠奶茶',
      category: 'lunch',
      role: 'drink',
      calories: 520,
      protein_g: 2,
      carbs_g: 78,
      fat_g: 12,
    })
    assert.ok(s.satiety_score < 50)
    assert.ok(s.diet_score < 55)
    assert.ok(['C', 'D'].includes(s.overall_grade))
  })

  it('grades fried item poorly on diet', () => {
    const s = computeBetterBitFoodScore({
      name: '鹽酥雞套餐',
      category: 'dinner',
      calories: 780,
      protein_g: 22,
      carbs_g: 65,
      fat_g: 42,
    })
    assert.ok(s.diet_score < 60)
  })

  it('uses meal calorie target when provided', () => {
    const fit = computeBetterBitFoodScore({
      calories: 500,
      protein_g: 35,
      carbs_g: 40,
      fat_g: 15,
      mealCalorieTarget: 510,
    })
    const over = computeBetterBitFoodScore({
      calories: 900,
      protein_g: 35,
      carbs_g: 80,
      fat_g: 30,
      mealCalorieTarget: 510,
    })
    assert.ok(fit.calorie_score > over.calorie_score)
  })

  it('maps composite to letter grades', () => {
    assert.equal(compositeToGrade(90), 'A+')
    assert.equal(compositeToGrade(80), 'A')
    assert.equal(compositeToGrade(65), 'B')
    assert.equal(compositeToGrade(50), 'C')
    assert.equal(compositeToGrade(30), 'D')
  })

  it('scoreMenuItem accepts menu shape', () => {
    const s = scoreMenuItem(
      {
        name: '雞胸便當',
        category: 'lunch',
        role: 'combo',
        calories: 450,
        protein_g: 28,
        carbs_g: 45,
        fat_g: 12,
        tags: ['高蛋白'],
      },
      { mealCalorieTarget: 480, mealProteinTarget: 30 }
    )
    assert.equal(typeof s.overall_grade, 'string')
    assert.ok(s.protein_score > 0)
  })

  it('compareFoodGrades orders best first', () => {
    assert.ok(compareFoodGrades('A+', 'B') < 0)
    assert.ok(compareFoodGrades('D', 'A') > 0)
  })
})
