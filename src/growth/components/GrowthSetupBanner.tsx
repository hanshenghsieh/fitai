'use client'

import { Button } from '@/components/ui/button'

interface GrowthSetupBannerProps {
  setup?: string
  sqlEditorUrl?: string
  onRetry: () => void
}

export function GrowthSetupBanner({ setup, sqlEditorUrl, onRetry }: GrowthSetupBannerProps) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <h2 className="font-medium text-amber-900 dark:text-amber-100">需要先建立資料表</h2>
      <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">
        Supabase 裡還沒有 <code className="rounded bg-background/60 px-1">growth_posts</code> 資料表。
      </p>
      {setup && (
        <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-background/70 p-3 text-xs whitespace-pre-wrap">
          {setup}
        </pre>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {sqlEditorUrl && (
          <Button size="sm" onClick={() => window.open(sqlEditorUrl, '_blank', 'noopener,noreferrer')}>
            開啟 Supabase SQL Editor
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onRetry}>
          我已建立，重新載入
        </Button>
      </div>
    </div>
  )
}
