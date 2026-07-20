import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function source(path: string): string {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')
}

describe('BETTERBIT-NATIVE-INTEGRATIONS-001 auth contract', () => {
  const auth = source('src/lib/auth/auth-service.ts')

  it('keeps OAuth callback exchange on web only', () => {
    assert.match(auth, /startWebOAuth/)
    assert.match(auth, /if \(isCapacitorNative\(\)\)/)
    assert.match(auth, /window\.location\.origin/)
    assert.match(auth, /exchangeCodeForSession\(code\)/)
    assert.doesNotMatch(auth, /Browser\.open/)
    assert.doesNotMatch(auth, /skipBrowserRedirect/)
  })

  it('uses the native Google SDK ID token and matching nonce on iOS', () => {
    const googleStart = auth.indexOf('export async function signInWithGoogle')
    const appleStart = auth.indexOf('export async function signInWithApple')
    const google = auth.slice(googleStart, appleStart)
    const nativePath = google.indexOf("path: 'native-google-signin-bridge'")
    const pluginGuard = google.indexOf('if (!pluginAvailable)')
    const nativeSignIn = google.indexOf('GoogleAuth.signIn({ nonce })')

    assert.match(auth, /registerPlugin<GoogleAuthPlugin>\('GoogleAuth'\)/)
    assert.match(google, /GoogleAuth\.getConfiguration\(\)/)
    assert.ok(nativePath >= 0)
    assert.ok(pluginGuard > nativePath)
    assert.ok(nativeSignIn > pluginGuard)
    assert.match(
      google,
      /signInWithIdToken\(\{\s*provider:\s*'google',\s*token:\s*credential\.identityToken,\s*nonce/
    )
    assert.doesNotMatch(google.slice(nativePath), /startWebOAuth|signInWithOAuth|Browser\.open/)
  })

  it('logs safe path diagnostics and fails closed when the native bridge is unavailable', () => {
    const googleStart = auth.indexOf('export async function signInWithGoogle')
    const appleStart = auth.indexOf('export async function signInWithApple')
    const google = auth.slice(googleStart, appleStart)

    assert.match(google, /\[GOOGLE_AUTH_PLATFORM\]/)
    assert.match(google, /\[GOOGLE_AUTH_PATH\]/)
    assert.match(google, /\[GOOGLE_NATIVE_PLUGIN_AVAILABLE\]/)
    assert.match(google, /\[GOOGLE_CONFIG_RUNTIME\]/)
    assert.match(google, /if \(!native\)[\s\S]*?return startWebOAuth\('google'\)/)
    assert.match(google, /if \(!pluginAvailable\)[\s\S]*?throw new Error/)
    assert.doesNotMatch(google, /console\.(?:log|info|warn|error)\([^\n]*(?:nonce|identityToken|token)/)
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
