'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { completeOAuthCallback } from '@/lib/auth/auth-service'
import { BB_V2 } from '@/lib/betterbit-v2'
import V2PageBackground from '@/components/betterbit-v2/V2PageBackground'
import V2Card from '@/components/betterbit-v2/V2Card'

export default function AuthCallbackPage() {
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void completeOAuthCallback(window.location.href)
      .then(completion => {
        if (active) window.location.replace(`${completion.nextPath}?login=1`)
      })
      .catch(reason => {
        if (active) {
          setError(reason instanceof Error ? reason.message : '登入失敗，請再試一次。')
        }
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <V2PageBackground className="min-h-[100dvh] flex items-center justify-center p-4">
      <V2Card padding="24px" className="w-full max-w-md text-center">
        {error ? (
          <div className="space-y-4">
            <p className="text-[15px]" style={{ color: BB_V2.text.primary }}>
              {error}
            </p>
            <Link href="/login" className="v2-btn-primary inline-flex px-6">
              返回登入
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: BB_V2.accent.green }} />
            <p className="text-[15px]" style={{ color: BB_V2.text.secondary }}>
              正在完成登入…
            </p>
          </div>
        )}
      </V2Card>
    </V2PageBackground>
  )
}
