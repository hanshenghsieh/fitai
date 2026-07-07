import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildAppleIapSubscriptionId,
  buildAppleIapSubscriptionRow,
  isAppleIapSubscriptionId,
} from './apple-iap-store'

describe('apple-iap-store', () => {
  it('builds stable apple_iap subscription ids', () => {
    assert.equal(buildAppleIapSubscriptionId('1000001'), 'apple_iap_1000001')
    assert.equal(buildAppleIapSubscriptionId('apple_iap_1000001'), 'apple_iap_1000001')
    assert.equal(isAppleIapSubscriptionId('apple_iap_abc'), true)
    assert.equal(isAppleIapSubscriptionId('sub_123'), false)
  })

  it('marks active subscription when expiry is in the future', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const row = buildAppleIapSubscriptionRow({
      userId: 'user-1',
      originalTransactionId: 'tx-1',
      expiresAt: future,
    })
    assert.equal(row.status, 'active')
    assert.equal(row.subscription_source, 'apple_iap')
    assert.equal(row.plan, 'premium')
  })

  it('marks canceled subscription when expiry is in the past', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    const row = buildAppleIapSubscriptionRow({
      userId: 'user-1',
      originalTransactionId: 'tx-2',
      expiresAt: past,
    })
    assert.equal(row.status, 'canceled')
  })
})
