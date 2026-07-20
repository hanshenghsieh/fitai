import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  AppleIapCancelledError,
  finalizeActiveAppleIapEntitlement,
  isAppleIapCancellation,
  isPurchasesNativePluginAvailable,
  purchaseAppleIap,
  readAppleIapEntitlement,
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

  it('accepts only the active premium entitlement for the expected product', () => {
    const premium = readAppleIapEntitlement({
      entitlements: {
        active: {
          premium: {
            productIdentifier: 'betterbit_pro_monthly',
            expirationDate: '2026-08-20T00:00:00.000Z',
          },
        },
      },
    })
    assert.deepEqual(premium, {
      productId: 'betterbit_pro_monthly',
      expiresAt: '2026-08-20T00:00:00.000Z',
    })
    assert.equal(
      readAppleIapEntitlement({
        entitlements: {
          active: {
            premium: { productIdentifier: 'unexpected_product' },
          },
        },
      }),
      null
    )
    assert.equal(readAppleIapEntitlement({ entitlements: { active: {} } }), null)
  })

  it('does not let optional backend sync failure revoke an active entitlement', async () => {
    const result = await finalizeActiveAppleIapEntitlement(
      {
        productId: 'betterbit_pro_monthly',
        expiresAt: '2026-08-20T00:00:00.000Z',
      },
      async () => {
        throw new Error('Apple IAP verification is not configured')
      }
    )
    assert.deepEqual(result, {
      active: true,
      productId: 'betterbit_pro_monthly',
      expiresAt: '2026-08-20T00:00:00.000Z',
      backendSynced: false,
    })
  })

  it('records successful backend mirroring without changing entitlement truth', async () => {
    const result = await finalizeActiveAppleIapEntitlement(
      {
        productId: 'betterbit_pro_monthly',
        expiresAt: null,
      },
      async () => ({
        active: true,
        productId: 'betterbit_pro_monthly',
        backendSynced: true,
      })
    )
    assert.equal(result.active, true)
    assert.equal(result.backendSynced, true)
  })

  it('recognizes user cancellation without treating it as a purchase failure', () => {
    assert.equal(isAppleIapCancellation(new AppleIapCancelledError()), true)
    assert.equal(isAppleIapCancellation({ userCancelled: true }), true)
    assert.equal(isAppleIapCancellation(new Error('network failed')), false)
  })

  it('navigates and restores only after active RevenueCat entitlement', () => {
    const ui = readFileSync(
      new URL('../components/settings/AppleIapSubscriptionSection.tsx', import.meta.url),
      'utf8'
    )
    const client = readFileSync(
      new URL('./apple-iap-client.ts', import.meta.url),
      'utf8'
    )

    assert.match(ui, /if \(result\.active\) \{[\s\S]*router\.replace\('\/settings'\)/)
    assert.match(ui, /\[IAP_POST_PURCHASE_NAVIGATION\]/)
    assert.match(ui, /getAppleIapStatus\(user\.id\)/)
    assert.match(ui, /if \(!isAppleIapCancellation\(err\)\)/)
    assert.match(ui, /restoreAppleIap\(userId\)[\s\S]*if \(result\.active\)/)
    assert.match(client, /if \(!entitlement\) \{[\s\S]*throw new Error\('購買未完成'\)/)
  })

  it('logs only safe IAP summaries and never customer info or tokens', () => {
    const client = readFileSync(new URL('./apple-iap-client.ts', import.meta.url), 'utf8')
    for (const tag of [
      'IAP_PURCHASE_STARTED',
      'IAP_PURCHASE_RESULT',
      'IAP_CUSTOMER_INFO',
      'IAP_ENTITLEMENT_STATUS',
      'IAP_VERIFY_REQUEST',
      'IAP_VERIFY_RESPONSE',
    ]) {
      assert.match(client, new RegExp(`\\[${tag}\\]`))
    }
    assert.doesNotMatch(client, /console\.(?:info|warn|error)\([^)]*(?:receipt|token|nonce)/i)
    assert.doesNotMatch(client, /console\.(?:info|warn|error)\([^)]*customerInfo/)
  })
})
