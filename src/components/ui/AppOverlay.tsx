'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { setAppOverlayOpen } from '@/lib/today-actions'

export type AppOverlayVariant = 'sheet' | 'dialog'

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  variant?: AppOverlayVariant
}

export default function AppOverlay({ open, onClose, children, variant = 'sheet' }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setAppOverlayOpen(true)
    return () => setAppOverlayOpen(false)
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className={`app-overlay-backdrop app-overlay-backdrop--${variant}`}
      role="dialog"
      aria-modal="true"
    >
      <button type="button" className="app-overlay-scrim" onClick={onClose} aria-label="關閉" tabIndex={-1} />
      <div className="app-overlay-panel">{children}</div>
    </div>,
    document.body
  )
}
