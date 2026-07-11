'use client'

import { X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'

const STORAGE_KEY = 'bb_day1_guide'
const DISMISS_KEY = 'bb_day1_guide_dismissed'

export function markDay1GuidePending() {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem(DISMISS_KEY) === '1') return
  window.localStorage.setItem(STORAGE_KEY, '1')
}

export function shouldShowDay1Guide(): boolean {
  if (typeof window === 'undefined') return false
  if (window.localStorage.getItem(DISMISS_KEY) === '1') return false
  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

export function dismissDay1Guide() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.setItem(DISMISS_KEY, '1')
}

interface Props {
  onDismiss: () => void
}

export default function Day1GuideBanner({ onDismiss }: Props) {
  return (
    <BBCard padding={16} className="relative">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-full active:opacity-70"
        aria-label="關閉提示"
      >
        <X className="h-4 w-4" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
      </button>
      <p className="text-[14px] pr-6" style={{ color: BB_V2.accent.orange, fontWeight: 600 }}>
        Day 1 小提示
      </p>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
        <li>· 先從今天第一餐開始</li>
        <li>· 不用補過去，記錄下一餐就好</li>
        <li>· 不知道吃什麼，可以讓 Betterbit 幫你算</li>
      </ul>
    </BBCard>
  )
}
