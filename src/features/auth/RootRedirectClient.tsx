'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { waitForSession } from '@/lib/supabase/wait-for-session'
import LandingPage from '@/components/marketing/LandingPage'
import AppAuthLoadingShell from '@/features/auth/AppAuthLoadingShell'

type ViewState = 'loading' | 'landing' | 'redirecting'

// Routes that never require a session to recover to — safe to trust the
// address bar path alone.
const PUBLIC_RECOVERY_PREFIXES = ['/login', '/register']

// Routes that gate real user data — recovering to these without a verified
// session would hand an unauthenticated cold start straight into a
// logged-in-only screen (e.g. the onboarding form).
const PROTECTED_RECOVERY_PREFIXES = [
  '/dashboard',
  '/weekly-plan',
  '/weekly',
  '/progress',
  '/settings',
  '/onboarding',
]

function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some(p => path === p || path.startsWith(`${p}/`) || path === `${p}.html`)
}

export type RecoveryPathKind = 'public' | 'protected' | 'none'

/** Which recovery bucket a non-root cold-start path falls into. */
export function classifyRecoveryPath(path: string): RecoveryPathKind {
  if (matchesPrefix(path, PUBLIC_RECOVERY_PREFIXES)) return 'public'
  if (matchesPrefix(path, PROTECTED_RECOVERY_PREFIXES)) return 'protected'
  return 'none'
}

export type RootNavigationDecision =
  | { type: 'recover'; to: string }
  | { type: 'view'; view: 'landing' }
  | { type: 'redirect'; to: string }

export interface RootNavigationParams {
  path: string
  search: string
  isRoot: boolean
  /** Resolves to the session's user id, or null if there is no valid session. */
  getSession: () => Promise<{ userId: string } | null>
  getOnboardingCompleted: (userId: string) => Promise<boolean | null>
}

/**
 * Pure decision function for RootRedirectClient's cold-start routing. Kept
 * side-effect free (no window.location / router calls) so it can be unit
 * tested without a DOM or a real Supabase client.
 */
export async function resolveRootNavigation({
  path,
  search,
  isRoot,
  getSession,
  getOnboardingCompleted,
}: RootNavigationParams): Promise<RootNavigationDecision> {
  if (!isRoot) {
    const kind = classifyRecoveryPath(path)

    if (kind === 'public' && !path.endsWith('.html')) {
      return { type: 'recover', to: `${path}.html${search}` }
    }

    if (kind === 'protected' && !path.endsWith('.html')) {
      // Never trust an extensionless protected path without verifying a real
      // session first — otherwise a stale/restored address bar path (e.g.
      // /onboarding) would recover straight into a logged-out user's screen
      // with no auth check at all.
      const session = await getSession()
      if (session) {
        return { type: 'recover', to: `${path}.html${search}` }
      }
      // No valid session — recover through the root flow instead of trusting
      // the requested path, so the user lands on LandingPage/login rather
      // than a protected screen. Going through /index.html (not the
      // requested path) also avoids a redirect loop, since that path is
      // root and never re-enters this branch.
      return { type: 'recover', to: `/index.html${search}` }
    }

    return { type: 'view', view: 'landing' }
  }

  const session = await getSession()
  if (!session) {
    return { type: 'view', view: 'landing' }
  }

  const completed = await getOnboardingCompleted(session.userId)
  return { type: 'redirect', to: completed ? '/dashboard' : '/onboarding' }
}

export default function RootRedirectClient() {
  const router = useRouter()
  const [view, setView] = useState<ViewState>('loading')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    async function resolve() {
      try {
        // CapacitorRouter maps ANY extensionless path → /index.html. If the
        // address bar shows an app route, recover by loading that route's real
        // static HTML instead of bouncing everyone to /dashboard.
        const path = typeof window !== 'undefined' ? window.location.pathname : '/'
        const search = typeof window !== 'undefined' ? window.location.search : ''
        const isRoot = path === '/' || path === '/index.html' || path === ''

        const supabase = createClient()

        const decision = await resolveRootNavigation({
          path,
          search,
          isRoot,
          getSession: async () => {
            const session = await waitForSession(supabase, { retries: 2, delayMs: 250 })
            return session?.user ? { userId: session.user.id } : null
          },
          getOnboardingCompleted: async userId => {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('onboarding_completed')
              .eq('id', userId)
              .maybeSingle()
            return profile?.onboarding_completed ?? false
          },
        })

        if (!mountedRef.current) return

        if (decision.type === 'recover') {
          console.log('[ROOT] recovery assign =', decision.to)
          window.location.replace(decision.to)
          return
        }

        if (decision.type === 'view') {
          setView(decision.view)
          return
        }

        setView('redirecting')
        console.log('[ROOT] redirect to', decision.to)
        // Soft replace (not assign) so Capcitor does not reload index.html again.
        router.replace(decision.to)
      } catch {
        if (!mountedRef.current) return
        setView('landing')
      }
    }

    void resolve()

    return () => {
      mountedRef.current = false
    }
  }, [router])

  if (view === 'loading' || view === 'redirecting') {
    return <AppAuthLoadingShell />
  }

  return <LandingPage />
}
