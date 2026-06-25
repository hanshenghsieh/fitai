import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateDietScore,
  getDietScoreSignal,
  inferDietScoreFromFoodName,
  dietScoreEmoji,
} from './diet-score'

describe('diet-score', () => {
  it('getDietScoreSignal maps green 80–100', () => {
    const r = getDietScoreSignal(85)
    assert.equal(r.signal, 'green')
    assert.equal(r.label, '適合減脂')
    assert.equal(r.score, 85)
  })

  it('getDietScoreSignal maps yellow 40–79', () => {
    const r = getDietScoreSignal(62)
    assert.equal(r.signal, 'yellow')
    assert.equal(r.label, '偶爾可以')
  })

  it('getDietScoreSignal maps red 0–39', () => {
    const r = getDietScoreSignal(30)
    assert.equal(r.signal, 'red')
    assert.equal(r.label, '建議少吃')
  })

  it('inferDietScoreFromFoodName boosts lean staples', () => {
    assert.ok(inferDietScoreFromFoodName('雞胸肉') >= 70)
    assert.ok(inferDietScoreFromFoodName('茶葉蛋') >= 70)
    assert.ok(inferDietScoreFromFoodName('地瓜') >= 70)
    assert.ok(inferDietScoreFromFoodName('無糖豆漿') >= 70)
  })

  it('inferDietScoreFromFoodName penalizes fried and bubble tea', () => {
    assert.ok(inferDietScoreFromFoodName('鹽酥雞') < 40)
    assert.ok(inferDietScoreFromFoodName('手搖珍奶全糖') < 40)
    assert.ok(inferDietScoreFromFoodName('草莓蛋糕') < 45)
  })

  it('inferDietScoreFromFoodName is neutral for bento', () => {
    const score = inferDietScoreFromFoodName('雞腿便當')
    assert.ok(score >= 40 && score <= 65)
  })

  it('calculateDietScore uses macros for high-protein meal', () => {
    const r = calculateDietScore({
      name: '舒肥雞胸',
      calories: 180,
      protein_g: 35,
      carbs_g: 2,
      fat_g: 4,
      fiber_g: 0,
      sugar_g: 0,
    })
    assert.equal(r.signal, 'green')
    assert.ok(r.score >= 80)
  })

  it('calculateDietScore falls back on name when macros missing', () => {
    const r = calculateDietScore({ name: '法式吐司套餐', calories: 471, protein_g: 15 })
    assert.equal(r.signal, 'yellow')
    assert.ok(r.score >= 40 && r.score < 80)
  })

  it('calculateDietScore penalizes fried combo with sugar drink name', () => {
    const r = calculateDietScore({
      name: '炸雞排套餐配珍奶',
      calories: 900,
      protein_g: 22,
      carbs_g: 95,
      fat_g: 45,
    })
    assert.ok(r.score < 50)
  })

  it('dietScoreEmoji is deprecated (empty string)', () => {
    assert.equal(dietScoreEmoji('green'), '')
    assert.equal(dietScoreEmoji('yellow'), '')
    assert.equal(dietScoreEmoji('red'), '')
  })
})
