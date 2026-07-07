'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { setAppOverlayOpen } from '@/lib/today-actions'

export type AppOverlayVariant = 'sheet' | 'dialog'

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  variant?: AppOverlayVariant
  ariaLabel?: string
}

export default function AppOverlay({ open, onClose, children, variant = 'sheet', ariaLabel }: Props) {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setAppOverlayOpen(true)
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      setAppOverlayOpen(false)
      previousFocusRef.current?.focus()
    }
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
    <div
      className={`app-overlay-backdrop app-overlay-backdrop--${variant}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? '對話框'}
    >
      <button type="button" className="app-overlay-scrim" onClick={onClose} aria-label="關閉" tabIndex={-1} />
      <div ref={panelRef} className="app-overlay-panel">
        {children}
      </div>
    </div>,
    document.body
  )
}
