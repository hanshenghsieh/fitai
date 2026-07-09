import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isPurchasesNativePluginAvailable,
  purchaseAppleIap,
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

  it('humanizes RevenueCat ASC product fetch errors on server guard', async () => {
    resetAppleIapConfiguration()
    await assert.rejects(
      () => purchaseAppleIap('user-1'),
      /訂閱尚未開放|瀏覽器|付款模組/
    )
  })
})
