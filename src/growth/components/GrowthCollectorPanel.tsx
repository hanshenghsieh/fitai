'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Search, Link2, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { CollectedPost, CollectorRunResult, CollectorStatus } from '@/growth/collectors/types'
import { formatGrowthPostTime } from '@/growth/components/format-time'

const CAPABILITY_LABELS: Record<CollectorStatus['capability'], string> = {
  automated_search: '可自動搜尋',
  url_fetch: 'URL 擷取',
  manual_only: '僅手動',
  unavailable: '不可用',
}

interface GrowthCollectorPanelProps {
  onImported: () => void
}

export function GrowthCollectorPanel({ onImported }: GrowthCollectorPanelProps) {
  const [statuses, setStatuses] = useState<CollectorStatus[]>([])
  const [keywords, setKeywords] = useState('減肥,外食,蛋白質')
  const [fetchUrl, setFetchUrl] = useState('')
  const [fetchKeyword, setFetchKeyword] = useState('')
  const [searching, setSearching] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [searchResults, setSearchResults] = useState<CollectorRunResult[]>([])
  const [previewPosts, setPreviewPosts] = useState<CollectedPost[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const loadStatuses = useCallback(async () => {
    const res = await fetch('/api/growth/collectors')
    const data = await res.json()
    if (res.ok) setStatuses(data.collectors)
  }, [])

  useEffect(() => {
    loadStatuses()
  }, [loadStatuses])

  async function handleSearch() {
    const kw = keywords.split(/[,，\s]+/).map(k => k.trim()).filter(Boolean)
    if (!kw.length) {
      toast.error('請輸入關鍵字')
      return
    }
    setSearching(true)
    setSearchResults([])
    setPreviewPosts([])
    setSelected(new Set())
    try {
      const res = await fetch('/api/growth/collect/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: kw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '搜尋失敗')
      setSearchResults(data.results)
      setPreviewPosts(data.posts)
      setSelected(new Set(data.posts.map((p: CollectedPost) => p.url)))
      const found = data.posts.length
      if (found) toast.success(`找到 ${found} 篇可匯入`)
      else toast.message('搜尋完成', { description: '多數平台需手動貼文或 URL 擷取，見下方狀態說明' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '搜尋失敗')
    } finally {
      setSearching(false)
    }
  }

  async function handleFetchUrl() {
    if (!fetchUrl.trim()) {
      toast.error('請貼上 URL')
      return
    }
    setFetching(true)
    try {
      const res = await fetch('/api/growth/collect/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fetchUrl.trim(), keyword: fetchKeyword || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '擷取失敗')
      setSearchResults([data])
      if (data.posts?.length) {
        setPreviewPosts(data.posts)
        setSelected(new Set(data.posts.map((p: CollectedPost) => p.url)))
        toast.success(data.meta.message)
      } else {
        setPreviewPosts([])
        toast.message(data.meta.message, { description: data.meta.error })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '擷取失敗')
    } finally {
      setFetching(false)
    }
  }

  async function handleImport() {
    const posts = previewPosts.filter(p => selected.has(p.url))
    if (!posts.length) {
      toast.error('請選擇要匯入的貼文')
      return
    }
    setImporting(true)
    try {
      const res = await fetch('/api/growth/collect/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '匯入失敗')
      toast.success(`已匯入 ${data.imported?.length ?? 0} 篇，略過 ${data.skipped?.length ?? 0} 篇`)
      setPreviewPosts([])
      setSearchResults([])
      setSelected(new Set())
      onImported()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '匯入失敗')
    } finally {
      setImporting(false)
    }
  }

  function toggleSelect(url: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  return (
    <div className="space-y-6 rounded-xl border p-4">
      <div>
        <h2 className="font-medium">Growth Collector</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          可插拔資料收集器 — 僅使用合法管道，無 mock 資料
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {statuses.map(s => (
          <div key={s.platform} className="rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{s.label}</span>
              <Badge variant={s.configured ? 'default' : 'outline'}>
                {CAPABILITY_LABELS[s.capability]}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{s.summary}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">關鍵字搜尋（目前主要支援 Reddit API）</label>
          <div className="flex gap-2">
            <Input
              placeholder="減肥, 外食, taiwan diet"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">URL 擷取（PTT / Reddit 單篇）</label>
          <Input
            placeholder="https://www.ptt.cc/bbs/... 或 reddit.com/..."
            value={fetchUrl}
            onChange={e => setFetchUrl(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="關鍵字（選填）"
              value={fetchKeyword}
              onChange={e => setFetchKeyword(e.target.value)}
            />
            <Button variant="outline" onClick={handleFetchUrl} disabled={fetching}>
              {fetching ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            </Button>
          </div>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2 text-xs text-muted-foreground">
          {searchResults.map(r => (
            <p key={r.platform}>
              <strong className="text-foreground">{r.platform}</strong>：{r.meta.message}
              {r.meta.error ? ` (${r.meta.error})` : ''}
            </p>
          ))}
        </div>
      )}

      {previewPosts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">預覽（{previewPosts.length} 篇）</h3>
            <Button size="sm" onClick={handleImport} disabled={importing || selected.size === 0}>
              {importing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              匯入並分析 ({selected.size})
            </Button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {previewPosts.map(post => (
              <label
                key={post.url}
                className="flex cursor-pointer gap-3 rounded-lg border p-3 hover:bg-muted/30"
              >
                <input
                  type="checkbox"
                  checked={selected.has(post.url)}
                  onChange={() => toggleSelect(post.url)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{post.platform}</Badge>
                    <span>{formatGrowthPostTime(post.createdAt)}</span>
                    {post.author && <span>@{post.author}</span>}
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm">{post.content}</p>
                  <p className="mt-1 truncate text-xs text-primary">{post.url}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
