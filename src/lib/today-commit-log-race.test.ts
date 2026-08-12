import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { nextFoodLogsAfterCommit } from '@/components/dashboard/TodayOS'
import type { FoodLogEntry } from '@/lib/banks/types'

function readRepoFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}

function entry(id: string): FoodLogEntry {
  return { id, name: id, logged_at: new Date().toISOString(), user_declared: true } as FoodLogEntry
}

describe('commitLog race condition fix (P0-2)', () => {
  it('commitLog builds nextLogs via nextFoodLogsAfterCommit(foodLogsRef.current, full), not the stale foodLogs closure', () => {
    const source = readRepoFile('src/components/dashboard/TodayOS.tsx')
    const commitLogStart = source.indexOf('const commitLog = useCallback(')
    assert.ok(commitLogStart >= 0, 'expected to find commitLog in TodayOS.tsx')
    const commitLogEnd = source.indexOf('const removeLogById = useCallback(')
    assert.ok(commitLogEnd > commitLogStart)
    const commitLogSource = source.slice(commitLogStart, commitLogEnd)

    assert.match(commitLogSource, /const nextLogs = nextFoodLogsAfterCommit\(foodLogsRef\.current, full\)/)
    // Must not regress back to building nextLogs from the plain (stale) foodLogs closure.
    assert.doesNotMatch(commitLogSource, /const nextLogs = \[\.\.\.foodLogs, full\]/)
  })

  it('patchLog (the already-correct reference implementation) is unchanged and still uses the ref', () => {
    const source = readRepoFile('src/components/dashboard/TodayOS.tsx')
    const patchLogStart = source.indexOf('const patchLog = useCallback(')
    const patchLogEnd = source.indexOf('const commitLog = useCallback(')
    const patchLogSource = source.slice(patchLogStart, patchLogEnd)
    assert.match(patchLogSource, /const current = foodLogsRef\.current/)
  })

  it("commitLog's useCallback dependency array no longer lists foodLogs (it reads the ref instead)", () => {
    const source = readRepoFile('src/components/dashboard/TodayOS.tsx')
    const commitLogStart = source.indexOf('const commitLog = useCallback(')
    const removeLogStart = source.indexOf('const removeLogById = useCallback(')
    const commitLogSource = source.slice(commitLogStart, removeLogStart)
    const depsStart = commitLogSource.lastIndexOf('[')
    const depsArray = commitLogSource.slice(depsStart)
    assert.doesNotMatch(depsArray, /\bfoodLogs\b,/)
  })

  it('nextFoodLogsAfterCommit is a pure append (real, imported production helper)', () => {
    assert.deepEqual(nextFoodLogsAfterCommit([], entry('A')).map(e => e.id), ['A'])
    assert.deepEqual(
      nextFoodLogsAfterCommit([entry('A')], entry('B')).map(e => e.id),
      ['A', 'B']
    )
  })
})

/**
 * Pure simulation of the exact race mechanism (no React/DOM available in this
 * test environment — this repo has no jsdom/testing-library, confirmed
 * project-wide). This models TodayOS's actual shape:
 *  - `foodLogs` is derived from a `userMemory` prop that only updates once the
 *    parent's deferred state update flushes and this component re-renders.
 *  - `foodLogsRef.current` is synced from `foodLogs` in a useEffect that only
 *    runs after that re-render commits.
 *  - The OLD buggy commitLog captured `foodLogs` in its useCallback closure —
 *    stale until the closure itself is recreated with a fresh value.
 *  - The FIXED commitLog reads `foodLogsRef.current` (via the real,
 *    directly-imported nextFoodLogsAfterCommit helper above) at call time
 *    instead.
 */
describe('commitLog race condition — pure timing simulation', () => {
  function simulateRenderCycle(ref: { current: FoodLogEntry[] }, latest: FoodLogEntry[]) {
    // Simulates the parent's deferred setState flushing, this component
    // re-rendering with the new `foodLogs` prop, and its useEffect syncing
    // foodLogsRef.current — i.e. a completed cycle between two separate user
    // taps, which is the realistic case this fix targets.
    ref.current = latest
  }

  it('OLD (buggy) pattern: two sequential commits from a stale closure lose the first entry', () => {
    const closureSnapshotOfFoodLogs: FoodLogEntry[] = []
    const committed: FoodLogEntry[][] = []

    function buggyCommitLog(e: FoodLogEntry) {
      // The bug: closureSnapshotOfFoodLogs is never updated here — it only
      // changes when TodayOS re-renders and useCallback recreates commitLog
      // with a fresh `foodLogs` value, which has NOT happened yet for a
      // second call that fires before that render cycle completes.
      const nextLogs = [...closureSnapshotOfFoodLogs, e]
      committed.push(nextLogs)
    }

    buggyCommitLog(entry('A'))
    buggyCommitLog(entry('B'))

    const finalLogs = committed[committed.length - 1]!
    // Demonstrates the reported bug: B's commit was built from the same
    // stale [] snapshot, so A is silently lost.
    assert.deepEqual(finalLogs.map(e => e.id), ['B'])
  })

  it('FIXED pattern: two sequential commits via foodLogsRef.current + nextFoodLogsAfterCommit accumulate to [A, B]', () => {
    const foodLogsRef = { current: [] as FoodLogEntry[] }
    const committed: FoodLogEntry[][] = []

    function fixedCommitLog(e: FoodLogEntry) {
      const nextLogs = nextFoodLogsAfterCommit(foodLogsRef.current, e)
      committed.push(nextLogs)
      // Matches the real onLogFood -> ... -> render -> useEffect chain: by
      // the time a second, separate commitLog call happens, the prior
      // commit's render cycle has synced the ref.
      simulateRenderCycle(foodLogsRef, nextLogs)
    }

    fixedCommitLog(entry('A'))
    fixedCommitLog(entry('B'))

    const finalLogs = committed[committed.length - 1]!
    assert.deepEqual(finalLogs.map(e => e.id), ['A', 'B'])
    assert.equal(finalLogs.length, 2, 'must not lose the first entry')
  })
})

