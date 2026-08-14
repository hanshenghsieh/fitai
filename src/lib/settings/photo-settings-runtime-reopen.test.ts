/**
 * Build 38 BUG 7 — CASE 3. A confirmed AI/compound-DB estimate must not
 * re-trigger NutritionConfirmationSheet ("確認這筆紀錄") after the user
 * already confirmed it one screen earlier via "這樣記錄可以". This is the
 * exact function TodayOS.tsx's savePhotoDraft now calls to decide
 * `needsConfirm` (see the "Build 38 BUG 7" comment there).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldReopenPhotoConfirmation, shouldRequirePhotoConfirmation } from '@/lib/settings/photo-settings-runtime'

describe('Build 38 BUG 7 — CASE 3: confirmed AI estimate must not reopen the unknown/confirm modal', () => {
  it('a confirmed AI estimate (user_confirmed=true) never reopens, regardless of confirm_mode', () => {
    const result = { nutrition_confidence: 'C', nutrition_status: 'estimated' }
    for (const mode of ['auto', 'always', 'low_confidence'] as const) {
      assert.equal(
        shouldReopenPhotoConfirmation(true, mode, result),
        false,
        `mode="${mode}" should not reopen once the user already confirmed`
      )
    }
  })

  it('an unconfirmed low-confidence result still goes through the existing gate unchanged', () => {
    const result = { nutrition_confidence: 'C', nutrition_status: 'estimated' }
    // Matches shouldRequirePhotoConfirmation's own behavior exactly when unconfirmed.
    for (const mode of ['auto', 'always', 'low_confidence'] as const) {
      assert.equal(
        shouldReopenPhotoConfirmation(false, mode, result),
        shouldRequirePhotoConfirmation(mode, result)
      )
    }
  })

  it('a genuinely unconfirmed create_unknown save is unaffected (still gets the second-look prompt)', () => {
    const result = { nutrition_confidence: 'Unknown', nutrition_status: 'unknown' }
    assert.equal(shouldReopenPhotoConfirmation(false, 'low_confidence', result), true)
  })
})
