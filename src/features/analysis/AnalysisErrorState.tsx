'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  onRetry: () => void
}

export default function AnalysisErrorState({ onRetry }: Props) {
  return (
    <div
      className="v2-analysis-page min-h-[60vh] flex flex-col items-center justify-center px-8 text-center"
      style={{ fontFamily: BB_V2.font }}
    >
      <p className="text-[18px] mb-2" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
        目前連線不穩，請稍後再試
      </p>
      <p className="text-[14px] mb-8 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
        無法載入分析資料。請確認網路後再試一次。
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
