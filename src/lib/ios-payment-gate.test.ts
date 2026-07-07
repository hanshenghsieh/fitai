import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAppleIapEnabled } from './apple-iap-config'
import {
  hasIosPlatformCookie,
  isCapacitorUserAgent,
  shouldBlockExternalPaymentsOnServer,
  shouldGrantFullAccessPreIap,
  shouldShowAppleIapClient,
} from './ios-payment-gate'

describe('ios-payment-gate', () => {
  it('detects Capacitor user agent', () => {
    assert.equal(isCapacitorUserAgent('Mozilla/5.0 Capacitor iOS'), true)
    assert.equal(isCapacitorUserAgent('Mozilla/5.0 Safari'), false)
  })

  it('detects iOS platform cookie', () => {
    assert.equal(hasIosPlatformCookie('session=1; bb_native_ios=1'), true)
    assert.equal(hasIosPlatformCookie('session=1'), false)
  })

  it('blocks external payments for iOS cookie header', () => {
    const headers = new Headers({ cookie: 'bb_native_ios=1' })
    assert.equal(shouldBlockExternalPaymentsOnServer(headers), true)
  })

  it('blocks external payments for x-betterbit-platform ios', () => {
    const headers = new Headers({ 'x-betterbit-platform': 'ios' })
    assert.equal(shouldBlockExternalPaymentsOnServer(headers), true)
  })

  it('grants full access pre-IAP for iOS cookie header when IAP disabled', () => {
    const prev = process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED
    process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED = 'false'
    try {
      const headers = new Headers({ cookie: 'bb_native_ios=1' })
      assert.equal(shouldGrantFullAccessPreIap(headers), true)
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED
      else process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED = prev
    }
  })

  it('stops pre-IAP full access when Apple IAP is enabled', () => {
    const prev = process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED
    process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED = 'true'
    try {
      const headers = new Headers({ cookie: 'bb_native_ios=1' })
      assert.equal(shouldGrantFullAccessPreIap(headers), false)
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED
      else process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED = prev
    }
  })

  it('allows external payments on plain web headers when safe mode off', () => {
    const prevSafe = process.env.NEXT_PUBLIC_APP_STORE_SAFE_MODE
    const prevIap = process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED
    process.env.NEXT_PUBLIC_APP_STORE_SAFE_MODE = 'false'
    process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED = 'false'
    try {
      const headers = new Headers({
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      })
      assert.equal(shouldBlockExternalPaymentsOnServer(headers), false)
    } finally {
      if (prevSafe === undefined) delete process.env.NEXT_PUBLIC_APP_STORE_SAFE_MODE
      else process.env.NEXT_PUBLIC_APP_STORE_SAFE_MODE = prevSafe
      if (prevIap === undefined) delete process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED
      else process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED = prevIap
    }
  })

  it('reports Apple IAP enabled from env', () => {
    const prev = process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED
    process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED = 'true'
    try {
      assert.equal(isAppleIapEnabled(), true)
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED
      else process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED = prev
    }
  })

  it('does not show Apple IAP UI on server', () => {
    assert.equal(shouldShowAppleIapClient(), false)
  })
})
