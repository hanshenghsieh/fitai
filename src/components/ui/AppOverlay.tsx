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
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>,
    document.body
  )
}
