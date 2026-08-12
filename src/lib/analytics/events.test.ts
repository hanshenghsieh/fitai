import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_PROPERTY_ALLOWLIST,
  isAnalyticsEventName,
  sanitizeAnalyticsProperties,
} from './events'

const SNAKE_CASE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/

describe('Phase 2 TASK 8 — analytics event schema', () => {
  it('every canonical event name is snake_case', () => {
    for (const name of ANALYTICS_EVENT_NAMES) {
      assert.match(name, SNAKE_CASE, `${name} is not snake_case`)
    }
  })

  it('every event name has a corresponding allowlist entry (no orphaned schema)', () => {
    for (const name of ANALYTICS_EVENT_NAMES) {
      assert.ok(name in ANALYTICS_PROPERTY_ALLOWLIST, `${name} missing from ANALYTICS_PROPERTY_ALLOWLIST`)
    }
  })

  it('isAnalyticsEventName rejects unknown/invented event names', () => {
    assert.equal(isAnalyticsEventName('account_created'), true)
    assert.equal(isAnalyticsEventName('user_did_something_random'), false)
    assert.equal(isAnalyticsEventName(123), false)
    assert.equal(isAnalyticsEventName(null), false)
  })

  it('required properties for meal_log_succeeded pass through untouched', () => {
    const out = sanitizeAnalyticsProperties('meal_log_succeeded', {
      source: 'photo',
      meal_type: 'meal1',
      nutrition_status: 'official',
      match_type: 'exact',
      confidence_bucket: 'high',
      duration_ms: 4200,
    })
    assert.deepEqual(out, {
      source: 'photo',
      meal_type: 'meal1',
      nutrition_status: 'official',
      match_type: 'exact',
      confidence_bucket: 'high',
      duration_ms: 4200,
    })
  })

  it('required properties for subscription_started pass through untouched', () => {
    const out = sanitizeAnalyticsProperties('subscription_started', {
      product_id: 'betterbit_pro_monthly',
      billing_period: 'monthly',
      platform: 'ios',
      provider: 'apple_iap',
    })
    assert.deepEqual(out, {
      product_id: 'betterbit_pro_monthly',
      billing_period: 'monthly',
      platform: 'ios',
      provider: 'apple_iap',
    })
  })

  describe('PII / health-sensitive values are never sent', () => {
    it('drops an email passed under an allowed-looking key', () => {
      const out = sanitizeAnalyticsProperties('account_created', {
        auth_method: 'email',
        platform: 'ios',
        // Not a real property of this event — must be dropped regardless.
        email: 'user@example.com',
      } as Record<string, unknown>)
      assert.deepEqual(out, { auth_method: 'email', platform: 'ios' })
      assert.ok(!('email' in out))
    })

    it('drops raw health values (calories/weight/body_fat) even if a caller tries to attach them', () => {
      const out = sanitizeAnalyticsProperties('meal_log_succeeded', {
        source: 'photo',
        meal_type: 'meal1',
        nutrition_status: 'official',
        match_type: 'exact',
        confidence_bucket: 'high',
        duration_ms: 100,
        calories: 650,
        user_weighs_kg: 69,
      } as Record<string, unknown>)
      assert.ok(!('calories' in out))
      assert.ok(!('user_weighs_kg' in out))
    })

    it('drops any key not on the event allowlist, even structurally valid ones', () => {
      const out = sanitizeAnalyticsProperties('app_opened', {
        unexpected_extra_field: 'should not survive',
      } as Record<string, unknown>)
      assert.deepEqual(out, {})
    })

    it('drops non-primitive values (objects/arrays) even under an allowed key name', () => {
      const out = sanitizeAnalyticsProperties('meal_log_failed', {
        source: 'photo',
        failure_type: 'timeout',
        stage: { nested: 'object should be dropped' },
      } as unknown as Record<string, unknown>)
      assert.equal(out.source, 'photo')
      assert.equal(out.failure_type, 'timeout')
      assert.ok(!('stage' in out))
    })
  })
})
