'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

export default function TodayV2Skeleton() {
  return (
    <div
      className="min-h-full animate-pulse"
      style={{ backgroundColor: BB_V2.bg.canvas, fontFamily: BB_V2.font }}
    >
      <div className="app-tab-header-skeleton app-tab-column rounded-2xl" style={{ backgroundColor: BB_V2.bg.card }} />
      <div className="app-tab-page-content app-tab-column px-[var(--v2-page-px,18px)] space-y-4">
        <div className="h-32 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
        <div className="h-48 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
        <div className="h-40 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
        <div className="h-36 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
      </div>
    </div>
  )
}
