import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  buildAppleIapSubscriptionRow,
  upsertAppleIapSubscription,
} from './apple-iap-store'
import {
  fetchVerifiedRevenueCatSubscription,
  parseAppleIapSyncTrigger,
  parseVerifiedRevenueCatSubscriber,
} from './revenuecat-server'
import {
  isRevenueCatWebhookAuthorized,
  parseRevenueCatWebhookTrigger,
  REVENUECAT_LIFECYCLE_EVENTS,
} from './revenuecat-webhook'

describe('apple-iap sync regression', () => {
  function verifiedInput(userId: string, active = true) {
    const now = Date.now()
    return {
      userId,
      active,
      productId: 'betterbit_pro_monthly' as const,
      purchasedAt: new Date(now - 86_400_000).toISOString(),
      expiresAt: new Date(now + (active ? 86_400_000 : -1)).toISOString(),
      willRenew: active,
    }
  }

  it('buildAppleIapSubscriptionRow uses apple_iap prefix for sync id', () => {
    const row = buildAppleIapSubscriptionRow(verifiedInput('user-abc'))
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

    await upsertAppleIapSubscription(
      mockSupabase as never,
      verifiedInput('user-1')
    )

    assert.ok(upsertPayload)
    const row = upsertPayload as { user_id: string; stripe_subscription_id: string }
    assert.equal(row.user_id, 'user-1')
    assert.equal(row.stripe_subscription_id, 'apple_iap_user-1')
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

    const row = await upsertAppleIapSubscription(
      mockSupabase as never,
      verifiedInput('user-2')
    )
    assert.equal(call, 2)
    assert.equal(row.stripe_subscription_id, 'apple_iap_user-2')
  })

  it('grants premium only from exact supported monthly or annual entitlements', () => {
    const now = new Date('2026-07-15T10:00:00.000Z')
    const active = parseVerifiedRevenueCatSubscriber(
      'user-1',
      {
        subscriber: {
          original_app_user_id: 'user-1',
          entitlements: {
            premium: {
              product_identifier: 'betterbit_pro_monthly',
              purchase_date: '2026-07-01T00:00:00.000Z',
              expires_date: '2026-08-01T00:00:00.000Z',
            },
          },
          subscriptions: {
            betterbit_pro_monthly: {
              unsubscribe_detected_at: null,
            },
          },
        },
      },
      now
    )
    assert.equal(active.active, true)
    assert.equal(active.productId, 'betterbit_pro_monthly')
    assert.equal(active.willRenew, true)

    const annual = parseVerifiedRevenueCatSubscriber(
      'user-1',
      {
        subscriber: {
          original_app_user_id: 'user-1',
          entitlements: {
            premium: {
              product_identifier: 'Betterbit_pro_annual',
              purchase_date: '2026-07-01T00:00:00.000Z',
              expires_date: '2027-07-01T00:00:00.000Z',
            },
          },
          subscriptions: {
            Betterbit_pro_annual: {
              unsubscribe_detected_at: null,
            },
          },
        },
      },
      now
    )
    assert.equal(annual.active, true)
    assert.equal(annual.productId, 'Betterbit_pro_annual')
    assert.equal(annual.willRenew, true)

    const wrongEntitlement = parseVerifiedRevenueCatSubscriber(
      'user-1',
      {
        subscriber: {
          original_app_user_id: 'user-1',
          entitlements: {
            'BetterBit Pro': {
              product_identifier: 'betterbit_pro_monthly',
              purchase_date: '2026-07-01T00:00:00.000Z',
              expires_date: '2026-08-01T00:00:00.000Z',
            },
          },
          subscriptions: {},
        },
      },
      now
    )
    assert.equal(wrongEntitlement.active, false)
  })

  it('server subscriber lookup uses authenticated app user id and secret key', async () => {
    let requestedUrl = ''
    let authorization = ''
    const verified = await fetchVerifiedRevenueCatSubscription(
      'user/id',
      {
        secretApiKey: 'sk_server_only',
        now: new Date('2026-07-15T10:00:00.000Z'),
        fetcher: (async (url: string | URL | Request, init?: RequestInit) => {
          requestedUrl = String(url)
          authorization = new Headers(init?.headers).get('authorization') ?? ''
          return new Response(
            JSON.stringify({
              subscriber: {
                original_app_user_id: 'user/id',
                entitlements: {
                  premium: {
                    product_identifier: 'betterbit_pro_monthly',
                    purchase_date: '2026-07-01T00:00:00.000Z',
                    expires_date: '2026-08-01T00:00:00.000Z',
                  },
                },
                subscriptions: {},
              },
            })
          )
        }) as typeof fetch,
      }
    )
    assert.match(requestedUrl, /subscribers\/user%2Fid$/)
    assert.equal(authorization, 'Bearer sk_server_only')
    assert.equal(verified.active, true)
  })

  it('client sync can only trigger verification and cannot submit entitlement data', () => {
    assert.deepEqual(parseAppleIapSyncTrigger({}), { isRestore: false })
    assert.deepEqual(parseAppleIapSyncTrigger({ isRestore: true }), {
      isRestore: true,
    })
    assert.equal(
      parseAppleIapSyncTrigger({
        isRestore: true,
        productId: 'betterbit_pro_monthly',
        expiresAt: '2099-01-01T00:00:00.000Z',
        originalTransactionId: 'client-controlled',
      }),
      null
    )
  })

  it('webhook authorization is fail-closed and lifecycle triggers expose no payload data', () => {
    assert.equal(isRevenueCatWebhookAuthorized('Bearer correct', 'Bearer correct'), true)
    assert.equal(isRevenueCatWebhookAuthorized('Bearer wrong', 'Bearer correct'), false)
    assert.equal(isRevenueCatWebhookAuthorized(null, 'Bearer correct'), false)

    const userId = '11111111-1111-4111-8111-111111111111'
    for (const eventType of [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'CANCELLATION',
      'EXPIRATION',
      'BILLING_ISSUE',
      'REFUND_REVERSED',
    ]) {
      assert.equal(REVENUECAT_LIFECYCLE_EVENTS.has(eventType), true)
      assert.deepEqual(
        parseRevenueCatWebhookTrigger({
          event: {
            type: eventType,
            app_user_id: userId,
            transaction_id: 'must-not-be-consumed',
            price: 999,
          },
        }),
        { eventType, userIds: [userId], supported: true }
      )
    }

    const transferred = parseRevenueCatWebhookTrigger({
      event: {
        type: 'TRANSFER',
        transferred_from: [userId],
        transferred_to: ['22222222-2222-4222-8222-222222222222'],
      },
    })
    assert.deepEqual(transferred, {
      eventType: 'TRANSFER',
      userIds: [
        userId,
        '22222222-2222-4222-8222-222222222222',
      ],
      supported: true,
    })
    assert.equal(
      parseRevenueCatWebhookTrigger({
        event: {
          type: 'TRANSFER',
          transferred_from: [userId],
          transferred_to: ['anonymous-revenuecat-id'],
        },
      }),
      null
    )
  })

  it('archive cannot run before fail-closed IAP preflight', () => {
    const script = readFileSync(
      new URL('../../scripts/testflight-archive-mac.sh', import.meta.url),
      'utf8'
    )
    const preflightIndex = script.indexOf('npm run preflight:ios-local')
    const archiveIndex = script.indexOf('echo "=== Archive ==="')
    assert.ok(preflightIndex >= 0)
    assert.ok(archiveIndex > preflightIndex)
  })
})
