import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  detectSupabasePublicKeyType,
  normalizeSupabaseProjectUrl,
} from './supabase/url'

const PROJECT_ROOT = 'https://example-project.supabase.co'
const MALFORMED_REST_BASE = `${PROJECT_ROOT}/rest/v1`

function makeCaptureClient(baseUrl = MALFORMED_REST_BASE) {
  const urls: string[] = []
  const fetcher: typeof fetch = async input => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    urls.push(url)
    return new Response(JSON.stringify({ error: 'contract probe' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const client = createSupabaseClient(
    normalizeSupabaseProjectUrl(baseUrl),
    'contract-test-public-key',
    {
      global: { fetch: fetcher },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )

  return { client, urls }
}

describe('native Supabase service URL routing', () => {
  it('normalizes a PostgREST service URL to the project root', () => {
    assert.equal(normalizeSupabaseProjectUrl(MALFORMED_REST_BASE), PROJECT_ROOT)
  })

  it('keeps password login on /auth/v1/token', async () => {
    const { client, urls } = makeCaptureClient()
    await client.auth.signInWithPassword({
      email: 'probe@example.com',
      password: 'not-a-real-password',
    })
    assert.equal(
      urls[0],
      `${PROJECT_ROOT}/auth/v1/token?grant_type=password`
    )
  })

  it('keeps signup on /auth/v1/signup', async () => {
    const { client, urls } = makeCaptureClient()
    await client.auth.signUp({
      email: 'probe@example.com',
      password: 'not-a-real-password',
    })
    assert.equal(urls[0], `${PROJECT_ROOT}/auth/v1/signup`)
  })

  it('keeps refresh on /auth/v1/token with refresh_token grant', async () => {
    const { client, urls } = makeCaptureClient()
    await client.auth.refreshSession({ refresh_token: 'contract-probe' })
    assert.equal(
      urls[0],
      `${PROJECT_ROOT}/auth/v1/token?grant_type=refresh_token`
    )
  })

  it('keeps table requests under /rest/v1', async () => {
    const { client, urls } = makeCaptureClient()
    await client.from('user_profiles').select('id')
    assert.match(
      urls[0],
      new RegExp(`^${PROJECT_ROOT}/rest/v1/user_profiles\\?`)
    )
  })

  it('keeps storage requests under /storage/v1', async () => {
    const { client, urls } = makeCaptureClient()
    await client.storage.from('avatars').list('public')
    assert.equal(urls[0], `${PROJECT_ROOT}/storage/v1/object/list/avatars`)
  })

  it('keeps edge function requests under /functions/v1', async () => {
    const { client, urls } = makeCaptureClient()
    await client.functions.invoke('contract-probe', { body: {} })
    assert.equal(urls[0], `${PROJECT_ROOT}/functions/v1/contract-probe`)
  })

  it('keeps realtime on its websocket /realtime/v1 endpoint', () => {
    const { client } = makeCaptureClient()
    assert.equal(
      client.realtime.endPoint,
      'wss://example-project.supabase.co/realtime/v1/websocket'
    )
  })

  it('does not duplicate a service path from a full absolute URL', () => {
    assert.equal(
      normalizeSupabaseProjectUrl(
        `${PROJECT_ROOT}/auth/v1/token?grant_type=password`
      ),
      PROJECT_ROOT
    )
    assert.equal(normalizeSupabaseProjectUrl(PROJECT_ROOT), PROJECT_ROOT)
  })

  it('recognizes publishable and legacy anon key types without exposing values', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'anon' })).toString(
      'base64url'
    )
    assert.equal(
      detectSupabasePublicKeyType('sb_publishable_contract_probe'),
      'publishable'
    )
    assert.equal(
      detectSupabasePublicKeyType(`header.${payload}.signature`),
      'legacy-anon'
    )
    assert.equal(detectSupabasePublicKeyType('not-public'), 'invalid')
  })

  it('keeps BetterBit API routing separate from Supabase routing', () => {
    const apiClientSource = readFileSync(
      new URL('./api/client.ts', import.meta.url),
      'utf8'
    )
    assert.match(apiClientSource, /NEXT_PUBLIC_API_BASE_URL/)
    assert.match(apiClientSource, /return `\$\{base\}\$\{normalized\}`/)
    assert.doesNotMatch(apiClientSource, /SUPABASE_URL/)
  })

  it('keeps the web client on createBrowserClient', () => {
    const supabaseClientSource = readFileSync(
      new URL('./supabase/client.ts', import.meta.url),
      'utf8'
    )
    assert.match(
      supabaseClientSource,
      /createBrowserClient\(projectUrl, SUPABASE_ANON_KEY\)/
    )
  })
})
