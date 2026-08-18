'use client'

import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  title: string
  message: string
  onUpdate: () => void
}

/**
 * Forced update — Condition 3. Deliberately NOT built on AppOverlay: that
 * component wires backdrop-click and Escape to close by default (correct
 * for every other dialog in the app, wrong here). This has no scrim button,
 * no keydown listener, and only one action. There is no onClose prop at
 * all — that's intentional, not an oversight.
 *
 * No "mounted" gate (unlike AppOverlay) — `open` only ever becomes true
 * asynchronously, inside use-app-update-check.ts's effect, which never runs
 * during SSR. By the time `open` can be true, we're already client-side
 * post-hydration, so `document` is always safe to touch here directly.
 */
export default function AppForceUpdateModal({ open, title, message, onUpdate }: Props) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          maxWidth: 360,
          width: '100%',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#444', marginBottom: 24, whiteSpace: 'pre-wrap' }}>
          {message}
        </p>
        <button
          type="button"
          onClick={onUpdate}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            background: '#111',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            border: 'none',
          }}
        >
          立即更新
        </button>
      </div>
    </div>,
    document.body
  )
}
