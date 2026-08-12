import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sanitizeSentryEvent } from './redact'

describe('Phase 2 TASK 1 — Sentry event redaction', () => {
  it('strips a photo/image field from extra context', () => {
    const event = {
      extra: { photo_data_url: 'data:image/jpeg;base64,AAAA...', operation: 'parse' },
    }
    const out = sanitizeSentryEvent(event)
    assert.equal((out.extra as Record<string, unknown>).photo_data_url, '[redacted]')
    assert.equal((out.extra as Record<string, unknown>).operation, 'parse')
  })

  it('strips raw health values (weight/body_fat/calories) from extra context', () => {
    const event = {
      extra: { weight_kg: 69, body_fat_pct: 18, calories: 650, feature: 'inbody-parse' },
    }
    const out = sanitizeSentryEvent(event)
    const extra = out.extra as Record<string, unknown>
    assert.equal(extra.weight_kg, '[redacted]')
    assert.equal(extra.body_fat_pct, '[redacted]')
    assert.equal(extra.calories, '[redacted]')
    assert.equal(extra.feature, 'inbody-parse')
  })

  it('strips a raw AI prompt/response field', () => {
    const event = {
      extra: { ai_response: 'the full raw model output...', ai_prompt: 'the full raw prompt...' },
    }
    const out = sanitizeSentryEvent(event)
    const extra = out.extra as Record<string, unknown>
    assert.equal(extra.ai_response, '[redacted]')
    assert.equal(extra.ai_prompt, '[redacted]')
  })

  it('removes email/username from the Sentry user identity, keeping only the internal id', () => {
    const event = { user: { id: 'user-uuid-123', email: 'someone@example.com', username: 'someone' } }
    const out = sanitizeSentryEvent(event)
    const user = out.user as Record<string, unknown>
    assert.equal(user.id, 'user-uuid-123')
    assert.ok(!('email' in user))
    assert.ok(!('username' in user))
  })

  it('truncates an overly long string value even under a non-blocked key', () => {
    const event = { extra: { safe_but_huge: 'x'.repeat(1000) } }
    const out = sanitizeSentryEvent(event)
    const value = (out.extra as Record<string, unknown>).safe_but_huge as string
    assert.ok(value.length < 1000)
    assert.match(value, /truncated/)
  })

  it('sanitizes breadcrumbs the same way as extra context', () => {
    const event = {
      breadcrumbs: [{ message: 'ok', data: { meal_description: 'full meal text should be redacted' } }],
    }
    const out = sanitizeSentryEvent(event)
    const breadcrumb = (out.breadcrumbs as Record<string, unknown>[])[0]
    const data = breadcrumb!.data as Record<string, unknown>
    assert.equal(data.meal_description, '[redacted]')
  })

  it('leaves safe, non-sensitive fields untouched', () => {
    const event = { extra: { feature: 'checkin-save', operation: 'upsert', platform: 'ios' } }
    const out = sanitizeSentryEvent(event)
    assert.deepEqual(out.extra, { feature: 'checkin-save', operation: 'upsert', platform: 'ios' })
  })
})
