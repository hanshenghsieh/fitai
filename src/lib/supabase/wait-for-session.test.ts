import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { waitForSession } from './wait-for-session'
import { hasPersistedNativeSession } from './client'

type FakeClient = Parameters<typeof waitForSession>[0]

interface FakeSession {
  user: { id: string }
  access_token?: string
}

function makeClient(
  sequence: Array<FakeSession | null>,
  getSessionError: { message: string } | null = null
) {
  let i = 0
  return {
    auth: {
      async getSession() {
        const session = sequence[Math.min(i, sequence.length - 1)]
        i++
        return { data: { session }, error: getSessionError }
      },
    },
  } as unknown as FakeClient
}

test('waitForSession returns the session immediately when present', async () => {
  const client = makeClient([{ user: { id: 'u1' } }])
  const session = await waitForSession(client, { retries: 3, delayMs: 1 })
  assert.equal(session?.user.id, 'u1')
})

test('waitForSession retries until the session hydrates (WKWebView lag)', async () => {
  // null on first two reads (token still rehydrating), then present.
  const client = makeClient([null, null, { user: { id: 'u2' } }])
  const session = await waitForSession(client, { retries: 5, delayMs: 1 })
  assert.equal(session?.user.id, 'u2')
})

test('waitForSession returns null when the session never appears', async () => {
  const client = makeClient([null])
  const session = await waitForSession(client, { retries: 2, delayMs: 1 })
  assert.equal(session, null)
})

test('Case 1: matching user, token, and persisted storage stabilize immediately', async () => {
  const client = makeClient([{ user: { id: 'new-user' }, access_token: 'token-1' }])
  const result = await waitForSession(client, {
    expectedUserId: 'new-user',
    requireAccessToken: true,
    verifyPersistedStorage: true,
    persistedSessionVerifier: session =>
      session.user.id === 'new-user' && session.access_token === 'token-1',
    timeoutMs: 20,
    intervalMs: 1,
  })

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.session.user.id, 'new-user')

  const registerSource = readFileSync(
    new URL('../../app/register/page.tsx', import.meta.url),
    'utf8'
  )
  assert.match(registerSource, /window\.location\.assign\('\/onboarding\?login=1'\)/)
  assert.doesNotMatch(registerSource, /setTimeout\(r\s*=>\s*setTimeout|400\)/)
})

test('Case 2 and 7: strict stabilization waits for delayed getSession hydration', async () => {
  const client = makeClient([
    null,
    null,
    { user: { id: 'delayed-user' }, access_token: 'token-2' },
  ])
  const result = await waitForSession(client, {
    expectedUserId: 'delayed-user',
    requireAccessToken: true,
    timeoutMs: 30,
    intervalMs: 1,
  })

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.session.user.id, 'delayed-user')
})

test('Case 3 and 8: missing session times out without pretending success', async () => {
  const result = await waitForSession(makeClient([null]), {
    expectedUserId: 'new-user',
    requireAccessToken: true,
    timeoutMs: 4,
    intervalMs: 1,
  })

  assert.deepEqual(result, {
    ok: false,
    reason: 'missing_session',
    timedOut: true,
  })
})

test('Case 4: a session for another user fails immediately', async () => {
  const result = await waitForSession(
    makeClient([{ user: { id: 'old-user' }, access_token: 'old-token' }]),
    {
      expectedUserId: 'new-user',
      requireAccessToken: true,
      timeoutMs: 20,
      intervalMs: 1,
    }
  )

  assert.deepEqual(result, {
    ok: false,
    reason: 'user_mismatch',
    timedOut: false,
  })
})

test('Case 5: a session without an access token fails', async () => {
  const result = await waitForSession(makeClient([{ user: { id: 'new-user' } }]), {
    expectedUserId: 'new-user',
    requireAccessToken: true,
    timeoutMs: 20,
    intervalMs: 1,
  })

  assert.deepEqual(result, {
    ok: false,
    reason: 'missing_access_token',
    timedOut: false,
  })
})

test('Case 6: native storage is retried and then fails with its exact reason', async () => {
  const client = makeClient([{ user: { id: 'new-user' }, access_token: 'token-6' }])
  const result = await waitForSession(client, {
    expectedUserId: 'new-user',
    requireAccessToken: true,
    verifyPersistedStorage: true,
    persistedSessionVerifier: () => false,
    timeoutMs: 4,
    intervalMs: 1,
  })

  assert.deepEqual(result, {
    ok: false,
    reason: 'storage_not_persisted',
    timedOut: true,
  })
})

test('onboarding remains in its loading shell until strict session stabilization succeeds', () => {
  const source = readFileSync(
    new URL('../../app/onboarding/page.tsx', import.meta.url),
    'utf8'
  )
  assert.match(source, /const \[sessionReady, setSessionReady\] = useState\(false\)/)
  assert.match(source, /if \(!sessionReady\) \{\s*return <AppAuthLoadingShell \/>/)
  assert.match(source, /window\.location\.replace\('\/login'\)/)
  assert.match(source, /requireAccessToken: true/)
})

test('Case 10: persisted native session survives the hard-route storage boundary', () => {
  const originalWindow = globalThis.window
  const persisted = JSON.stringify({
    user: { id: 'new-user' },
    access_token: 'route-token',
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      Capacitor: { isNativePlatform: () => true },
      location: { protocol: 'capacitor:' },
      localStorage: {
        getItem: (key: string) => (key === 'betterbit-auth' ? persisted : null),
      },
    },
  })

  try {
    assert.equal(hasPersistedNativeSession('new-user', 'route-token'), true)
    assert.equal(hasPersistedNativeSession('old-user', 'route-token'), false)
    assert.equal(hasPersistedNativeSession('new-user', 'wrong-token'), false)
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window')
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      })
    }
  }
})
