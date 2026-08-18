'use client'

import AppOverlay from '@/components/ui/AppOverlay'

interface Props {
  open: boolean
  title: string
  message: string
  onUpdate: () => void
  onDismiss: () => void
}

/**
 * Optional update — Condition 2. Dismissible (backdrop/Escape both close it,
 * inherited from AppOverlay, same as every other sheet/dialog in the app —
 * no bespoke close behavior invented here). "稍後提醒我" and the backdrop/
 * Escape paths are equivalent: all three just call onDismiss.
 */
export default function AppUpdateModal({ open, title, message, onUpdate, onDismiss }: Props) {
  return (
    <AppOverlay open={open} onClose={onDismiss} variant="dialog" ariaLabel={title}>
      <div style={{ padding: 24, maxWidth: 360 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#444', marginBottom: 24, whiteSpace: 'pre-wrap' }}>
          {message}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={onUpdate}
            style={{
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
          <button
            type="button"
            onClick={onDismiss}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: 'transparent',
              color: '#666',
              fontWeight: 500,
              fontSize: 15,
              border: 'none',
            }}
          >
            稍後提醒我
          </button>
        </div>
      </div>
    </AppOverlay>
  )
}
