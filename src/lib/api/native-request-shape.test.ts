import { test, mock, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Build 38 BUG 1 — "不能只測 server helper" — this exercises the REAL
 * client request-building code (apiFetch -> nativeHttpFetch ->
 * CapacitorHttp.request) end to end, using node:test's mock.module to
 * stand in for the native bridge and the Supabase browser client, rather
 * than reading source text with regex. Every assertion here is against the
 * exact object that would have been handed to the native iOS bridge.
 *
 * Requires `--experimental-test-module-mocks` (see package.json's "test"
 * script) — mock.module() is not available without it.
 *
 * mock.module() must be set up once, before @/lib/api/client is first
 * imported — ESM module instances are cached, so re-mocking mid-file does
 * not rebind an already-loaded module's captured imports. Instead, the
 * mocks here read from shared mutable state that each test resets.
 */

interface CapturedRequest {
  url: string
  method: string
  headers: Record<string, string>
  data?: unknown
  params?: unknown
  responseType: string
}

let capturedRequests: CapturedRequest[] = []
let currentAccessToken: string | null = 'fake-jwt-token-abc123'
let apiFetch: typeof import('@/lib/api/client').apiFetch

before(async () => {
  mock.module('@capacitor/core', {
    namedExports: {
      CapacitorHttp: {
        request: async (opts: CapturedRequest) => {
          capturedRequests.push(opts)
          return { data: '{"ok":true}', status: 200, headers: {} }
        },
      },
    },
  })
  mock.module('@/lib/capacitor-native', {
    namedExports: { isCapacitorNative: () => true },
  })
  mock.module('@/lib/supabase/client', {
    namedExports: {
      createClient: () => ({
        auth: {
          getSession: async () => ({
            data: { session: currentAccessToken ? { access_token: currentAccessToken } : null },
          }),
        },
      }),
    },
  })
  ;({ apiFetch } = await import('@/lib/api/client'))
})

beforeEach(() => {
  capturedRequests = []
  currentAccessToken = 'fake-jwt-token-abc123'
})

test('Build 38 BUG 1 — POST /api/settings/body: real native request URL is short and fixed, body never leaks into it', async () => {
  await apiFetch('/api/settings/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight_kg: 68.5, body_fat_pct: null, waist_cm: null, measured_at: '2026-08-12' }),
  })

  assert.equal(capturedRequests.length, 1)
  const req = capturedRequests[0]!
  assert.equal(req.method, 'POST')
  assert.equal(req.url, 'https://www.betterbit.app/api/settings/body')
  assert.ok(req.url.length < 100, `expected a short URL, got ${req.url.length} chars: ${req.url}`)
  assert.doesNotMatch(req.url, /\?/, 'the URL must never carry a query string for this POST')
  assert.equal('params' in req, false, 'CapacitorHttp.request must never receive a params field for this call')
})

test('Build 38 BUG 1 — the POST body reaches CapacitorHttp only via `data`, structurally identical to what was sent', async () => {
  const payload = { weight_kg: 68.5, body_fat_pct: null, waist_cm: null, measured_at: '2026-08-12' }
  await apiFetch('/api/settings/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const req = capturedRequests[0]!
  assert.deepEqual(req.data, payload)
})

test('Build 38 BUG 1 — URL length stays fixed no matter how large the request body is (a huge notes-like payload does not leak into the URL)', async () => {
  const hugePayload = {
    weight_kg: 68.5,
    body_fat_pct: null,
    waist_cm: null,
    measured_at: '2026-08-12',
    // Simulate the kind of oversized payload discovered in production
    // (base64 images embedded in checkin notes) to prove even a
    // pathologically large body cannot inflate the request URL.
    _stress_test_blob: 'x'.repeat(500_000),
  }
  await apiFetch('/api/settings/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hugePayload),
  })
  const req = capturedRequests[0]!
  assert.equal(req.url, 'https://www.betterbit.app/api/settings/body')
  assert.ok(req.url.length < 100, `URL length must stay fixed regardless of body size, got ${req.url.length}`)
})

test('Build 38 BUG 1 — Authorization header is a normal-length Bearer token, never the full session object, never in the URL', async () => {
  currentAccessToken = 'fake-jwt-token-abc123'
  await apiFetch('/api/settings/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight_kg: 68.5 }),
  })
  const req = capturedRequests[0]!
  const authHeader = req.headers['authorization']
  assert.ok(authHeader, 'Authorization header must be present')
  assert.match(authHeader!, /^Bearer /)
  assert.ok(authHeader!.length < 4096, `Authorization header unexpectedly large: ${authHeader!.length} chars`)
  assert.doesNotMatch(req.url, /fake-jwt-token/, 'the token must never appear in the URL')
})

