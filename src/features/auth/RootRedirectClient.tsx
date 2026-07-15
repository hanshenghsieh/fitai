'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { waitForSession } from '@/lib/supabase/wait-for-session'
import LandingPage from '@/components/marketing/LandingPage'
import AppAuthLoadingShell from '@/features/auth/AppAuthLoadingShell'

type ViewState = 'loading' | 'landing' | 'redirecting'

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
        if (!isRoot) {
          const appPrefixes = [
            '/dashboard',
            '/weekly-plan',
            '/weekly',
            '/progress',
            '/settings',
            '/login',
            '/onboarding',
            '/register',
          ]
          const looksLikeAppRoute = appPrefixes.some((p) => path === p || path.startsWith(`${p}/`) || path === `${p}.html`)
          if (looksLikeAppRoute && !path.endsWith('.html')) {
            const recovery = `${path}.html${search}`
            console.log('[ROOT] recovery assign =', recovery)
            window.location.replace(recovery)
            return
          }
          console.log('[ROOT] skip for path =', path)
          setView('landing')
          return
        }

        const supabase = createClient()
        const session = await waitForSession(supabase, { retries: 2, delayMs: 250 })

        if (!mountedRef.current) return

        if (!session?.user) {
          setView('landing')
          return
        }

        setView('redirecting')

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!mountedRef.current) return

        const target = profile?.onboarding_completed ? '/dashboard' : '/onboarding'
        console.log('[ROOT] redirect to', target)
        // Soft replace (not assign) so Capcitor does not reload index.html again.
        router.replace(target)
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
