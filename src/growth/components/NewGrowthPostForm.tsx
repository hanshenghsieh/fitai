'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const PLATFORMS = ['threads', 'dcard', 'ptt', 'facebook', 'reddit', 'instagram', 'manual', 'other']

export function NewGrowthPostForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [platform, setPlatform] = useState('manual')
  const [postUrl, setPostUrl] = useState('')
  const [content, setContent] = useState('')
  const [keyword, setKeyword] = useState('')
  const [author, setAuthor] = useState('')
  const [postedAt, setPostedAt] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) {
      toast.error('請輸入貼文內容')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/growth/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          postUrl: postUrl || undefined,
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
        <h1 className="mt-4 text-2xl font-semibold">新增貼文</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          手動貼上社群文章，系統會自動分析並產生留言草稿
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="platform">平台</Label>
          <select
            id="platform"
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {PLATFORMS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postUrl">URL</Label>
          <Input
            id="postUrl"
            type="url"
            placeholder="https://..."
            value={postUrl}
            onChange={e => setPostUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="author">作者（選填）</Label>
          <Input
            id="author"
            value={author}
            onChange={e => setAuthor(e.target.value)}
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

        <div className="space-y-2">
          <Label htmlFor="keyword">關鍵字</Label>
          <Input
            id="keyword"
            placeholder="減肥、蛋白質、外食…"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">貼文內容 *</Label>
          <Textarea
            id="content"
            rows={8}
            placeholder="貼上原文內容…"
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />
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
