import type {
  ClarificationQuestion,
  ClarificationSession,
  SearchV2Candidate,
} from '@/lib/nutrition/search-v2/types'
import { hasClarificationPattern } from '@/lib/nutrition/search-v2/query-patterns'
import { collectClientCandidates } from '@/lib/nutrition/search-v2/matcher-core'

export { hasClarificationPattern } from '@/lib/nutrition/search-v2/query-patterns'

const SOUP_VARIANTS: ClarificationQuestion = {
  id: 'soup_type',
  prompt: '你是哪一種？',
  required: true,
  options: [
    { id: 'pork_rib', label: '竹筍排骨湯' },
    { id: 'chicken', label: '竹筍雞湯' },
    { id: 'clam', label: '竹筍蛤蜊湯' },
    { id: 'bamboo', label: '麻竹筍湯' },
    { id: 'other', label: '其他' },
  ],
}

const PORTION_QUESTION: ClarificationQuestion = {
  id: 'portion',
  prompt: '份量？',
  required: true,
  options: [
    { id: 'small', label: '小碗' },
    { id: 'medium', label: '中碗' },
    { id: 'large', label: '大碗' },
  ],
}

const PROTEIN_QUESTION: ClarificationQuestion = {
  id: 'protein',
  prompt: '主要食材？',
  required: false,
  options: [
    { id: 'pork', label: '排骨' },
    { id: 'chicken', label: '雞肉' },
    { id: 'seafood', label: '海鮮' },
    { id: 'bamboo_only', label: '純竹筍' },
  ],
}

const VARIANT_LABELS: Record<string, string> = {
  pork_rib: '竹筍排骨湯',
  chicken: '竹筍雞湯',
  clam: '竹筍蛤蜊湯',
  bamboo: '麻竹筍湯',
}

function newSessionId(): string {
  return `clr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function buildClarificationQuestions(
  query: string,
  candidates: SearchV2Candidate[]
): ClarificationQuestion[] {
  const q = query.trim()
  const questions: ClarificationQuestion[] = []

  if (/竹筍.*湯|湯.*竹筍/.test(q)) {
    questions.push(SOUP_VARIANTS)
    questions.push(PORTION_QUESTION)
    if (!candidates.some(c => c.name.includes('排骨') || c.name.includes('雞'))) {
      questions.push(PROTEIN_QUESTION)
    }
    return questions.slice(0, 3)
  }

  if (/雞湯/.test(q)) {
    questions.push({
      id: 'chicken_soup_type',
      prompt: '哪一種雞湯？',
      required: true,
      options: [
        { id: 'plain', label: '清雞湯' },
        { id: 'mushroom', label: '香菇雞湯' },
        { id: 'ginseng', label: '人參雞湯' },
        { id: 'other', label: '其他' },
      ],
    })
    questions.push(PORTION_QUESTION)
    return questions.slice(0, 3)
  }

  if (/牛肉麵|牛麵/.test(q)) {
    questions.push({
      id: 'beef_noodle_style',
      prompt: '哪一種牛肉麵？',
      required: true,
      options: [
        { id: 'clear', label: '清燉牛肉麵' },
        { id: 'braised', label: '紅燒牛肉麵' },
        { id: 'chain', label: '連鎖店套餐' },
        { id: 'other', label: '其他' },
      ],
    })
    return questions.slice(0, 3)
  }

  if (/便當/.test(q)) {
    questions.push({
      id: 'bento_store',
      prompt: '哪裡的便當？',
      required: true,
      options: [
        { id: '7-11', label: '7-11' },
        { id: 'family', label: '全家' },
        { id: 'restaurant', label: '便當店' },
        { id: 'other', label: '其他' },
      ],
    })
    questions.push({
      id: 'bento_main',
      prompt: '主菜？',
      required: true,
      options: candidates.slice(0, 4).map(c => ({ id: c.id, label: c.name })),
    })
    return questions.slice(0, 3)
  }

  if (/滷味|鹽酥雞|火鍋|自助餐|燒肉|串串|鹹酥雞/.test(q)) {
    questions.push({
      id: 'high_risk_type',
      prompt: '這是哪一種？',
      required: true,
      options:
        candidates.length >= 2
          ? candidates.slice(0, 5).map(c => ({
              id: c.id,
              label: c.store ? `${c.store} · ${c.name}` : c.name,
            }))
          : [
              { id: 'portion_small', label: '小份' },
              { id: 'portion_medium', label: '中份' },
              { id: 'portion_large', label: '大份' },
              { id: 'other', label: '其他' },
            ],
    })
    questions.push(PORTION_QUESTION)
    return questions.slice(0, 3)
  }

  if (candidates.length >= 2) {
    questions.push({
      id: 'pick_candidate',
      prompt: '你指的是哪一個？',
      required: true,
      options: candidates.slice(0, 5).map(c => ({
        id: c.id,
        label: c.store ? `${c.store} · ${c.name}` : c.name,
      })),
    })
  }

  return questions.slice(0, 3)
}

export function startClarificationSession(
  query: string,
  candidates: SearchV2Candidate[]
): ClarificationSession | null {
  const questions = buildClarificationQuestions(query, candidates)
  if (!questions.length) return null

  return {
    sessionId: newSessionId(),
    originalQuery: query.trim(),
    questions,
    answers: {},
    step: 0,
    maxSteps: Math.min(questions.length, 3),
  }
}

export function applyClarificationAnswer(
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

export function resolvedQueryFromClarification(session: ClarificationSession): string {
  const parts: string[] = [session.originalQuery]
  const soup = session.answers.soup_type
  if (soup && soup !== 'other' && VARIANT_LABELS[soup]) {
    parts.push(VARIANT_LABELS[soup]!)
  }
  const chicken = session.answers.chicken_soup_type
  if (chicken === 'plain') parts.push('清雞湯')
  if (chicken === 'mushroom') parts.push('香菇雞湯')
  if (beefStyle(session)) parts.push(beefStyle(session)!)
  const store = session.answers.bento_store
  if (store === '7-11') parts.push('7-11')
  if (store === 'family') parts.push('全家')
  const pick = session.answers.pick_candidate
  if (pick) parts.push(pick)
  return parts.join(' ')
}

function beefStyle(session: ClarificationSession): string | null {
  const s = session.answers.beef_noodle_style
  if (s === 'clear') return '清燉牛肉麵'
  if (s === 'braised') return '紅燒牛肉麵'
  return null
}

export function researchAfterClarification(session: ClarificationSession): SearchV2Candidate[] {
  const query = resolvedQueryFromClarification(session)
  return collectClientCandidates(query)
}
