import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getSanitizedLoginError } from './login-error.ts'

describe('login-error', () => {
  it('maps invalid credentials', () => {
    const result = getSanitizedLoginError({ message: 'Invalid login credentials', status: 400 })
    assert.match(result.message, /帳號或密碼/)
  })

  it('maps network failures', () => {
    const result = getSanitizedLoginError({
      name: 'TypeError',
      message: 'Failed to fetch',
    })
    assert.match(result.message, /連線不穩/)
  })

  it('maps CORS failures', () => {
    const result = getSanitizedLoginError({
      message: 'blocked by CORS policy',
    })
    assert.match(result.message, /登入服務暫時無法使用/)
  })

  it('maps unknown errors', () => {
    const result = getSanitizedLoginError({ message: 'something else' })
    assert.equal(result.message, '登入失敗，請稍後再試。')
  })
})
