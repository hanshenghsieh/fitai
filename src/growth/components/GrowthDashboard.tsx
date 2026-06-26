'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, RefreshCw, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GrowthStatsBar } from '@/growth/components/GrowthStatsBar'
import { GrowthPostCard } from '@/growth/components/GrowthPostCard'
import { GrowthSetupBanner } from '@/growth/components/GrowthSetupBanner'
import type { GrowthDashboardStats, GrowthPost } from '@/growth/types'

const EMPTY_STATS: GrowthDashboardStats = {
  todayFound: 0,
  worthReply: 0,
  replied: 0,
  skipped: 0,
  pending: 0,
}

export function GrowthDashboard() {
  const router = useRouter()
  const [posts, setPosts] = useState<GrowthPost[]>([])
  const [stats, setStats] = useState<GrowthDashboardStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
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

  async function seedMock() {
    setSeeding(true)
    try {
      const res = await fetch('/api/growth/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '匯入失敗')
      toast.success(data.message)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '匯入失敗')
    } finally {
      setSeeding(false)
    }
  }

  function handleUpdate(updated: GrowthPost) {
    setPosts(prev => prev.map(p => (p.id === updated.id ? updated : p)))
    load()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">BetterBit Growth AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI 協助找文 · 人工審核 · Founder 自行發布
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="size-3.5" /> 重新整理
          </Button>
          <Button variant="outline" size="sm" onClick={seedMock} disabled={seeding}>
            <Database className="size-3.5" /> 匯入測試資料
          </Button>
          <Button size="sm" onClick={() => router.push('/growth/new')}>
            <Plus className="size-3.5" /> 新增貼文
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

      <GrowthStatsBar stats={stats} />

      {loading ? (
        <p className="text-sm text-muted-foreground">載入中…</p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">尚無貼文</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" onClick={() => router.push('/growth/new')}>新增第一篇</Button>
            <Button size="sm" variant="outline" onClick={seedMock} disabled={seeding}>
              匯入 20 篇測試資料
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <GrowthPostCard key={post.id} post={post} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
