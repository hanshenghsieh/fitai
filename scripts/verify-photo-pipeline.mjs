/**
 * End-to-end photo label → nutrition match sanity check (no network).
 * Run: node --import tsx scripts/verify-photo-pipeline.mjs
 */
import assert from 'node:assert/strict'
import { createPhotoV2State } from '../src/lib/nutrition/search-v2/photo-pipeline.ts'
import { buildPhotoMatchSnapshot } from '../src/lib/nutrition/photo-match-snapshot.ts'
import {
  createPhotoAccuracyState,
  photoAccuracyDisplayMacros,
  photoAccuracyStateFromV2,
} from '../src/lib/nutrition/photo-log-accuracy.ts'

const CASES = [
  { label: '日式咖哩飯', expectMacros: true },
  { label: '雞腿便當', expectMacros: false },
  { label: '摩斯漢堡起司堡', expectMacros: true },
]

let ok = 0
for (const { label, expectMacros } of CASES) {
  const v2 = createPhotoV2State(label)
  const snapshot = buildPhotoMatchSnapshot(v2)
  const bytes = JSON.stringify(snapshot).length
  assert.ok(bytes < 80_000, `${label} snapshot too large: ${bytes} bytes`)

  const fromClient = createPhotoAccuracyState(label)
  const fromServer = photoAccuracyStateFromV2(snapshot)
  const display = photoAccuracyDisplayMacros(fromServer)

  console.log(
    `[${label}] snapshot=${bytes}B action=${snapshot.outcome.action} calories=${display.calories ?? '—'}`
  )

  if (expectMacros) {
    assert.ok(
      display.calories != null || fromServer.nutrition_status !== 'unknown',
      `${label} should resolve nutrition`
    )
  }
  ok++
}

console.log(`\n✅ photo pipeline verify passed (${ok}/${CASES.length})`)
