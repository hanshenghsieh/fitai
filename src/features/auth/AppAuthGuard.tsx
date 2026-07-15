'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { waitForSession } from '@/lib/supabase/wait-for-session'
import AppAuthLoadingShell from '@/features/auth/AppAuthLoadingShell'
import { isE2EAuthBypass } from '@/lib/e2e-auth-bypass'

interface Props {
  children: ReactNode
}

export default function AppAuthGuard({ children }: Props) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    async function verify() {
      const route = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '(ssr)'
      console.log('[GUARD] route =', route)

      // Playwright / QA Gate v2 only — never set in production App.
      if (isE2EAuthBypass()) {
        console.log('[GUARD] decision = e2e bypass')
        if (mountedRef.current) setReady(true)
        return
      }

      try {
        const supabase = createClient()

        // Right after login we arrive via a full page load (window.location).
        // Give the WKWebView extra patience to rehydrate the session before
        // deciding there is none — otherwise we bounce back to /login.
        const justLoggedIn =
          typeof window !== 'undefined' && /[?&]login=1\b/.test(window.location.search)
        const session = await waitForSession(supabase, {
          retries: justLoggedIn ? 10 : 4,
          delayMs: 300,
        })
        console.log('[GUARD] session =', !!session?.user)

        if (!mountedRef.current) return

        if (!session?.user) {
          console.log('[GUARD] decision = redirect /login (no session)')
          router.replace('/login')
          return
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!mountedRef.current) return

        if (!profile?.onboarding_completed) {
          console.log('[GUARD] decision = redirect /onboarding (incomplete)')
          router.replace('/onboarding')
          return
        }

        console.log('[GUARD] decision = render app')
        setReady(true)
      } catch (err) {
        if (!mountedRef.current) return
        console.log('[GUARD] decision = redirect /login (error):', err instanceof Error ? err.message : String(err))
        router.replace('/login')
      }
    }

    void verify()

    return () => {
      mountedRef.current = false
    }
  }, [router])

  if (!ready) {
    return <AppAuthLoadingShell />
  }

  return <>{children}</>
}
