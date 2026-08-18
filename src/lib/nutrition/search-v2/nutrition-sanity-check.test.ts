import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { checkMacroCalorieConsistency } from './nutrition-sanity-check'

describe('CASE C — macro/total-calorie consistency sanity check', () => {
  it('a well-formed result (macros roughly add up to the stated total) produces no warning', () => {
    // 30g protein + 30g carbs + 11g fat -> 30*4 + 30*4 + 11*9 = 120+120+99 = 339, vs stated 352 -> within tolerance
    const warnings = checkMacroCalorieConsistency({ calories: 352, protein: 30, carbs: 30, fat: 11 })
    assert.deepEqual(warnings, [])
  })

  it('a severely mismatched result (macros imply far more calories than stated) is flagged', () => {
    // 40g protein + 50g carbs + 25g fat -> 160+200+225 = 585, vs a stated 200 -> way outside tolerance
    const warnings = checkMacroCalorieConsistency({ calories: 200, protein: 40, carbs: 50, fat: 25 })
    assert.equal(warnings.length, 1)
    assert.equal(warnings[0]!.code, 'macro_calorie_mismatch')
  })

  it('a severely mismatched result the other direction (stated total far exceeds what the macros imply) is also flagged', () => {
    // 5g protein + 5g carbs + 2g fat -> 20+20+18 = 58, vs a stated 500 -> way outside tolerance
    const warnings = checkMacroCalorieConsistency({ calories: 500, protein: 5, carbs: 5, fat: 2 })
    assert.equal(warnings.length, 1)
  })

  it('small meals are not flagged on rounding noise alone (absolute floor tolerance)', () => {
    // 1g protein + 1g carbs + 0.5g fat -> 4+4+4.5=12.5, stated 20 -> 7.5 kcal gap, well under the 50 kcal floor
    const warnings = checkMacroCalorieConsistency({ calories: 20, protein: 1, carbs: 1, fat: 0.5 })
    assert.deepEqual(warnings, [])
  })

  it('this check never mutates its input — it only reports, callers decide what (if anything) to do', () => {
    const totals = { calories: 200, protein: 40, carbs: 50, fat: 25 }
    const snapshot = { ...totals }
    checkMacroCalorieConsistency(totals)
    assert.deepEqual(totals, snapshot)
  })
})
