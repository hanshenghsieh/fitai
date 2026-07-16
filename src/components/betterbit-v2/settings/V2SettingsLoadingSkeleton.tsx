'use client'

import type { CSSProperties } from 'react'
import { BB_V2 } from '@/lib/betterbit-v2'
import V2Header from '@/components/betterbit-v2/V2Header'

function SkeletonBlock({
  className = '',
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`v2-settings-skeleton-block ${className}`.trim()}
      style={{
        backgroundColor: 'rgba(238, 248, 233, 0.65)',
        ...style,
      }}
      aria-hidden
    />
  )
}

function SettingsCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="v2-settings-card overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        border: '1px solid rgba(18, 61, 36, 0.08)',
        boxShadow: '0 10px 30px rgba(18, 61, 36, 0.06)',
      }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: i < rows - 1 ? '1px solid rgba(230, 238, 226, 0.9)' : undefined }}
        >
          <SkeletonBlock className="shrink-0 w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-3.5 rounded-md w-[42%]" />
            <SkeletonBlock className="h-3 rounded-md w-[62%]" style={{ opacity: 0.7 }} />
          </div>
          <SkeletonBlock className="w-4 h-4 rounded" style={{ opacity: 0.5 }} />
        </div>
      ))}
    </div>
  )
}

export default function V2SettingsLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="正在整理你的設定"
    >
      <V2Header title="設定" hideLeft hideRight />
      <div
        className="v2-settings-page app-tab-page-content app-tab-column"
        style={{
          paddingLeft: 'var(--v2-page-px)',
          paddingRight: 'var(--v2-page-px)',
          background: `linear-gradient(180deg, ${BB_V2.bg.canvas} 0%, ${BB_V2.bg.softGreen} 100%)`,
        }}
      >
        <p className="text-[13px] mt-2" style={{ color: BB_V2.text.secondary }}>
          正在整理你的設定...
        </p>

        <div className="space-y-[18px] mt-4">
        <SkeletonBlock
          className="w-full rounded-[28px]"
          style={{ height: 104, opacity: 0.85 }}
        />

        <div className="space-y-2.5">
          <SkeletonBlock className="h-3.5 rounded-md w-20 ml-1" style={{ opacity: 0.55 }} />
          <SettingsCardSkeleton rows={4} />
        </div>

        <div className="space-y-2.5">
          <SkeletonBlock className="h-3.5 rounded-md w-20 ml-1" style={{ opacity: 0.55 }} />
          <SettingsCardSkeleton rows={5} />
        </div>

        <div className="space-y-2.5">
          <SkeletonBlock className="h-3.5 rounded-md w-24 ml-1" style={{ opacity: 0.55 }} />
          <SettingsCardSkeleton rows={4} />
        </div>
        </div>
      </div>
    </div>
  )
}
