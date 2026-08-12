import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getAccessStatus,
  isAppleReviewDemoEmail,
  isPremiumSubscription,
} from './subscription-access'
import { APPLE_REVIEW_DEMO_EMAIL } from './subscription-types'

describe('subscription-access', () => {
  const recentCreated = new Date().toISOString()

  it('grants premium to apple review demo email', () => {
    const access = getAccessStatus('2020-01-01T00:00:00.000Z', null, {
      userEmail: APPLE_REVIEW_DEMO_EMAIL,
    })
    assert.equal(access.hasFullAccess, true)
    assert.equal(access.isSubscribed, true)
    assert.equal(access.isPremium, true)
    assert.equal(access.subscriptionSource, 'apple_review_demo')
    assert.equal(access.plan, 'review_demo')
  })

  it('recognizes apple_review_demo subscription source', () => {
    assert.equal(
      isPremiumSubscription({
        status: 'active',
        subscription_source: 'apple_review_demo',
        plan: 'review_demo',
      }),
      true
    )
  })

  it('recognizes manual_grant subscription source', () => {
    assert.equal(
      isPremiumSubscription({
        status: 'active',
        subscription_source: 'manual_grant',
        plan: 'premium',
      }),
      true
    )
  })

  it('recognizes stripe active subscription', () => {
    assert.equal(isPremiumSubscription({ status: 'active', subscription_source: 'stripe' }), true)
  })

  it('infers apple_iap from synthetic subscription id', () => {
    assert.equal(
      isPremiumSubscription({
        status: 'active',
        stripe_subscription_id: 'apple_iap_tx123',
      }),
      true
    )
  })

  it('infers manual_grant from synthetic subscription id without source column', () => {
    assert.equal(
      isPremiumSubscription({
        status: 'active',
        stripe_subscription_id: 'manual_grant_5556336f-1b58-464f-ae42-310338f7c267',
      }),
      true
    )
    const access = getAccessStatus('2020-01-01T00:00:00.000Z', {
      status: 'active',
      stripe_subscription_id: 'manual_grant_5556336f-1b58-464f-ae42-310338f7c267',
      current_period_end: '2099-12-31T23:59:59.000Z',
    } as never)
    assert.equal(access.hasFullAccess, true)
    assert.equal(access.isSubscribed, true)
    assert.equal(access.trialExpired, false)
  })

  it('does not grant premium when trial expired and no subscription', () => {
    const access = getAccessStatus('2020-01-01T00:00:00.000Z', null, {
      userEmail: 'user@example.com',
    })
    assert.equal(access.hasFullAccess, false)
    assert.equal(access.trialExpired, true)
  })

  it('grants trial access for new users', () => {
    const access = getAccessStatus(recentCreated, null, { userEmail: 'user@example.com' })
    assert.equal(access.hasFullAccess, true)
    assert.equal(access.isTrial, true)
  })

  it('isAppleReviewDemoEmail is case-insensitive', () => {
    assert.equal(isAppleReviewDemoEmail('Apple-Review@Betterbit.tw'), true)
    assert.equal(isAppleReviewDemoEmail('other@betterbit.tw'), false)
  })

  describe('P0-5 wall-clock expiration', () => {
    it('active with a future current_period_end → premium', () => {
      assert.equal(
        isPremiumSubscription({
          status: 'active',
          subscription_source: 'stripe',
          current_period_end: '2099-12-31T23:59:59.000Z',
        }),
        true
      )
    })

    it('active but current_period_end already passed → NOT premium', () => {
      assert.equal(
        isPremiumSubscription({
          status: 'active',
          subscription_source: 'stripe',
          current_period_end: '2020-01-01T00:00:00.000Z',
        }),
        false
      )
    })

    it('cancelled status → NOT premium, regardless of current_period_end', () => {
      assert.equal(
        isPremiumSubscription({
          status: 'cancelled',
          subscription_source: 'stripe',
          current_period_end: '2099-12-31T23:59:59.000Z',
        }),
        false
      )
    })

    it('trialing with a future trial end (current_period_end) → premium', () => {
      assert.equal(
        isPremiumSubscription({
          status: 'trialing',
          subscription_source: 'stripe',
          current_period_end: '2099-12-31T23:59:59.000Z',
        }),
        true
      )
    })

    it('trialing with an expired trial end → NOT premium', () => {
      assert.equal(
        isPremiumSubscription({
          status: 'trialing',
          subscription_source: 'stripe',
          current_period_end: '2020-01-01T00:00:00.000Z',
        }),
        false
      )
    })

    it('active with no current_period_end at all → still premium (nothing to expire against)', () => {
      assert.equal(
        isPremiumSubscription({
          status: 'active',
          subscription_source: 'stripe',
          current_period_end: null,
        }),
        true
      )
    })

    it('manual grant (is_premium true) with an expired current_period_end → still premium (lifetime override, not a recurring period)', () => {
      assert.equal(
        isPremiumSubscription({
          status: 'active',
          subscription_source: 'manual_grant',
          is_premium: true,
          current_period_end: '2020-01-01T00:00:00.000Z',
        }),
        true
      )
    })

    it('unparseable current_period_end fails open (does not reject a genuinely active subscription)', () => {
      assert.equal(
        isPremiumSubscription({
          status: 'active',
          subscription_source: 'stripe',
          current_period_end: 'not-a-real-date',
        }),
        true
      )
    })

    it('getAccessStatus reflects an expired period as not subscribed / no full access', () => {
      const access = getAccessStatus('2020-01-01T00:00:00.000Z', {
        status: 'active',
        subscription_source: 'stripe',
        current_period_end: '2020-02-01T00:00:00.000Z',
      })
      assert.equal(access.isSubscribed, false)
      assert.equal(access.hasFullAccess, false)
      assert.equal(access.trialExpired, true)
    })
  })
})
