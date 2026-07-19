import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function source(path: string): string {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')
}

describe('BETTERBIT-NATIVE-INTEGRATIONS-001 auth contract', () => {
  const auth = source('src/lib/auth/auth-service.ts')

  it('uses PKCE callback exchange and native browser handoff', () => {
    assert.match(auth, /betterbit:\/\/auth\/callback/)
    assert.match(auth, /skipBrowserRedirect:\s*native/)
    assert.match(auth, /Browser\.open/)
    assert.match(auth, /exchangeCodeForSession\(code\)/)
  })

  it('uses the native Apple identity token and raw nonce', () => {
    assert.match(auth, /registerPlugin<AppleAuthPlugin>\('AppleAuth'\)/)
    assert.match(auth, /signInWithIdToken/)
    assert.match(auth, /token:\s*credential\.identityToken/)
    assert.match(auth, /nonce:\s*credential\.rawNonce/)
  })

  it('verifies auth, preserves nonblank names, and identifies RevenueCat users', () => {
    assert.match(auth, /auth\.getSession\(\)/)
    assert.match(auth, /auth\.getUser\(\)/)
    assert.match(auth, /if \(!existing\.display_name\?\.trim\(\) && nonBlankName\)/)
    assert.match(auth, /configureAppleIap\(userId\)/)
  })

  it('installs one global native callback listener with cold-launch recovery', () => {
    const listener = source('src/components/auth/NativeAuthCallbackListener.tsx')
    const layout = source('src/app/layout.tsx')
    assert.match(listener, /App\.addListener\('appUrlOpen'/)
    assert.match(listener, /getNativeLaunchUrl\(\)/)
    assert.match(listener, /handledCallbackUrl === url/)
    assert.match(layout, /<NativeAuthCallbackListener \/>/)
  })
})
