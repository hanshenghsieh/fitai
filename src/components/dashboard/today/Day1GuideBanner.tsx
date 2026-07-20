'use client'

import { X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'

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
    <div
      className="w-full px-3.5 py-3"
      style={{
        backgroundColor: BB_V2.bg.softGreen,
        borderRadius: 14,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[14px]" style={{ color: BB_V2.accent.greenDeep, fontWeight: 600 }}>
            Day 1 小提示
          </p>
          <ul className="mt-1.5 space-y-1 text-[13px] leading-relaxed break-words" style={{ color: BB_V2.text.secondary }}>
            <li>· 先從今天第一餐開始</li>
            <li>· 不用補過去，記錄下一餐就好</li>
            <li>· 不知道吃什麼，可以讓 Betterbit 幫你算</li>
            <li>· 今日飲食總覽中的餐點可長按拖移順序或刪除</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 -mt-0.5 -mr-0.5 p-1 rounded-full active:opacity-70"
          aria-label="關閉提示"
        >
          <X className="h-4 w-4" strokeWidth={BB_V2.iconStroke} style={{ color: BB_V2.text.secondary }} />
        </button>
      </div>
    </div>
  )
}
