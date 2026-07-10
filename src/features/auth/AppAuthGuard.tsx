'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppAuthLoadingShell from '@/features/auth/AppAuthLoadingShell'

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
      try {
        const supabase = createClient()
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (!mountedRef.current) return

        if (sessionError || !session?.user) {
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
          router.replace('/onboarding')
          return
        }

        setReady(true)
      } catch {
        if (!mountedRef.current) return
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
