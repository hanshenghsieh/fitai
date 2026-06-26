import type { ClarificationQuestion, ClarificationSession } from '@/lib/nutrition/search-v2/types'

const BUN_TYPES: ClarificationQuestion = {
  id: 'bun_type',
  prompt: '你比較接近哪一種？',
  required: true,
  options: [
    { id: 'cabbage', label: '高麗菜包' },
    { id: 'chive', label: '韭菜包' },
    { id: 'bamboo', label: '筍包' },
    { id: 'veggie', label: '素菜包' },
    { id: 'meat', label: '肉包' },
    { id: 'unsure', label: '不確定' },
  ],
}

const BUN_COUNT: ClarificationQuestion = {
  id: 'bun_count',
  prompt: '大約幾顆？',
  required: true,
  options: [
    { id: '1', label: '1 顆' },
    { id: '2', label: '2 顆' },
    { id: '3', label: '3 顆' },
    { id: 'custom', label: '自訂' },
  ],
}

const BUN_SIZE: ClarificationQuestion = {
  id: 'bun_size',
  prompt: '大小？',
  required: true,
  options: [
    { id: 'small', label: '小顆' },
    { id: 'medium', label: '一般' },
    { id: 'large', label: '大顆' },
  ],
}

const BUN_TYPE_LABELS: Record<string, string> = {
  cabbage: '高麗菜包',
  chive: '韭菜包',
  bamboo: '筍包',
  veggie: '素菜包',
  meat: '肉包',
}

function newSessionId(): string {
  return `unk-clr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isBunLikeQuery(query: string): boolean {
  return /菜包|高麗菜包|韭菜包|素菜包|肉包|筍包|包子/.test(query.trim())
}

export function buildUnknownFoodClarification(query: string): ClarificationSession | null {
  const q = query.trim()
  if (!q) return null

  const questions: ClarificationQuestion[] = []

  if (isBunLikeQuery(q)) {
    questions.push(BUN_TYPES, BUN_COUNT, BUN_SIZE)
    return {
      sessionId: newSessionId(),
      originalQuery: q,
      questions: questions.slice(0, 3),
      answers: {},
      step: 0,
      maxSteps: 3,
    }
  }

  return null
}

export function applyUnknownClarificationAnswer(
  session: ClarificationSession,
  questionId: string,
  optionId: string
): ClarificationSession {
  return {
    ...session,
    answers: { ...session.answers, [questionId]: optionId },
    step: Math.min(session.step + 1, session.maxSteps),
  }
}

export function clarificationComplete(session: ClarificationSession): boolean {
  const required = session.questions.filter(q => q.required)
  return required.every(q => session.answers[q.id])
}

export function resolvedQueryFromUnknownClarification(session: ClarificationSession): string {
  const parts: string[] = []
  const bunType = session.answers.bun_type
  if (bunType && bunType !== 'unsure' && BUN_TYPE_LABELS[bunType]) {
    parts.push(BUN_TYPE_LABELS[bunType]!)
  } else if (session.originalQuery) {
    parts.push(session.originalQuery)
  }

  const count = session.answers.bun_count
  if (count && count !== 'custom') {
    parts.push(`${count}顆`)
  }

  const size = session.answers.bun_size
  if (size === 'small') parts.push('小顆')
  if (size === 'large') parts.push('大顆')

  return parts.join(' ') || session.originalQuery
}
