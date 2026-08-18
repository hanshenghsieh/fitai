import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decideUpdate, isValidReleaseConfig, type ReleaseConfig } from './update-decision'

function config(overrides: Partial<ReleaseConfig> = {}): ReleaseConfig {
  return {
    latest_version: '1.2.0',
    minimum_version: '1.0.0',
    title: 'BetterBit 有新版本囉',
    message: '建議更新',
    update_url: 'https://apps.apple.com/app/id123',
    force_update: false,
    enabled: true,
    ...overrides,
  }
}

describe('decideUpdate — installed=1.2.0/latest=1.2.0 -> none', () => {
  it('already on the latest version shows nothing', () => {
    const result = decideUpdate(config({ latest_version: '1.2.0' }), '1.2.0')
    assert.equal(result.kind, 'none')
  })

  it('installed AHEAD of latest (e.g. a beta/TestFlight build) also shows nothing', () => {
    const result = decideUpdate(config({ latest_version: '1.2.0' }), '1.3.0')
    assert.equal(result.kind, 'none')
  })
})

describe('decideUpdate — installed=1.1.0/latest=1.2.0/minimum=1.0.0 -> optional', () => {
  it('behind latest but at/above minimum, force_update off -> optional', () => {
    const result = decideUpdate(config({ latest_version: '1.2.0', minimum_version: '1.0.0', force_update: false }), '1.1.0')
    assert.equal(result.kind, 'optional')
    assert.equal(result.title, 'BetterBit 有新版本囉')
  })

  it('behind latest and even below minimum, but force_update is OFF -> still optional, never required', () => {
    // The 6-field admin toggle is the single source of truth for whether an
    // old build gets locked out — being below minimum_version alone must
    // not force a lock if the founder hasn't flipped force_update on.
    const result = decideUpdate(config({ latest_version: '1.2.0', minimum_version: '1.0.0', force_update: false }), '0.9.0')
    assert.equal(result.kind, 'optional')
  })
})

describe('decideUpdate — installed=0.9.0/minimum=1.0.0/force_update=true -> required', () => {
  it('below minimum with force_update on -> required', () => {
    const result = decideUpdate(config({ minimum_version: '1.0.0', force_update: true }), '0.9.0')
    assert.equal(result.kind, 'required')
  })

  it('AT minimum (not below) -> not required, even with force_update on', () => {
    const result = decideUpdate(config({ latest_version: '1.2.0', minimum_version: '1.0.0', force_update: true }), '1.0.0')
    assert.notEqual(result.kind, 'required')
  })
})

describe('decideUpdate — failure/malformed input must never lock the app (fail open)', () => {
  it('null config -> none', () => {
    assert.equal(decideUpdate(null, '1.0.0').kind, 'none')
  })

  it('undefined config -> none', () => {
    assert.equal(decideUpdate(undefined, '1.0.0').kind, 'none')
  })

  it('malformed JSON shape (missing required fields) -> none', () => {
    assert.equal(decideUpdate({ latest_version: '1.2.0' }, '1.0.0').kind, 'none')
  })

  it('wrong types (e.g. force_update as a string) -> none', () => {
    assert.equal(decideUpdate({ ...config(), force_update: 'true' }, '1.0.0').kind, 'none')
  })

  it('a non-object (string/number/array) config -> none', () => {
    assert.equal(decideUpdate('not a config', '1.0.0').kind, 'none')
    assert.equal(decideUpdate(42, '1.0.0').kind, 'none')
    assert.equal(decideUpdate([], '1.0.0').kind, 'none')
  })

  it('enabled=false -> none regardless of how far behind installed is', () => {
    const result = decideUpdate(config({ enabled: false, minimum_version: '1.0.0', force_update: true }), '0.1.0')
    assert.equal(result.kind, 'none')
  })

  it('missing/empty installed version -> none, never crashes', () => {
    assert.doesNotThrow(() => decideUpdate(config(), ''))
    assert.equal(decideUpdate(config(), '').kind, 'none')
  })

  it('isValidReleaseConfig is the single gate decideUpdate relies on — spot check', () => {
    assert.equal(isValidReleaseConfig(config()), true)
    assert.equal(isValidReleaseConfig({}), false)
    assert.equal(isValidReleaseConfig(null), false)
  })
})

describe('version-1.9.0-vs-1.10.0 regression — the exact spec example, end to end through decideUpdate', () => {
  it('installed 1.9.0 against latest 1.10.0 is correctly "behind", not misread as ahead via string comparison', () => {
    const result = decideUpdate(config({ latest_version: '1.10.0', minimum_version: '1.0.0' }), '1.9.0')
    assert.equal(result.kind, 'optional')
  })
})
