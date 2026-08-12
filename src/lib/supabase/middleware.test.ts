import { test, mock, before } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'

/**
 * Build 38 BUG 1 — root cause lock-in: updateSession() used to call
 * supabase.auth.getUser() (a real network call to Supabase's
 * Cloudflare-fronted Auth API) for EVERY request matching the proxy's
 * matcher, including every /api/* call — before the route handler's own
 * try/catch ever ran, and using whatever Cookie header the request carried.
 * The result was structurally unused for API routes (both branches that
 * read `user` explicitly exclude isApiRoute), so this was an unprotected,
 * pointless external call sitting in front of every single API request.
 * These tests lock in that /api/* now skips it entirely, while page routes
 * keep the original auth-gate behavior unchanged.
 *
 * Requires --experimental-test-module-mocks (see package.json's "test" script).
 */

let createServerClientCalls: unknown[] = []
let updateSession: typeof import('./middleware').updateSession

before(async () => {
  mock.module('@supabase/ssr', {
    namedExports: {
      createServerClient: (...args: unknown[]) => {
        createServerClientCalls.push(args)
        return {
          auth: {
            getUser: async () => ({ data: { user: null }, error: null }),
          },
        }
      },
    },
  })
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test-project.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key'
  ;({ updateSession } = await import('./middleware'))
})

test('Build 38 BUG 1 — /api/* requests never touch Supabase auth in the proxy middleware', async () => {
  createServerClientCalls = []
  const request = new NextRequest('https://www.betterbit.app/api/settings/body', { method: 'POST' })
  await updateSession(request)
  assert.equal(createServerClientCalls.length, 0, 'createServerClient (and therefore auth.getUser()) must never run for /api/* paths')
})

test('Build 38 BUG 1 — other /api/* routes also skip the Supabase auth call (not just settings/body)', async () => {
  createServerClientCalls = []
  const request = new NextRequest('https://www.betterbit.app/api/food-photo/match', { method: 'POST' })
  await updateSession(request)
  assert.equal(createServerClientCalls.length, 0)
})

test('Build 38 BUG 1 — page routes still go through the original Supabase auth check (behavior unchanged)', async () => {
  createServerClientCalls = []
  const request = new NextRequest('https://www.betterbit.app/dashboard', { method: 'GET' })
  await updateSession(request)
  assert.equal(createServerClientCalls.length, 1, 'page routes must still create the cookie-based Supabase client as before')
})

test('Build 38 BUG 1 — an unauthenticated request to a protected page still redirects to /login (redirect logic unchanged)', async () => {
  createServerClientCalls = []
  const request = new NextRequest('https://www.betterbit.app/dashboard', { method: 'GET' })
  const response = await updateSession(request)
  assert.equal(response.status, 307)
  assert.match(response.headers.get('location') ?? '', /\/login/)
})
