'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GrowthStatsBar } from '@/growth/components/GrowthStatsBar'
import { GrowthPostCard } from '@/growth/components/GrowthPostCard'
import { GrowthSetupBanner } from '@/growth/components/GrowthSetupBanner'
import { GrowthCollectorPanel } from '@/growth/components/GrowthCollectorPanel'
import type { GrowthDashboardStats, GrowthPost } from '@/growth/types'

const EMPTY_STATS: GrowthDashboardStats = {
  todayFound: 0,
  worthReply: 0,
  replied: 0,
  skipped: 0,
  pending: 0,
}

function PostSection({ title, posts, onUpdate }: {
  title: string
  posts: GrowthPost[]
  onUpdate: (post: GrowthPost) => void
}) {
  if (!posts.length) return null
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="space-y-4">
        {posts.map(post => (
          <GrowthPostCard key={post.id} post={post} onUpdate={onUpdate} />
        ))}
      </div>
    </section>
  )
}

export function GrowthDashboard() {
  const router = useRouter()
  const [posts, setPosts] = useState<GrowthPost[]>([])
  const [stats, setStats] = useState<GrowthDashboardStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [setupError, setSetupError] = useState<{
    setup?: string
    sqlEditorUrl?: string
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setSetupError(null)
    try {
      const res = await fetch('/api/growth/posts')
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'GROWTH_TABLE_MISSING') {
          setSetupError({ setup: data.setup, sqlEditorUrl: data.sqlEditorUrl })
          return
        }
        throw new Error(data.error ?? '載入失敗')
      }
      setPosts(data.posts)
      setStats(data.stats)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleUpdate(updated: GrowthPost) {
    setPosts(prev => prev.map(p => (p.id === updated.id ? updated : p)))
    load()
  }

  const worthPosts = posts.filter(p => p.status === 'worth_reply')
  const otherPosts = posts.filter(p => p.status !== 'worth_reply')

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">BetterBit Growth AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Collector 收集真實貼文 → AI 分析 → Founder 審核後自行發布
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="size-3.5" /> 重新整理
          </Button>
          <Button size="sm" onClick={() => router.push('/growth/new')}>
            <Plus className="size-3.5" /> 手動新增（Threads/Dcard）
          </Button>
        </div>
      </header>

      {setupError && (
        <GrowthSetupBanner
          setup={setupError.setup}
          sqlEditorUrl={setupError.sqlEditorUrl}
          onRetry={load}
        />
      )}

      <GrowthCollectorPanel onImported={load} />

      <GrowthStatsBar stats={stats} />

      {loading ? (
        <p className="text-sm text-muted-foreground">載入中…</p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <p>尚無貼文。請用上方 Collector 搜尋／擷取，或手動新增 Threads、Dcard 貼文。</p>
        </div>
      ) : (
        <div className="space-y-8">
          <PostSection title={`值得留言（${worthPosts.length}）`} posts={worthPosts} onUpdate={handleUpdate} />
          <PostSection title="其他" posts={otherPosts} onUpdate={handleUpdate} />
        </div>
      )}
    </div>
  )
}
