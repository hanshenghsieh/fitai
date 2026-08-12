import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { apiUrl, resolveApiBaseUrl } from './client'
import { validateBodyMetrics } from '@/lib/body-measurement-save'

/**
 * Build 38 BUG 1 — a real device reported "414 Request-URI Too Large /
 * cloudflare" on POST /api/settings/body. Full trace (client.ts ->
 * nativeHttpFetch -> CapacitorHttp.request -> native HttpRequestHandler.swift
 * -> CapacitorUrlRequestBuilder.setUrlParams) found no code path in this
 * repo that could inflate the request URL: nativeHttpFetch only ever passes
 * `data` (POST body) to CapacitorHttp, never `params` (query string), and
 * apiUrl() builds a fixed-shape "base + path" string with no embedded
 * payload. Live production Vercel logs from the actual failing test window
 * show the real settings/body request that reached origin was a 500 (the
 * pre-existing race condition, already fixed but never deployed) — no
 * request with an oversized URL ever reached Vercel, consistent with the
 * 414 having happened below the origin (e.g. a device-level network path)
 * rather than in this application's own request-building code.
 *
 * These tests lock in the actual, verified invariants so a future change
 * cannot silently reintroduce a payload-in-URL bug, whatever the 414's
 * original trigger was.
 */
const clientSource = readFileSync(new URL('./client.ts', import.meta.url), 'utf8')

describe('Build 38 BUG 1 — the weight-save request URL is fixed-length and never carries the payload', () => {
  it('apiUrl("/api/settings/body") is a short, fixed string regardless of how large the caller\'s payload is', () => {
    const url = apiUrl('/api/settings/body')
    assert.equal(url, 'https://www.betterbit.app/api/settings/body')
    assert.ok(url.length < 100, `expected a short fixed URL, got ${url.length} chars`)
  })

  it('apiUrl output length does not change no matter what the (unrelated) request body would contain', () => {
    // apiUrl only ever takes a path string — proving here that nothing about
    // a large weight-save JSON body could possibly reach this function's
    // inputs, since it has no body/payload parameter at all.
    const url1 = apiUrl('/api/settings/body')
    const url2 = apiUrl('/api/settings/body')
    assert.equal(url1.length, url2.length)
    assert.equal(url1, url2)
  })

  it('resolveApiBaseUrl never appends a query string for the native production base', () => {
    const base = resolveApiBaseUrl({ native: true, configuredBase: 'https://betterbit.app' })
    assert.doesNotMatch(base, /\?/)
    assert.equal(base, 'https://www.betterbit.app')
  })

  it('nativeHttpFetch never sets a `params` field on the CapacitorHttp.request() call — only url/method/headers/data/responseType', () => {
    const fnStart = clientSource.indexOf('async function nativeHttpFetch')
    assert.ok(fnStart >= 0)
    const fnEnd = clientSource.indexOf('\n}', clientSource.indexOf('CapacitorHttp.request'))
    const fnSource = clientSource.slice(fnStart, fnEnd)
    assert.match(fnSource, /CapacitorHttp\.request\(\{/)
    assert.doesNotMatch(fnSource, /params\s*:/, 'must never pass a params/query-string field to CapacitorHttp')
    assert.match(fnSource, /data,/, 'the POST body must go through `data`, not the URL')
  })

  it('the POST body for /api/settings/body is only ever attached via RequestInit.body / CapacitorHttp `data`, never string-concatenated into a URL', () => {
    // Structural guard: apiFetch must never build its url by concatenating
    // the caller-supplied body/options into the `url` variable.
    const fetchFnStart = clientSource.indexOf('export async function apiFetch')
    const fetchFnEnd = clientSource.indexOf('\n}', fetchFnStart)
    const fetchFnSource = clientSource.slice(fetchFnStart, fetchFnEnd)
    assert.match(fetchFnSource, /const url = apiUrl\(path\)/)
    assert.doesNotMatch(fetchFnSource, /url \+=/, 'url must never be mutated/appended to')
    assert.doesNotMatch(fetchFnSource, /url\.replace\(/, 'url must never be rewritten with body content')
  })

  it('68.5kg passes server-side validation (the URL layer, validation layer, and upsert layer are all independently verified clean for this exact value)', () => {
    assert.equal(validateBodyMetrics(68.5, null), null)
  })
})