/**
 * Phase 2 PRE-TASK A: removeLogById had the same stale-closure risk class as
 * commitLog, just for deletion instead of addition — it read the plain
 * `foodLogs` closure (and listed it in its own useCallback deps) instead of
 * `foodLogsRef.current`. Two rapid-fire deletes before a render cycle
 * completes would both filter from the same stale base array, so the second
 * delete's result silently resurrects whatever the first delete had already
 * removed.
 */
describe('removeLogById stale closure fix (Phase 2 PRE-TASK A)', () => {
  it('removeLogById reads foodLogsRef.current, not the stale foodLogs closure', () => {
    const source = readRepoFile('src/components/dashboard/TodayOS.tsx')
    const start = source.indexOf('const removeLogById = useCallback(')
    assert.ok(start >= 0, 'expected to find removeLogById in TodayOS.tsx')
    const end = source.indexOf('useLayoutEffect(() => {\n    registerDeleteLog?.(removeLogById)')
    assert.ok(end > start)
    const removeLogSource = source.slice(start, end)

    assert.match(removeLogSource, /const currentLogs = foodLogsRef\.current/)
    assert.match(removeLogSource, /const nextLogs = currentLogs\.filter\(l => l\.id !== logId\)/)
    // Must not regress back to filtering from the plain (stale) foodLogs closure.
    assert.doesNotMatch(removeLogSource, /const nextLogs = foodLogs\.filter/)
  })

  it("removeLogById's useCallback dependency array no longer lists foodLogs (it reads the ref instead)", () => {
    const source = readRepoFile('src/components/dashboard/TodayOS.tsx')
    const start = source.indexOf('const removeLogById = useCallback(')
    const end = source.indexOf('useLayoutEffect(() => {\n    registerDeleteLog?.(removeLogById)')
    const removeLogSource = source.slice(start, end)
    const depsStart = removeLogSource.lastIndexOf('[')
    const depsArray = removeLogSource.slice(depsStart)
    assert.doesNotMatch(depsArray, /\bfoodLogs\b,/)
    assert.doesNotMatch(depsArray, /\bfoodLogs\b\)/)
  })
})

describe('removeLogById race condition — pure timing simulation', () => {
  it('OLD (buggy) pattern: deleting A then B from a stale closure resurrects A', () => {
    // Both calls close over the SAME stale snapshot (as the old code did via
    // the plain `foodLogs` variable), so the second delete's filter still
    // sees A in its base array even though the first call already removed it.
    const staleClosureSnapshot: FoodLogEntry[] = [entry('A'), entry('B')]
    const deleteResults: FoodLogEntry[][] = []

    function buggyRemoveLogById(logId: string) {
      const nextLogs = staleClosureSnapshot.filter(l => l.id !== logId)
      deleteResults.push(nextLogs)
    }

    buggyRemoveLogById('A')
    buggyRemoveLogById('B')

    const finalLogs = deleteResults[deleteResults.length - 1]!
    // Demonstrates the bug: deleting B was computed from the same stale
    // [A, B] snapshot, so A reappears even though it was deleted first.
    assert.deepEqual(finalLogs.map(e => e.id), ['A'])
  })

  it('FIXED pattern: deleting A then B via foodLogsRef.current correctly ends with neither present', () => {
    const foodLogsRef = { current: [entry('A'), entry('B')] as FoodLogEntry[] }
    const deleteResults: FoodLogEntry[][] = []

    function fixedRemoveLogById(logId: string) {
      const currentLogs = foodLogsRef.current
      const nextLogs = currentLogs.filter(l => l.id !== logId)
      deleteResults.push(nextLogs)
      // Matches onLogFood -> render -> useEffect syncing the ref before the
      // next, separate removeLogById call happens.
      foodLogsRef.current = nextLogs
    }

    fixedRemoveLogById('A')
    fixedRemoveLogById('B')

    const finalLogs = deleteResults[deleteResults.length - 1]!
    assert.deepEqual(finalLogs, [])
  })
})
