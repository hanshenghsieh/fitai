import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const TODAY_OS_SOURCE = readFileSync(
  new URL('../components/dashboard/TodayOS.tsx', import.meta.url),
  'utf8'
)

function extractBlock(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker)
  assert.ok(start >= 0, `expected to find "${startMarker}" in TodayOS.tsx`)
  const end = source.indexOf(endMarker, start + startMarker.length)
  assert.ok(end >= 0, `expected to find "${endMarker}" after "${startMarker}" in TodayOS.tsx`)
  return source.slice(start, end)
}

describe('photo-log save gives user feedback and never gets stuck on AI/upload failure', () => {
  describe('scenario: image upload / file read failure (fileToDataUrl rejects)', () => {
    const fileToDataUrlCallSites = [...TODAY_OS_SOURCE.matchAll(/fileToDataUrl\(photoDraft\.file\)/g)]

    it('every fileToDataUrl(photoDraft.file) call site exists (sanity check on save flows)', () => {
      // savePhotoOnly, savePhotoDraft, handleManualPhotoCorrection
      assert.equal(fileToDataUrlCallSites.length, 3)
    })

    it('every fileToDataUrl(photoDraft.file) call is chained with .then(finish).catch(...)', () => {
      for (const match of fileToDataUrlCallSites) {
        const after = TODAY_OS_SOURCE.slice(match.index!, match.index! + 400)
        assert.match(
          after,
          /fileToDataUrl\(photoDraft\.file\)\s*\.then\(finish\)\s*\.catch\(/,
          `expected a .catch() immediately chained after fileToDataUrl(...).then(finish) near index ${match.index}`
        )
      }
    })

    it('every .catch() handler resets photoSaving and shows an error toast (button never stuck on "加入中…")', () => {
      for (const match of fileToDataUrlCallSites) {
        const after = TODAY_OS_SOURCE.slice(match.index!, match.index! + 400)
        const catchBody = after.slice(after.indexOf('.catch('))
        assert.match(catchBody, /setPhotoSaving\(false\)/)
        assert.match(catchBody, /toast\.error\(/)
      }
    })
  })

  describe('scenario: AI recognition never produced a usable result (accuracy missing)', () => {
    const savePhotoDraft = extractBlock(
      TODAY_OS_SOURCE,
      'const savePhotoDraft = useCallback(() => {',
      'const handleManualPhotoCorrection = useCallback('
    )

    it('savePhotoDraft no longer silently returns when accuracy is missing — it surfaces a toast', () => {
      const accuracyGuard = extractBlock(savePhotoDraft, 'if (!accuracy) {', 'if (!photoAccuracyReadyForLog(accuracy)) {')
      assert.match(accuracyGuard, /toast\.error\(/)
      assert.match(accuracyGuard, /recognitionHint/)
    })

    it('savePhotoDraft no longer silently returns when accuracy is not ready for log — it surfaces a toast', () => {
      const readyGuard = extractBlock(savePhotoDraft, 'if (!photoAccuracyReadyForLog(accuracy)) {', 'setPhotoSaving(true)')
      assert.match(readyGuard, /toast\.message\(|toast\.error\(/)
    })

    it('these early-return guards run before setPhotoSaving(true), so no button ever shows a stuck "加入中…"', () => {
      const accuracyGuardIndex = savePhotoDraft.indexOf('if (!accuracy) {')
      const setSavingIndex = savePhotoDraft.indexOf('setPhotoSaving(true)')
      assert.ok(accuracyGuardIndex >= 0 && setSavingIndex >= 0 && accuracyGuardIndex < setSavingIndex)
    })
  })

  describe('scenario: AI returned an empty/unusable payload at save time (post-accuracy build failure)', () => {
    it('the !payload branch inside savePhotoDraft resets loading state AND shows a toast', () => {
      const savePhotoDraft = extractBlock(
        TODAY_OS_SOURCE,
        'const savePhotoDraft = useCallback(() => {',
        'const handleManualPhotoCorrection = useCallback('
      )
      const payloadGuard = extractBlock(savePhotoDraft, 'if (!payload) {', 'commitLog({')
      assert.match(payloadGuard, /setPhotoSaving\(false\)/)
      assert.match(payloadGuard, /toast\.error\(/)
    })
  })

  describe('scenario: AI parse / API error during initial recognition (parsePhotoDraft)', () => {
    it('parsePhotoDraft still shows a toast and resets loading + sets a recognitionHint on failure (pre-existing, unregressed)', () => {
      const parsePhotoDraft = extractBlock(
        TODAY_OS_SOURCE,
        'const parsePhotoDraft = useCallback(async (',
        'const handlePhotoPick = useCallback('
      )
      const catchBlock = extractBlock(parsePhotoDraft, '} catch (err) {', '}, [])')
      assert.match(catchBlock, /toast\.error\(photoError\.message\)/)
      assert.match(catchBlock, /loading: false/)
      assert.match(catchBlock, /recognitionHint: photoError\.message/)
    })
  })
})
