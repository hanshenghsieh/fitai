'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  label?: string
}

export default function SettingsRefreshingBanner({ label = '同步中...' }: Props) {
  return (
    <div
      className="fixed top-0 inset-x-0 z-[90] flex justify-center pointer-events-none pt-[max(env(safe-area-inset-top),8px)]"
      role="status"
      aria-live="polite"
    >
      <span
        className="rounded-full px-3 py-1 text-[12px] shadow-sm"
        style={{
          backgroundColor: BB_V2.bg.card,
          color: BB_V2.text.secondary,
          fontWeight: 500,
          border: `1px solid ${BB_V2.border}`,
        }}
      >
        {label}
      </span>
    </div>
  )
}
