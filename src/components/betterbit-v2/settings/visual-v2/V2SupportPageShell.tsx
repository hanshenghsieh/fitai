'use client'

import { useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  backHref?: string
  children: ReactNode
  footer?: ReactNode
}

export default function V2SupportPageShell({
  title,
  subtitle,
  backHref = '/settings',
  children,
  footer,
}: Props) {
  const router = useRouter()

  const navigateBack = useCallback(() => {
    router.push(backHref)
  }, [router, backHref])

  return (
    <div className="v2-sv2-page v2-sv2-support-page">
      <div
        className="max-w-[640px] mx-auto flex flex-col min-h-[100dvh]"
        style={{ paddingLeft: 20, paddingRight: 20 }}
      >
        <header className="pt-[max(8px,var(--app-safe-top,0px))] pb-4">
          <button
            type="button"
            onClick={navigateBack}
            className="inline-flex items-center gap-0.5 min-h-[44px] -ml-1 px-1 text-[15px] touch-manipulation v2-sv2-row"
            style={{ color: '#7a807a', fontWeight: 500, border: 'none', padding: '8px 4px' }}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            設定
          </button>
          <h1
            className="text-[22px] text-center mt-1"
            style={{ color: '#123d24', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-[13px] text-center mt-2 leading-relaxed px-3"
              style={{ color: '#7a807a' }}
            >
              {subtitle}
            </p>
          )}
        </header>

        <div className="flex-1 space-y-4 pb-[calc(var(--app-nav-total,72px)+16px)]">{children}</div>

        {footer && (
          <div
            className="space-y-3 pb-[max(20px,var(--app-safe-bottom,0px))]"
            style={{ paddingBottom: 'max(calc(var(--app-nav-total,72px) + 12px), 20px)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
