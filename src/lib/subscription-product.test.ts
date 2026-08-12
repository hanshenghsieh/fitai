import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  billingPeriodFromAppleIapProductId,
  billingPeriodFromStripeInterval,
  environmentFromStripeLivemode,
  environmentFromAppleIapSandboxFlag,
} from './subscription-product'
import {
  APPLE_IAP_MONTHLY_PRODUCT_ID,
  APPLE_IAP_ANNUAL_PRODUCT_ID,
} from '@/lib/apple-iap-config'

describe('Phase 2 TASK 5 — subscription product classification', () => {
  describe('Apple IAP / RevenueCat product id -> billing_period', () => {
    it('monthly product id -> monthly', () => {
      assert.equal(billingPeriodFromAppleIapProductId(APPLE_IAP_MONTHLY_PRODUCT_ID), 'monthly')
    })

    it('annual product id -> annual', () => {
      assert.equal(billingPeriodFromAppleIapProductId(APPLE_IAP_ANNUAL_PRODUCT_ID), 'annual')
    })

    it('an unrecognized/legacy product id -> unknown, never guessed', () => {
      assert.equal(billingPeriodFromAppleIapProductId('some_other_product_id'), 'unknown')
    })

    it('null/undefined product id -> unknown', () => {
      assert.equal(billingPeriodFromAppleIapProductId(null), 'unknown')
      assert.equal(billingPeriodFromAppleIapProductId(undefined), 'unknown')
    })
  })

  describe('Stripe recurring interval -> billing_period', () => {
    it("'month' -> monthly", () => {
      assert.equal(billingPeriodFromStripeInterval('month'), 'monthly')
    })

    it("'year' -> annual", () => {
      assert.equal(billingPeriodFromStripeInterval('year'), 'annual')
    })

    it("'week' or 'day' or missing -> unknown, never guessed", () => {
      assert.equal(billingPeriodFromStripeInterval('week'), 'unknown')
      assert.equal(billingPeriodFromStripeInterval('day'), 'unknown')
      assert.equal(billingPeriodFromStripeInterval(null), 'unknown')
      assert.equal(billingPeriodFromStripeInterval(undefined), 'unknown')
    })
  })

  describe('environment classification', () => {
    it('Stripe livemode true/false/unset -> production/sandbox/unknown', () => {
      assert.equal(environmentFromStripeLivemode(true), 'production')
      assert.equal(environmentFromStripeLivemode(false), 'sandbox')
      assert.equal(environmentFromStripeLivemode(null), 'unknown')
      assert.equal(environmentFromStripeLivemode(undefined), 'unknown')
    })

    it('Apple IAP is_sandbox true/false/unset -> sandbox/production/unknown', () => {
      assert.equal(environmentFromAppleIapSandboxFlag(true), 'sandbox')
      assert.equal(environmentFromAppleIapSandboxFlag(false), 'production')
      assert.equal(environmentFromAppleIapSandboxFlag(null), 'unknown')
      assert.equal(environmentFromAppleIapSandboxFlag(undefined), 'unknown')
    })
  })
})
