import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareVersions, isVersionAtLeast, isVersionBelow } from './version-compare'

describe('version-compare — numeric per-segment comparison, never a raw string compare', () => {
  it('1.0.0 == 1.0.0', () => {
    assert.equal(compareVersions('1.0.0', '1.0.0'), 0)
  })

  it('1.0.0 < 1.0.1', () => {
    assert.equal(compareVersions('1.0.0', '1.0.1'), -1)
  })

  it('1.0.1 < 1.1.0', () => {
    assert.equal(compareVersions('1.0.1', '1.1.0'), -1)
  })

  it('1.9.0 < 1.10.0 — the exact bug a string comparison gets wrong', () => {
    assert.equal(compareVersions('1.9.0', '1.10.0'), -1)
    assert.notEqual('1.9.0' > '1.10.0', false) // documents that naive string compare gets this backwards
  })

  it('1.10.0 < 2.0.0', () => {
    assert.equal(compareVersions('1.10.0', '2.0.0'), -1)
  })

  it('is symmetric: b > a implies a < b', () => {
    assert.equal(compareVersions('2.0.0', '1.10.0'), 1)
  })

  it('missing segments are treated as 0 — "1.0" == "1.0.0"', () => {
    assert.equal(compareVersions('1.0', '1.0.0'), 0)
    assert.equal(compareVersions('1', '1.0.0'), 0)
  })

  it('non-numeric segments fall back to 0 rather than throwing', () => {
    assert.doesNotThrow(() => compareVersions('1.x.0', '1.0.0'))
    assert.equal(compareVersions('1.x.0', '1.0.0'), 0)
  })

  it('isVersionAtLeast / isVersionBelow are consistent with compareVersions', () => {
    assert.equal(isVersionAtLeast('1.2.0', '1.2.0'), true)
    assert.equal(isVersionAtLeast('1.3.0', '1.2.0'), true)
    assert.equal(isVersionAtLeast('1.1.0', '1.2.0'), false)
    assert.equal(isVersionBelow('1.1.0', '1.2.0'), true)
    assert.equal(isVersionBelow('1.2.0', '1.2.0'), false)
  })
})
