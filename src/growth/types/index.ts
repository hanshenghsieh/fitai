export type GrowthPostStatus = 'pending' | 'worth_reply' | 'replied' | 'skipped'

export type GrowthReplyType = 'educate' | 'empathy' | 'soft-brand' | 'direct-answer'

export type GrowthPlatform =
  | 'threads'
  | 'dcard'
  | 'ptt'
  | 'facebook'
  | 'reddit'
  | 'instagram'
  | 'manual'
  | 'other'

export interface GrowthPost {
  id: string
  platform: string
  post_url: string | null
  author: string | null
  content: string
  keyword: string | null
  created_at: string
  posted_at: string | null
  is_demo: boolean
  status: GrowthPostStatus
  ai_score: number | null
  ai_reason: string | null
  reply_type: GrowthReplyType | null
  generated_replies: string[] | null
  reply_content: string | null
  replied_at: string | null
  updated_at: string
}

export interface CreateGrowthPostInput {
  platform: string
  postUrl?: string
  author?: string
  content: string
  keyword?: string
  postedAt?: string
  isDemo?: boolean
}

export interface GrowthAnalyzeResult {
  score: number
  reason: string
  replyType: GrowthReplyType
  worthReply: boolean
}

export interface GrowthGenerateRepliesResult {
  replies: [string, string, string]
}

export interface GrowthDashboardStats {
  todayFound: number
  worthReply: number
  replied: number
  skipped: number
  pending: number
}

export const GROWTH_REPLY_TYPE_LABELS: Record<GrowthReplyType, string> = {
  educate: '專業教育',
  empathy: '共感陪伴',
  'soft-brand': '自然品牌',
  'direct-answer': '直接回答',
}

export const GROWTH_STATUS_LABELS: Record<GrowthPostStatus, string> = {
  pending: '待處理',
  worth_reply: '值得留言',
  replied: '已回覆',
  skipped: '已略過',
}
