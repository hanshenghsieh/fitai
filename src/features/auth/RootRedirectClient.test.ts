import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  classifyRecoveryPath,
  resolveRootNavigation,
  type RootNavigationDecision,
} from './RootRedirectClient'

function readRepoFile(relativePath: string): string {
  return readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8')
}

const noSession = async () => null
const withSession = (userId = 'user-1') => async () => ({ userId })
const notCompleted = async () => false
const completed = async () => true

describe('classifyRecoveryPath', () => {
  it('classifies public auth routes', () => {
    assert.equal(classifyRecoveryPath('/login'), 'public')
    assert.equal(classifyRecoveryPath('/register'), 'public')
  })

  it('classifies protected app routes', () => {
    for (const p of ['/onboarding', '/dashboard', '/weekly-plan', '/weekly', '/progress', '/settings']) {
      assert.equal(classifyRecoveryPath(p), 'protected', `expected ${p} to be protected`)
    }
  })

  it('classifies unknown paths as none', () => {
    assert.equal(classifyRecoveryPath('/some-random-path'), 'none')
  })
})

describe('resolveRootNavigation — scenario 1: unauthenticated cold start at /onboarding', () => {
  it('never recovers into onboarding without a session — routes through root instead', async () => {
    const decision = await resolveRootNavigation({
      path: '/onboarding',
      search: '',
      isRoot: false,
      getSession: noSession,
      getOnboardingCompleted: notCompleted,
    })
    const expected: RootNavigationDecision = { type: 'recover', to: '/index.html' }
    assert.deepEqual(decision, expected)
    // Explicitly assert it does NOT recover straight into the protected path.
    assert.notEqual((decision as { to?: string }).to, '/onboarding.html')
  })
})

describe('resolveRootNavigation — scenario 2: unauthenticated cold start at /dashboard', () => {
  it('never recovers into dashboard without a session — routes through root instead', async () => {
    const decision = await resolveRootNavigation({
      path: '/dashboard',
      search: '',
      isRoot: false,
      getSession: noSession,
      getOnboardingCompleted: notCompleted,
    })
    assert.deepEqual(decision, { type: 'recover', to: '/index.html' })
  })
})

describe('resolveRootNavigation — scenario 3: authenticated cold start at /onboarding', () => {
  it('recovers normally once a valid session is confirmed', async () => {
    const decision = await resolveRootNavigation({
      path: '/onboarding',
      search: '?foo=1',
      isRoot: false,
      getSession: withSession(),
      getOnboardingCompleted: notCompleted,
    })
    assert.deepEqual(decision, { type: 'recover', to: '/onboarding.html?foo=1' })
  })

  it('same for a protected path other than onboarding (e.g. /dashboard)', async () => {
    const decision = await resolveRootNavigation({
      path: '/dashboard',
      search: '',
      isRoot: false,
      getSession: withSession(),
      getOnboardingCompleted: completed,
    })
    assert.deepEqual(decision, { type: 'recover', to: '/dashboard.html' })
  })
})

describe('resolveRootNavigation — scenario 4: unauthenticated cold start at /login', () => {
  it('recovers public routes without ever checking session', async () => {
    let sessionChecked = false
    const decision = await resolveRootNavigation({
      path: '/login',
      search: '',
      isRoot: false,
      getSession: async () => {
        sessionChecked = true
        return null
      },
      getOnboardingCompleted: notCompleted,
    })
    assert.deepEqual(decision, { type: 'recover', to: '/login.html' })
    assert.equal(sessionChecked, false, 'public routes must not require a session check')
  })
})

describe('resolveRootNavigation — the three canonical root (isRoot=true) flows are unchanged', () => {
  it('unauthenticated root → landing', async () => {
    const decision = await resolveRootNavigation({
      path: '/',
      search: '',
      isRoot: true,
      getSession: noSession,
      getOnboardingCompleted: notCompleted,
    })
    assert.deepEqual(decision, { type: 'view', view: 'landing' })
  })

  it('authenticated + onboarding incomplete → /onboarding', async () => {
    const decision = await resolveRootNavigation({
      path: '/',
      search: '',
      isRoot: true,
      getSession: withSession(),
      getOnboardingCompleted: notCompleted,
    })
    assert.deepEqual(decision, { type: 'redirect', to: '/onboarding' })
  })

  it('authenticated + onboarding completed → /dashboard', async () => {
    const decision = await resolveRootNavigation({
      path: '/',
      search: '',
      isRoot: true,
      getSession: withSession(),
      getOnboardingCompleted: completed,
    })
    assert.deepEqual(decision, { type: 'redirect', to: '/dashboard' })
  })
})

describe('resolveRootNavigation — no redirect loop', () => {
  it('the no-session protected recovery target (/index.html) is root, so it cannot re-enter the protected branch', async () => {
    const decision = await resolveRootNavigation({
      path: '/onboarding',
      search: '',
      isRoot: false,
      getSession: noSession,
      getOnboardingCompleted: notCompleted,
    })
    assert.equal(decision.type, 'recover')
    const to = (decision as { to: string }).to
    // Re-resolving at that target must be treated as root, not re-classified
    // as a protected path (it has no path component at all past /index.html).
    const targetPath = new URL(to, 'capacitor://localhost').pathname
    assert.equal(targetPath === '/index.html', true)
    assert.equal(classifyRecoveryPath(targetPath), 'none')
  })
})

describe('scenario 5: onboarding form is not rendered before session/auth check completes', () => {
  it('OnboardingPage returns the loading shell whenever sessionReady is false, before any step form JSX', () => {
    const source = readRepoFile('src/app/onboarding/page.tsx')
    const guardIndex = source.indexOf('if (!sessionReady) {')
    assert.ok(guardIndex >= 0, 'expected a sessionReady guard in OnboardingPage')

    const mainReturnIndex = source.indexOf('return (', guardIndex)
    const loadingShellSlice = source.slice(guardIndex, mainReturnIndex)
    assert.match(loadingShellSlice, /return <AppAuthLoadingShell \/>/)

    // sessionReady must default to false so the very first render (before the
    // async session-check effect resolves) already shows the loading shell.
    assert.match(source, /const \[sessionReady, setSessionReady\] = useState\(false\)/)

    // The guard must appear before the step-1 "快速開始" form is rendered.
    const step1Index = source.indexOf('快速開始')
    assert.ok(guardIndex < step1Index, 'sessionReady guard must precede the step 1 form render')
  })

  it('an invalid/unstabilized session redirects away instead of rendering the form', () => {
    const source = readRepoFile('src/app/onboarding/page.tsx')
    const effectSlice = source.slice(source.indexOf('useEffect(() => {'), source.indexOf('if (!sessionReady) {'))
    assert.match(effectSlice, /if \(!stabilized\.ok\)/)
    assert.match(effectSlice, /window\.location\.replace\('\/login'\)/)
  })
})

describe('scenario 6: web build is unaffected', () => {
  it('the marketing web root only renders RootRedirectClient for the ios-local build target', () => {
    const source = readRepoFile('src/app/page.tsx')
    assert.match(source, /NEXT_PUBLIC_BUILD_TARGET === 'ios-local'/)
    assert.match(source, /if \(isIosLocalBuild\) \{\s*return <RootRedirectClient \/>/)
    assert.match(source, /return <MarketingHome \/>/)
  })
})
