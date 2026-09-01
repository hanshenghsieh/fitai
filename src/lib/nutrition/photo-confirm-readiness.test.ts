import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isPhotoConfirmDisabled, type PhotoConfirmReadinessInput } from './photo-confirm-readiness'

function base(overrides: Partial<PhotoConfirmReadinessInput> = {}): PhotoConfirmReadinessInput {
  return {
    loading: false,
    matchingNutrition: false,
    saving: false,
    nameTrim: '雞腿便當',
    iosLiteMode: false,
    hasSavePhotoOnly: false,
    readyForLog: true,
    ...overrides,
  }
}

describe('isPhotoConfirmDisabled — photo Confirm button readiness gate', () => {
  it('1. before analysis starts (fresh draft, no name yet) — disabled, matching pre-existing behavior', () => {
    assert.equal(isPhotoConfirmDisabled(base({ loading: true, nameTrim: '' })), true)
  })

  it('2. photo/AI-label recognition in progress (draft.loading) — disabled', () => {
    assert.equal(isPhotoConfirmDisabled(base({ loading: true, nameTrim: '雞腿便當' })), true)
  })

  it('3. label resolved but nutrition match still in flight (matchingNutrition=true) — disabled, this is the bug this fix closes', () => {
    // loading has already flipped false (name is known) but macros/accuracy
    // are not resolved yet — previously this fell through to "enabled".
    assert.equal(isPhotoConfirmDisabled(base({ loading: false, matchingNutrition: true, readyForLog: true })), true)
  })

  it('4. successful, fully-resolved result (not loading, not matching, ready) — enabled', () => {
    assert.equal(isPhotoConfirmDisabled(base({ loading: false, matchingNutrition: false, readyForLog: true })), false)
  })

  it('5. analysis failed and left an unresolved/ambiguous result (readyForLog=false) — stays disabled, no auto-enable with incomplete data', () => {
    assert.equal(isPhotoConfirmDisabled(base({ loading: false, matchingNutrition: false, readyForLog: false })), true)
  })

  it('6. currently saving — disabled regardless of readiness (no double-submit)', () => {
    assert.equal(isPhotoConfirmDisabled(base({ saving: true, readyForLog: true })), true)
  })

  it('iOS lite mode: the "save photo only" action is not gated on matchingNutrition (deliberately does not claim resolved macros)', () => {
    assert.equal(
      isPhotoConfirmDisabled(base({ iosLiteMode: true, hasSavePhotoOnly: true, matchingNutrition: true, readyForLog: false })),
      false
    )
  })

  it('iOS lite mode without a savePhotoOnly handler available — disabled', () => {
    assert.equal(isPhotoConfirmDisabled(base({ iosLiteMode: true, hasSavePhotoOnly: false })), true)
  })
})

describe('6. replacing the photo immediately re-disables Confirm — no stale-result window', () => {
  it('handlePhotoPick (TodayOS.tsx) nulls the previous draft and starts the new one with loading:true and null macros, not spread from the old draft', () => {
    const path = fileURLToPath(new URL('../../components/dashboard/TodayOS.tsx', import.meta.url))
    const source = readFileSync(path, 'utf8')
    const fnStart = source.indexOf('const handlePhotoPick = useCallback(')
    assert.ok(fnStart >= 0, 'expected to find handlePhotoPick in TodayOS.tsx')
    const fnBody = source.slice(fnStart, fnStart + 1200)
    const nullIdx = fnBody.indexOf('setPhotoDraft(null)')
    const freshIdx = fnBody.indexOf('loading: true')
    assert.ok(nullIdx >= 0 && freshIdx >= 0 && nullIdx < freshIdx, 'the previous draft must be cleared before the new loading draft is set')
    // the fresh draft is a plain object literal (calories: null, ...), not a
    // `prev => ({ ...prev, ... })` spread that could carry over a prior
    // photo's resolved macros while the new one is still loading.
    const freshDraftLiteral = fnBody.slice(freshIdx - 300, freshIdx + 20)
    assert.ok(freshDraftLiteral.includes('calories: null'), 'the fresh draft must start with null macros, not inherited values')
  })
})

describe('7. calling confirmation while disabled cannot commit a FoodLog — defense in depth in the actual save handler', () => {
  it('savePhotoDraft (TodayOS.tsx) has its own guard against matchingNutrition, independent of the button being disabled', () => {
    const path = fileURLToPath(new URL('../../components/dashboard/TodayOS.tsx', import.meta.url))
    const source = readFileSync(path, 'utf8')
    const fnStart = source.indexOf('const savePhotoDraft = useCallback(() => {')
    assert.ok(fnStart >= 0, 'expected to find savePhotoDraft in TodayOS.tsx')
    const guardLine = source.slice(fnStart, fnStart + 200)
    assert.ok(
      guardLine.includes('photoDraft.matchingNutrition'),
      'savePhotoDraft must bail out while photoDraft.matchingNutrition is true, even if called directly'
    )
  })
})
