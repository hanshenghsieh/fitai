import { loadKeywordList } from '@/growth/prompts/loader'

const POSITIVE_KEYWORDS = loadKeywordList('keywords-positive.txt')
const NEGATIVE_KEYWORDS = loadKeywordList('keywords-negative.txt')

const BASE_SCORE = 50
const POSITIVE_BOOST = 8
const NEGATIVE_PENALTY = 15
const MAX_POSITIVE_MATCHES = 5
const MAX_NEGATIVE_MATCHES = 4

function countMatches(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase()
  return keywords.filter(kw => lower.includes(kw.toLowerCase()))
}

export interface RuleScoreResult {
  score: number
  positiveMatches: string[]
  negativeMatches: string[]
  summary: string
}

export function computeRuleScore(content: string, keyword?: string | null): RuleScoreResult {
  const haystack = keyword ? `${content} ${keyword}` : content
  const positiveMatches = countMatches(haystack, POSITIVE_KEYWORDS).slice(0, MAX_POSITIVE_MATCHES)
  const negativeMatches = countMatches(haystack, NEGATIVE_KEYWORDS).slice(0, MAX_NEGATIVE_MATCHES)

  let score = BASE_SCORE
  score += positiveMatches.length * POSITIVE_BOOST
  score -= negativeMatches.length * NEGATIVE_PENALTY
  score = Math.max(0, Math.min(100, score))

  const parts: string[] = []
  if (positiveMatches.length) parts.push(`相關關鍵字：${positiveMatches.join('、')}`)
  if (negativeMatches.length) parts.push(`降分關鍵字：${negativeMatches.join('、')}`)
  if (!parts.length) parts.push('無明顯加減分關鍵字')

  return {
    score,
    positiveMatches,
    negativeMatches,
    summary: parts.join('；'),
  }
}

export function inferReplyTypeFromContent(content: string): 'educate' | 'empathy' | 'soft-brand' | 'direct-answer' {
  const lower = content.toLowerCase()
  if (/怎麼|如何|多少|什麼|哪個|推薦|吃什麼|算|幾卡/.test(lower)) return 'direct-answer'
  if (/好難|挫折|放棄|焦慮|壓力|自卑|沒用|失敗/.test(lower)) return 'empathy'
  if (/app|紀錄|追蹤|工具/.test(lower)) return 'soft-brand'
  return 'educate'
}

export function statusFromScore(score: number): 'worth_reply' | 'pending' | 'skipped' {
  if (score >= 55) return 'worth_reply'
  if (score < 30) return 'skipped'
  return 'pending'
}
