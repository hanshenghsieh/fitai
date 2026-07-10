'use client'

import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  loadingText?: string
  className?: string
  variant?: 'primary' | 'secondary'
}

export default function V2PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  loadingText,
  className = '',
  variant = 'primary',
}: Props) {
  const isPrimary = variant === 'primary'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`v2-btn-primary v2-btn-press touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      style={{
        background: isPrimary ? BB_V2.accent.green : BB_V2.bg.pill,
        color: isPrimary ? '#fff' : BB_V2.text.deepGreen,
        boxShadow: isPrimary ? BB_V2.shadow.button : 'none',
        fontWeight: 600,
        border: isPrimary ? 'none' : `1px solid ${BB_V2.border}`,
      }}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {loadingText || '處理中…'}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
