import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildAppleIapSubscriptionRow,
  upsertAppleIapSubscription,
} from './apple-iap-store'

describe('apple-iap sync regression', () => {
  it('buildAppleIapSubscriptionRow uses apple_iap prefix for sync id', () => {
    const row = buildAppleIapSubscriptionRow({
      userId: 'user-abc',
      originalTransactionId: 'betterbit_pro_monthly_2026-07-09',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    })
    assert.match(row.stripe_subscription_id, /^apple_iap_/)
    assert.equal(row.user_id, 'user-abc')
    assert.equal(row.status, 'active')
  })

  it('upsertAppleIapSubscription writes to subscriptions table', async () => {
    let upsertPayload: unknown = null
    const mockSupabase = {
      from(table: string) {
        assert.equal(table, 'subscriptions')
        return {
          upsert(payload: unknown) {
            upsertPayload = payload
            return Promise.resolve({ error: null })
          },
        }
      },
    }

    await upsertAppleIapSubscription(mockSupabase as never, {
      userId: 'user-1',
      originalTransactionId: 'tx-sync-1',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    })

    assert.ok(upsertPayload)
    const row = upsertPayload as { user_id: string; stripe_subscription_id: string }
    assert.equal(row.user_id, 'user-1')
    assert.equal(row.stripe_subscription_id, 'apple_iap_tx-sync-1')
  })

  it('upsertAppleIapSubscription falls back to legacy row without subscription_source', async () => {
    let call = 0
    const mockSupabase = {
      from() {
        return {
          upsert() {
            call += 1
            if (call === 1) {
              return Promise.resolve({ error: { message: 'column subscription_source does not exist' } })
            }
            return Promise.resolve({ error: null })
          },
        }
      },
    }

    const row = await upsertAppleIapSubscription(mockSupabase as never, {
      userId: 'user-2',
      originalTransactionId: 'tx-legacy',
    })
    assert.equal(call, 2)
    assert.equal(row.stripe_subscription_id, 'apple_iap_tx-legacy')
  })
})