test('Build 38 BUG 1 — [API_REQUEST] diagnostic log reports structure (lengths/counts) for the next real-device repro, never raw body content or the full token', async () => {
  currentAccessToken = 'fake-jwt-token-abc123'
  const logs: unknown[][] = []
  const originalLog = console.log
  console.log = (...args: unknown[]) => logs.push(args)
  try {
    await apiFetch('/api/settings/body', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_kg: 68.5, secret_looking_field: 'should-not-appear-verbatim' }),
    })
  } finally {
    console.log = originalLog
  }
  const requestLog = logs.find(l => l[0] === '[API_REQUEST]')
  assert.ok(requestLog, '[API_REQUEST] must be logged for every native request')
  const payload = requestLog![1] as Record<string, unknown>
  assert.equal(typeof payload.url_length, 'number')
  assert.equal(typeof payload.header_count, 'number')
  assert.equal(typeof payload.body_length, 'number')
  assert.equal(typeof payload.authorization_length, 'number')
  const serialized = JSON.stringify(payload)
  assert.doesNotMatch(serialized, /should-not-appear-verbatim/, 'the diagnostic log must never include raw body content')
  assert.doesNotMatch(serialized, /fake-jwt-token-abc123/, 'the diagnostic log must never include the raw token value')
})

test('Build 38 BUG 1 — with no session token, the request still has a short fixed URL (no fallback that stuffs auth into the URL)', async () => {
  currentAccessToken = null
  await apiFetch('/api/settings/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight_kg: 68.5 }),
  })
  const req = capturedRequests[0]!
  assert.equal(req.url, 'https://www.betterbit.app/api/settings/body')
  assert.equal(req.headers['authorization'], undefined)
})

test('Build 38 BUG 1 — X-Client-Request-Id correlation header is present and short (never the full body/session)', async () => {
  await apiFetch('/api/settings/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weight_kg: 68.5 }),
  })
  const req = capturedRequests[0]!
  const reqId = req.headers['x-client-request-id']
  assert.ok(reqId, 'X-Client-Request-Id must be present for client/server log correlation')
  assert.ok(reqId!.length < 100, `correlation id unexpectedly large: ${reqId!.length} chars`)
})

// ---------------------------------------------------------------------------
// STEP 6 (user-specified acceptance scenarios) — exact "新增體重" payload
// shapes, matching BodyDataSettingsView.tsx's handleAddLog exactly.
// ---------------------------------------------------------------------------

const BASE_URL = 'https://www.betterbit.app/api/settings/body'

test('STEP 6 — weight=68.5, bodyFat/waist/note empty: URL is only https://www.betterbit.app/api/settings/body, nothing else appended', async () => {
  await apiFetch('/api/settings/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weight_kg: 68.5,
      body_fat_pct: null,
      waist_cm: null,
      measured_at: '2026-08-13',
    }),
  })
  const req = capturedRequests[0]!
  assert.equal(req.method, 'POST')
  assert.equal(req.url, BASE_URL, `URL must be exactly the endpoint, got: ${req.url}`)
  assert.doesNotMatch(req.url, /68\.5/, 'the weight value must not appear inside the URL itself')
  assert.doesNotMatch(req.url, /2026-08-13/, 'the date value must not appear inside the URL itself')
})

test('STEP 6 — weight+bodyFat+waist+note all filled: URL length is IDENTICAL to the empty-fields case; only body grows', async () => {
  await apiFetch('/api/settings/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weight_kg: 68.5,
      body_fat_pct: null,
      waist_cm: null,
      measured_at: '2026-08-13',
    }),
  })
  const emptyFieldsUrl = capturedRequests[0]!.url
  const emptyFieldsBodyLength = JSON.stringify({
    weight_kg: 68.5,
    body_fat_pct: null,
    waist_cm: null,
    measured_at: '2026-08-13',
  }).length

  capturedRequests = []

  const fullBody = JSON.stringify({
    weight_kg: 68.5,
    body_fat_pct: 22.5,
    waist_cm: 80,
    muscle_mass_kg: 55.2,
    measured_at: '2026-08-13',
    note: 'a fairly long free-text note about how the measurement was taken, including context the user typed in manually',
  })
  await apiFetch('/api/settings/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: fullBody,
  })
  const fullFieldsReq = capturedRequests[0]!

  assert.equal(fullFieldsReq.url, emptyFieldsUrl, 'URL must be byte-for-byte identical regardless of how many optional fields are filled')
  assert.equal(fullFieldsReq.url.length, BASE_URL.length)
  assert.ok(
    fullBody.length > emptyFieldsBodyLength,
    'sanity check: the fuller payload really is a bigger body'
  )
  // The growth from more fields must land entirely in `data` (the body), never in `url`.
  assert.equal(JSON.stringify(fullFieldsReq.data).length, fullBody.length)
})

test('STEP 6 — neither payload ever produces a URL anywhere near Cloudflare\'s 32KB 414 threshold', async () => {
  await apiFetch('/api/settings/body', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weight_kg: 68.5,
      body_fat_pct: 22.5,
      waist_cm: 80,
      muscle_mass_kg: 55.2,
      measured_at: '2026-08-13',
      note: 'x'.repeat(2000),
    }),
  })
  const req = capturedRequests[0]!
  assert.ok(req.url.length < 32_000, `url length ${req.url.length} approaches the Cloudflare 414 threshold`)
  assert.equal(req.url, BASE_URL)
})
