import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildAppleIapSubscriptionId,
  buildAppleIapSubscriptionRow,
  isAppleIapSubscriptionId,
} from './apple-iap-store'

describe('apple-iap-store', () => {
  function input(active: boolean, userId: string) {
    const now = Date.now()
    return {
      userId,
      active,
      productId: 'betterbit_pro_monthly',
      purchasedAt: new Date(now - 86_400_000).toISOString(),
      expiresAt: new Date(now + (active ? 86_400_000 : -1)).toISOString(),
      willRenew: active,
    }
  }

  it('builds stable apple_iap subscription ids', () => {
    assert.equal(buildAppleIapSubscriptionId('1000001'), 'apple_iap_1000001')
    assert.equal(buildAppleIapSubscriptionId('apple_iap_1000001'), 'apple_iap_1000001')
    assert.equal(isAppleIapSubscriptionId('apple_iap_abc'), true)
    assert.equal(isAppleIapSubscriptionId('sub_123'), false)
  })

  it('marks active subscription when expiry is in the future', () => {
    const row = buildAppleIapSubscriptionRow(input(true, 'user-1'))
    assert.equal(row.status, 'active')
    assert.equal(row.subscription_source, 'apple_iap')
    assert.equal(row.plan, 'premium')
  })

  it('marks canceled subscription when expiry is in the past', () => {
    const row = buildAppleIapSubscriptionRow(input(false, 'user-1'))
    assert.equal(row.status, 'canceled')
  })
})
