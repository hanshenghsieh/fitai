'use client'

import { TODAY } from '@/lib/today-design'

export default function TodayDashboardSkeleton() {
  return (
    <div className="max-w-lg mx-auto min-h-screen animate-pulse" style={{ backgroundColor: TODAY.bg }}>
      <div className="px-5 pt-6 pb-4 space-y-3">
        <div className="h-8 w-32 rounded-lg" style={{ backgroundColor: TODAY.surface }} />
        <div className="h-4 w-48 rounded-md opacity-60" style={{ backgroundColor: TODAY.surface }} />
      </div>
      <div className="px-5 space-y-4">
        <div className="h-36 rounded-[28px]" style={{ backgroundColor: TODAY.surface }} />
        <div className="h-52 rounded-[28px]" style={{ backgroundColor: TODAY.surface }} />
        <div className="h-40 rounded-[28px]" style={{ backgroundColor: TODAY.surface }} />
      </div>
    </div>
  )
}
