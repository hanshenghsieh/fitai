'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { setAppOverlayOpen } from '@/lib/today-actions'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

/** Portal bottom sheets above BottomNav (avoids AppRouteShell isolate stacking). */
export default function V2OverlayPortal({
  open,
  onClose,
  children,
  className = 'v2-sv2-picker-overlay',
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setAppOverlayOpen(true)
    return () => setAppOverlayOpen(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className={className} onClick={onClose} role="presentation">
      {children}
    </div>,
    document.body
  )
}
