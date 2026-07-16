'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  onRetry: () => void
  title?: string
  detail?: string
}

export default function TodayErrorState({
  onRetry,
  title = '目前連線不穩，請稍後再試',
  detail = '無法載入今日計畫。請確認網路後再試一次。',
}: Props) {
  return (
    <div
      className="app-tab-column min-h-[60vh] flex flex-col items-center justify-center px-8 text-center"
      style={{ fontFamily: BB_V2.font }}
    >
      <p className="text-[18px] mb-2" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
        {title}
      </p>
      <p className="text-[14px] mb-8 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
        {detail}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="h-12 px-8 rounded-[20px] text-[15px] touch-manipulation"
        style={{ backgroundColor: BB_V2.accent.green, color: '#FFFFFF', fontWeight: 600 }}
      >
        重新整理
      </button>
    </div>
  )
}
