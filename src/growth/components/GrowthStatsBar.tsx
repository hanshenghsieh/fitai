'use client'

import { cn } from '@/lib/utils'
import type { GrowthDashboardStats } from '@/growth/types'

const STAT_ITEMS: { key: keyof GrowthDashboardStats; label: string }[] = [
  { key: 'todayFound', label: '今日找到文章' },
  { key: 'worthReply', label: '值得留言' },
  { key: 'replied', label: '已回覆' },
  { key: 'skipped', label: '已略過' },
  { key: 'pending', label: '待處理' },
]

export function GrowthStatsBar({ stats }: { stats: GrowthDashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {STAT_ITEMS.map(item => (
        <div
          key={item.key}
          className="rounded-xl border bg-card px-4 py-3 ring-1 ring-foreground/10"
        >
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats[item.key]}</p>
        </div>
      ))}
    </div>
  )
}

export function scoreColor(score: number | null) {
  if (score == null) return 'text-muted-foreground'
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 45) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

export function statusBadgeClass(status: string) {
  return cn(
    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
    status === 'worth_reply' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    status === 'replied' && 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    status === 'skipped' && 'bg-muted text-muted-foreground',
    status === 'pending' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  )
}
