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
})
