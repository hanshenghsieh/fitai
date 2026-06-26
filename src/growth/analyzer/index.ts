import { z } from 'zod'
import type { GrowthAnalyzeResult, GrowthGenerateRepliesResult, GrowthReplyType } from '@/growth/types'
import { loadPrompt, renderPrompt } from '@/growth/prompts/loader'
import { computeRuleScore, inferReplyTypeFromContent, statusFromScore } from '@/growth/analyzer/scoring'
import { callGrowthJson } from '@/growth/ai/client'

const AnalyzeSchema = z.object({
  score: z.number().min(0).max(100),
  reason: z.string().min(1),
  replyType: z.enum(['educate', 'empathy', 'soft-brand', 'direct-answer']),
  worthReply: z.boolean(),
})

const RepliesSchema = z.object({
  replies: z.tuple([z.string(), z.string(), z.string()]),
})

function fallbackAnalyze(
  content: string,
  keyword: string | null | undefined,
  platform: string
): GrowthAnalyzeResult {
  const rule = computeRuleScore(content, keyword)
  const replyType = inferReplyTypeFromContent(content)
  const worthReply = rule.score >= 50 && rule.negativeMatches.length === 0

  return {
    score: rule.score,
    reason: `${rule.summary}（規則引擎，未呼叫 AI）`,
    replyType,
    worthReply,
  }
}

function fallbackReplies(content: string, replyType: GrowthReplyType): GrowthGenerateRepliesResult {
  const is711 = /7-11|超商|全家/.test(content)
  const isMcd = /麥當勞|速食/.test(content)
  const isWeight = /體重|沒動|放棄/.test(content)

  if (replyType === 'empathy' || isWeight) {
    return {
      replies: [
        '一個月數字沒動真的會懷疑人生，但其實體重本來就會上下跳，看一週平均比較準。',
        '欸我也有過這階段，後來改成只看週五早上空腹，心情好很多。',
        '很多人卡在平台期，不一定是你做錯，有時候只是身體在適應。',
      ],
    }
  }

  if (is711) {
    return {
      replies: [
        '我加班也常7-11，通常茶葉蛋+無糖豆漿+一個飯糰就撐得住，起司飯糰那種就當欺騙餐。',
        '超商我會避開炸物跟含糖飲，烤雞胸或沙拉雖無聊但真的省事。',
        '若預算夠，兩顆蛋+沙拉+無糖優格，蛋白質比較夠。',
      ],
    }
  }

  if (isMcd) {
    return {
      replies: [
        '麥當勞不是不能吃啦，我會選烤堡、玉米湯，薯條換沙拉，飲料一定無糖。',
        '每週兩次 ok 的，重點是其他餐有沒有拉回來，不要每一餐都當最後一餐哈哈。',
        '醬料可以請店員少加，炸的換烤的，熱量差很多。',
      ],
    }
  }

  return {
    replies: [
      '我外食會先看蛋白質夠不夠，再決定飯要不要吃一半，這樣比較不會吃完才後悔。',
      '其實不用一次改很多，先固定早餐或午餐其中一餐就好，比較撐得住。',
      '這題超常見，我後來是先把常去的店存幾個安全組合，就不用每天重想。',
    ],
  }
}

export async function analyzePost(input: {
  content: string
  keyword?: string | null
  platform?: string
}): Promise<GrowthAnalyzeResult> {
  const platform = input.platform ?? 'manual'
  const rule = computeRuleScore(input.content, input.keyword)

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return fallbackAnalyze(input.content, input.keyword, platform)
  }

  try {
    const system = loadPrompt('analyze-system.md')
    const user = renderPrompt(loadPrompt('analyze-user.md'), {
      platform,
      keyword: input.keyword ?? '（無）',
      content: input.content,
      ruleScore: String(rule.score),
    })

    const parsed = await callGrowthJson(system, user, AnalyzeSchema)
    const blendedScore = Math.round(parsed.score * 0.6 + rule.score * 0.4)

    return {
      score: blendedScore,
      reason: `${parsed.reason}（${rule.summary}）`,
      replyType: parsed.replyType,
      worthReply: parsed.worthReply && blendedScore >= 45,
    }
  } catch {
    return fallbackAnalyze(input.content, input.keyword, platform)
  }
}

export async function generateReplies(input: {
  content: string
  platform?: string
  replyType: GrowthReplyType
  aiReason?: string | null
}): Promise<GrowthGenerateRepliesResult> {
  const platform = input.platform ?? 'manual'

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return fallbackReplies(input.content, input.replyType)
  }

  try {
    const system = loadPrompt('generate-replies-system.md')
    const user = renderPrompt(loadPrompt('generate-replies-user.md'), {
      platform,
      replyType: input.replyType,
      aiReason: input.aiReason ?? '（無）',
      content: input.content,
    })

    return await callGrowthJson(system, user, RepliesSchema)
  } catch {
    return fallbackReplies(input.content, input.replyType)
  }
}

export { statusFromScore }
