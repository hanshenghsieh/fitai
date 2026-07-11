'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LandingPage from '@/components/marketing/LandingPage'
import AppAuthLoadingShell from '@/features/auth/AppAuthLoadingShell'
import { iosLocalPath } from '@/lib/ios-local-path'

type ViewState = 'loading' | 'landing' | 'redirecting'

export default function RootRedirectClient() {
  const router = useRouter()
  const [view, setView] = useState<ViewState>('loading')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    async function resolve() {
      try {
        const supabase = createClient()
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (!mountedRef.current) return

        if (sessionError || !session?.user) {
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

        router.replace(
          iosLocalPath(profile?.onboarding_completed ? '/dashboard' : '/onboarding'),
        )
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
