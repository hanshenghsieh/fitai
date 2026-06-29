import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  hasIosPlatformCookie,
  isCapacitorUserAgent,
  shouldBlockExternalPaymentsOnServer,
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

  it('allows external payments on plain web headers when safe mode off', () => {
    const prev = process.env.NEXT_PUBLIC_APP_STORE_SAFE_MODE
    process.env.NEXT_PUBLIC_APP_STORE_SAFE_MODE = 'false'
    try {
      const headers = new Headers({
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      })
      assert.equal(shouldBlockExternalPaymentsOnServer(headers), false)
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_STORE_SAFE_MODE
      else process.env.NEXT_PUBLIC_APP_STORE_SAFE_MODE = prev
    }
  })
})
