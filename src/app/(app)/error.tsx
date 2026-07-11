'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'
import { appRoute, isLocalHybrid } from '@/lib/navigation/routes'

export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('[app-route-error]', error)
  }, [error])

  const showDebug = isLocalHybrid()

  return (
    <div
      className="px-5 app-page-top pb-10 max-w-lg mx-auto flex flex-col justify-center"
      style={{ fontFamily: BB_V2.font, minHeight: 'calc(100dvh - var(--app-nav-total) - 16px)' }}
      role="alert"
    >
      <BBCard className="text-center space-y-5 py-10 px-6">
        <h1 className="text-[20px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          載入時出了點問題
        </h1>
        <p className="text-[15px] leading-relaxed" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
          可能是暫時的連線問題。再試一次，或回到今日頁面。
        </p>
        {showDebug ? (
          <pre
            className="text-left text-[11px] leading-relaxed whitespace-pre-wrap break-words rounded-xl p-3 max-h-48 overflow-auto"
            style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.secondary }}
          >
            {error.message || 'Unknown error'}
            {error.digest ? `\n\ndigest: ${error.digest}` : ''}
            {error.stack ? `\n\n${error.stack.split('\n').slice(0, 4).join('\n')}` : ''}
          </pre>
        ) : null}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="h-12 rounded-[20px] text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
          >
            重試
          </button>
          <button
            type="button"
            onClick={() => router.push(appRoute('/dashboard'))}
            className="h-12 inline-flex items-center justify-center rounded-[20px] text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: BB_V2.accent.orange, fontWeight: 500 }}
          >
            回到今日
          </button>
        </div>
      </BBCard>
    </div>
  )
}
