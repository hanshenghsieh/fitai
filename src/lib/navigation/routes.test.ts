import { test } from 'node:test'
import assert from 'node:assert/strict'

test('appRoute leaves paths untouched on web build', async () => {
  delete process.env.NEXT_PUBLIC_BUILD_TARGET
  const { appRoute, normalizePath } = await import('./routes')
  assert.equal(appRoute('/dashboard'), '/dashboard')
  assert.equal(appRoute('/dashboard?record=1'), '/dashboard?record=1')
  assert.equal(normalizePath('/dashboard/'), '/dashboard')
  assert.equal(normalizePath('/'), '/')
})

test('normalizePath strips Capacitor index.html file URLs', async () => {
  const { normalizePath } = await import('./routes')
  assert.equal(normalizePath('/weekly/index.html'), '/weekly')
  assert.equal(normalizePath('/settings/premium/index.html'), '/settings/premium')
  assert.equal(normalizePath('/index.html'), '/')
  assert.equal(normalizePath('/dashboard'), '/dashboard')
})

test('toFileUrl builds explicit index.html targets', async () => {
  const { toFileUrl } = await import('./routes')
  assert.equal(toFileUrl('/weekly'), '/weekly/index.html')
  assert.equal(toFileUrl('/weekly/'), '/weekly/index.html')
  assert.equal(toFileUrl('/'), '/index.html')
  assert.equal(toFileUrl('/dashboard?record=1'), '/dashboard/index.html?record=1')
  assert.equal(toFileUrl('/dashboard?record=1#x'), '/dashboard/index.html?record=1#x')
})

test('appRoute adds trailing slash on ios-local build', async () => {
  process.env.NEXT_PUBLIC_BUILD_TARGET = 'ios-local'
  const mod = await import(`./routes?ios=${Date.now()}`)
  const appRoute = mod.appRoute as (p: string) => string
  assert.equal(appRoute('/'), '/')
  assert.equal(appRoute('/dashboard'), '/dashboard/')
  assert.equal(appRoute('/settings/premium'), '/settings/premium/')
  assert.equal(appRoute('/dashboard?record=1'), '/dashboard/?record=1')
  assert.equal(appRoute('/dashboard?record=1#top'), '/dashboard/?record=1#top')
  assert.equal(appRoute('/weekly/'), '/weekly/')
  assert.equal(appRoute('https://x.com/a'), 'https://x.com/a')
  delete process.env.NEXT_PUBLIC_BUILD_TARGET
})

test('appRoute adds trailing slash in Capacitor local WebView at runtime', async () => {
  delete process.env.NEXT_PUBLIC_BUILD_TARGET
  const mod = await import(`./routes?cap=${Date.now()}`)
  const appRoute = mod.appRoute as (p: string) => string

  const original = globalThis.window
  // @ts-expect-error test shim
  globalThis.window = {
    location: { origin: 'https://localhost' },
    Capacitor: { isNativePlatform: () => true },
  }

  try {
    assert.equal(appRoute('/weekly'), '/weekly/')
    assert.equal(appRoute('/progress'), '/progress/')
  } finally {
    globalThis.window = original
  }
})
