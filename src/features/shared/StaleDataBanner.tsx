'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  /** Primary line. Defaults to the gentle connectivity message. */
  title?: string
  subtitle?: string
}

/**
 * Shown when we are displaying last-known cached data because a background
 * refresh failed or the device is offline. Deliberately gentle — no
 * "待同步 / 未同步紀錄 / 正在背景更新" engineering copy.
 */
export default function StaleDataBanner({
  title = '目前連線不穩，先顯示上次資料',
  subtitle = '連線後會自動更新。',
}: Props) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[95] flex justify-center px-4 pt-[max(env(safe-area-inset-top),8px)] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className="rounded-2xl px-4 py-2 text-center shadow-sm max-w-md"
        style={{
          backgroundColor: BB_V2.bg.card,
          border: `1px solid ${BB_V2.border}`,
        }}
      >
        <p className="text-[12px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
          {title}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}
