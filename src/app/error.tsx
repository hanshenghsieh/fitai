'use client'

import { useEffect } from 'react'
import { colors } from '@/lib/design-system'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[root-error]', error)
  }, [error])

  return (
    <div
      className="auth-page-shell flex items-center justify-center p-6"
      style={{ backgroundColor: colors.bg.canvas }}
      role="alert"
    >
      <div className="w-full max-w-md text-center space-y-5">
        <h1 className="text-[22px] font-semibold" style={{ color: colors.text.primary }}>
          出了點問題
        </h1>
        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          請再試一次。若持續發生，可重新整理頁面。
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="w-full py-3 rounded-xl text-[15px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
        >
          重試
        </button>
      </div>
    </div>
  )
}
