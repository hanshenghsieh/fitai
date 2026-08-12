'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * Catches errors thrown by the root layout itself — src/app/error.tsx cannot
 * catch these, since it renders *inside* the root layout. Must render its
 * own <html>/<body> since it replaces the entire root layout when triggered.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error]', error)
    Sentry.captureException(error, { tags: { feature: 'client-boundary', operation: 'root-layout-error' } })
  }, [error])

  return (
    <html lang="zh-Hant">
      <body>
        <div style={{ display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>出了點問題</h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20, color: '#666' }}>
              請重新整理頁面。若持續發生，請稍後再試。
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                backgroundColor: '#1a2e1a',
                color: '#FFFDF9',
                border: 'none',
              }}
            >
              重試
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
