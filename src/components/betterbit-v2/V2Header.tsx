'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Menu, History, ArrowLeft, X, Info } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'

type HeaderVariant = 'main' | 'back' | 'close' | 'info'

interface Props {
  title?: string
  variant?: HeaderVariant
  onBack?: () => void
  onClose?: () => void
  onHistory?: () => void
  onInfo?: () => void
  menuHref?: string
  rightSlot?: ReactNode
  /** Hide default right icon (history / progress link) */
  hideRight?: boolean
}

export default function V2Header({
  title = 'Betterbit',
  variant = 'main',
  onBack,
  onClose,
  onHistory,
  onInfo,
  menuHref = '/settings',
  rightSlot,
  hideRight = false,
}: Props) {
  const iconBtn =
    'min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

  return (
    <header
      className="sticky top-0 z-40 pt-[max(8px,var(--app-safe-top,0px))] pb-2"
      style={{ backgroundColor: BB_V2.bg.header }}
    >
      <div className="app-tab-column flex items-center justify-between gap-2 min-h-[48px] px-[var(--v2-page-px,18px)]">
        <div className="w-11 flex justify-start">
          {variant === 'back' && onBack ? (
            <button type="button" onClick={onBack} className={iconBtn} aria-label="返回">
              <ArrowLeft className="h-5 w-5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.deepGreen }} />
            </button>
          ) : variant === 'close' && onClose ? (
            <button type="button" onClick={onClose} className={iconBtn} aria-label="關閉">
              <X className="h-5 w-5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.deepGreen }} />
            </button>
          ) : (
            <Link href={menuHref} className={iconBtn} aria-label="選單">
              <Menu className="h-5 w-5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.deepGreen }} />
            </Link>
          )}
        </div>

        <h1
          className="text-[18px] tracking-tight truncate text-center flex-1"
          style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}
        >
          {title}
        </h1>

        <div className="w-11 flex justify-end">
          {rightSlot}
          {!hideRight && !rightSlot && variant === 'info' && onInfo ? (
            <button type="button" onClick={onInfo} className={iconBtn} aria-label="說明">
              <Info className="h-5 w-5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.deepGreen }} />
            </button>
          ) : !hideRight && !rightSlot && onHistory ? (
            <button type="button" onClick={onHistory} className={iconBtn} aria-label="紀錄">
              <History className="h-5 w-5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.deepGreen }} />
            </button>
          ) : !hideRight && !rightSlot && variant === 'main' ? (
            <Link href="/progress" className={iconBtn} aria-label="分析">
              <History className="h-5 w-5" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.deepGreen }} />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}
