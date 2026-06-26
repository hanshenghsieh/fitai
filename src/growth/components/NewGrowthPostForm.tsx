'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { GROWTH_PLATFORMS, detectPlatformFromUrl } from '@/growth/types/platforms'

export function NewGrowthPostForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [platform, setPlatform] = useState('threads')
  const [postUrl, setPostUrl] = useState('')
  const [content, setContent] = useState('')
  const [keyword, setKeyword] = useState('')
  const [author, setAuthor] = useState('')
  const [postedAt, setPostedAt] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })

  function handleUrlChange(url: string) {
    setPostUrl(url)
    const detected = detectPlatformFromUrl(url)
    if (detected) setPlatform(detected)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!postUrl.trim()) {
      toast.error('請貼上原文 URL')
      return
    }
    if (!content.trim()) {
      toast.error('請貼上貼文內容')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/growth/collect/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          url: postUrl.trim(),
          author: author || undefined,
          content,
          keyword: keyword || undefined,
          postedAt: postedAt ? new Date(postedAt).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '建立失敗')
      toast.success('已建立並完成 AI 分析')
      router.push('/growth')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/growth')}>
          <ArrowLeft className="size-3.5" /> 返回 Dashboard
        </Button>
        <h1 className="mt-4 text-2xl font-semibold">新增真實貼文</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Threads / Dcard 等需手動複製內文。PTT / Reddit 可改用 Dashboard「URL 擷取」。
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">怎麼找文？</p>
        <p className="mt-1">搜尋關鍵字：減肥、外食、蛋白質、7-11、不知道吃什麼、熱量赤字…</p>
        <p className="mt-1">找到有人<strong className="text-foreground">發問或困擾</strong>的貼文，複製連結＋內文貼到下面。</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="postUrl">原文 URL *</Label>
          <Input
            id="postUrl"
            type="url"
            placeholder="https://www.threads.net/... 或 https://www.dcard.tw/..."
            value={postUrl}
            onChange={e => handleUrlChange(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">貼上後會自動辨識平台</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="platform">平台</Label>
          <select
            id="platform"
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {GROWTH_PLATFORMS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">貼文內容 *</Label>
          <Textarea
            id="content"
            rows={8}
            placeholder="完整複製原文，不要摘要…"
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postedAt">發文時間</Label>
          <Input
            id="postedAt"
            type="datetime-local"
            value={postedAt}
            onChange={e => setPostedAt(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="author">作者（選填）</Label>
            <Input
              id="author"
              placeholder="@username"
              value={author}
              onChange={e => setAuthor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyword">你用的搜尋關鍵字</Label>
            <Input
              id="keyword"
              placeholder="外食、減肥…"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> 分析中…
            </>
          ) : (
            '送出並分析'
          )}
        </Button>
      </form>
    </div>
  )
}
