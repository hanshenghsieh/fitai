'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

export default function TodayV2Skeleton() {
  return (
    <div
      className="max-w-lg mx-auto min-h-screen animate-pulse"
      style={{ backgroundColor: BB_V2.bg.canvas, fontFamily: BB_V2.font }}
    >
      <div className="px-5 app-page-top pb-4 space-y-3">
        <div className="h-8 w-28 rounded-xl" style={{ backgroundColor: BB_V2.bg.card }} />
        <div className="h-4 w-44 rounded-lg opacity-70" style={{ backgroundColor: BB_V2.bg.card }} />
      </div>
      <div className="px-5 space-y-4 pb-8">
        <div className="h-32 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
        <div className="h-48 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
        <div className="h-40 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
        <div className="h-36 rounded-[24px]" style={{ backgroundColor: BB_V2.bg.card }} />
      </div>
    </div>
  )
}
