'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

export default function AppAuthLoadingShell() {
  return (
    <div
      className="app-shell v2-page-bg min-h-[100dvh] animate-pulse"
      style={{ backgroundColor: BB_V2.bg.canvas, fontFamily: BB_V2.font }}
      role="status"
      aria-live="polite"
      aria-label="載入中"
    >
      <div className="max-w-lg mx-auto px-5 pt-[max(24px,var(--app-safe-top,0px))] space-y-4">
        <div className="h-8 w-32 rounded-xl mx-auto" style={{ backgroundColor: BB_V2.bg.card }} />
        <div className="h-32 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
        <div className="h-48 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
        <div className="h-40 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
      </div>
    </div>
  )
}
