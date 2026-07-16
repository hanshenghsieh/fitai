import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveApiBaseUrl } from '@/lib/api/client'

describe('API base routing for Founder Preview', () => {
  it('keeps localhost web mutations on the same origin', () => {
    assert.equal(
      resolveApiBaseUrl({
        configuredBase: 'https://www.betterbit.app',
        browserOrigin: 'http://localhost:3010',
        native: false,
      }),
      'http://localhost:3010'
    )
    assert.equal(
      resolveApiBaseUrl({
        configuredBase: 'https://www.betterbit.app',
        browserOrigin: 'http://127.0.0.1:3010',
        native: false,
      }),
      'http://127.0.0.1:3010'
    )
  })

  it('keeps native and production web traffic on the configured canonical API', () => {
    assert.equal(
      resolveApiBaseUrl({
        configuredBase: 'https://betterbit.app/',
        browserOrigin: 'capacitor://localhost',
        native: true,
      }),
      'https://www.betterbit.app'
    )
    assert.equal(
      resolveApiBaseUrl({
        configuredBase: 'https://www.betterbit.app',
        browserOrigin: 'https://www.betterbit.app',
        native: false,
      }),
      'https://www.betterbit.app'
    )
  })
})
