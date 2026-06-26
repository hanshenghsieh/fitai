'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, ExternalLink, Check, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { GrowthPost } from '@/growth/types'
import { GROWTH_REPLY_TYPE_LABELS, GROWTH_STATUS_LABELS } from '@/growth/types'
import { scoreColor, statusBadgeClass } from '@/growth/components/GrowthStatsBar'
import { formatGrowthPostTime, formatGrowthPostTimeAgo } from '@/growth/components/format-time'

interface GrowthPostCardProps {
  post: GrowthPost
  onUpdate: (post: GrowthPost) => void
}

const REPLY_LABELS = ['留言 1 · 專業版', '留言 2 · 聊天版', '留言 3 · 自然品牌版']

function shortenReason(reason: string): string {
  return reason.replace(/（規則引擎，未呼叫 AI）/g, '').replace(/（相關關鍵字：[^）]+）/g, '').trim()
}

export function GrowthPostCard({ post, onUpdate }: GrowthPostCardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const postTime = post.posted_at ?? post.created_at
  const timeLabel = formatGrowthPostTime(postTime)
  const timeAgo = formatGrowthPostTimeAgo(postTime)
  const showLink = post.post_url && !post.is_demo

  async function patchPost(action: string, extra?: Record<string, string>) {
    setLoading(action)
    try {
      const res = await fetch(`/api/growth/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '更新失敗')
      onUpdate(data.post)
      toast.success(action === 'replied' ? '已標記為回覆' : action === 'skipped' ? '已略過' : '已更新')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setLoading(null)
    }
  }

  async function copyReply(text: string) {
    await navigator.clipboard.writeText(text)
    toast.success('已複製留言')
  }

  return (
    <Card className={post.status === 'worth_reply' ? 'ring-2 ring-emerald-500/30' : undefined}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{post.platform}</Badge>
          <span className={statusBadgeClass(post.status)}>{GROWTH_STATUS_LABELS[post.status]}</span>
          {post.is_demo && <Badge variant="secondary">示範資料</Badge>}
          {post.reply_type && (
            <Badge variant="secondary">{GROWTH_REPLY_TYPE_LABELS[post.reply_type]}</Badge>
          )}
          {post.ai_score != null && (
            <span className={`ml-auto text-sm font-semibold ${scoreColor(post.ai_score)}`}>
              AI {post.ai_score}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          發文 {timeLabel}
          {timeAgo ? ` · ${timeAgo}` : ''}
        </div>
        <CardTitle className="text-base font-normal leading-relaxed">{post.content}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {post.keyword && <span>關鍵字：{post.keyword}</span>}
          {post.author && <span>作者：{post.author}</span>}
        </div>

        {showLink ? (
          <a
            href={post.post_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            查看原文 <ExternalLink className="size-3.5" />
          </a>
        ) : post.is_demo ? (
          <p className="text-xs text-muted-foreground">示範資料無真實連結，請用「新增貼文」貼上真實文章</p>
        ) : null}

        {post.ai_reason && (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">AI 判斷：</span>
            {shortenReason(post.ai_reason)}
          </p>
        )}

        {post.generated_replies?.length ? (
          <div className="space-y-3">
            {post.generated_replies.map((reply, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{REPLY_LABELS[i]}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => copyReply(reply)}
                    aria-label="複製留言"
                  >
                    <Copy className="size-3.5" /> 複製
                  </Button>
                </div>
                <p className="text-sm leading-relaxed">{reply}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">尚無留言草稿（分數偏低或尚未分析）</p>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => patchPost('replied')}
          disabled={loading != null || post.status === 'replied'}
        >
          <Check className="size-3.5" /> 標記已回覆
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => patchPost('skipped')}
          disabled={loading != null || post.status === 'skipped'}
        >
          <SkipForward className="size-3.5" /> 略過
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => patchPost('reanalyze')}
          disabled={loading != null}
        >
          重新分析
        </Button>
      </CardFooter>
    </Card>
  )
}
