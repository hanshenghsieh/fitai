import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isPurchasesNativePluginAvailable,
  resetAppleIapConfiguration,
} from './apple-iap-client'

describe('apple-iap-client', () => {
  it('does not report native Purchases plugin on server', () => {
    assert.equal(isPurchasesNativePluginAvailable(), false)
  })

  it('resets in-memory configure cache', () => {
    resetAppleIapConfiguration()
    assert.doesNotThrow(() => resetAppleIapConfiguration())
  })
})
