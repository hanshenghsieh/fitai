import type { RematchProposal } from '@/lib/nutrition/search-v2/types'
import { collectAllCandidates } from '@/lib/nutrition/search-v2/matcher'
import { listUnknownQueue, setUnknownPossibleMatches } from '@/lib/nutrition/search-v2/unknown-queue'
import { listUnknownPhotoQueue } from '@/lib/nutrition/search-v2/unknown-photo-queue'

const REMATCH_THRESHOLD = 95

export interface CatalogItem {
  name: string
  store?: string
}

export function scoreNameSimilarity(a: string, b: string): number {
  const na = a.replace(/\s+/g, '').toLowerCase()
  const nb = b.replace(/\s+/g, '').toLowerCase()
  if (na === nb) return 100
  if (na.includes(nb) || nb.includes(na)) return 92
  const ta = [...new Set(na.match(/[\u4e00-\u9fff]{2,}/g) ?? [])]
  const tb = [...new Set(nb.match(/[\u4e00-\u9fff]{2,}/g) ?? [])]
  if (!ta.length || !tb.length) return 0
  const hits = ta.filter(t => tb.some(u => u.includes(t) || t.includes(u))).length
  return Math.round((hits / Math.max(ta.length, tb.length)) * 100)
}

export function runAutoRematch(catalog?: CatalogItem[]): RematchProposal[] {
  const waiting = listUnknownQueue('waiting')
  const photoWaiting = listUnknownPhotoQueue('waiting')
  const proposals: RematchProposal[] = []

  const allEntries = [
    ...waiting.map(e => ({ id: e.id, food_name: e.food_name, kind: 'text' as const })),
    ...photoWaiting.map(e => ({ id: e.id, food_name: e.detected_label, kind: 'photo' as const })),
  ]

  for (const entry of allEntries) {
    const candidates = collectAllCandidates(entry.food_name)
    const catalogHits =
      catalog?.map(item => ({
        item,
        score: scoreNameSimilarity(entry.food_name, item.name),
      })) ?? []

    const bestCatalog = catalogHits.sort((a, b) => b.score - a.score)[0]
    const bestCandidate = candidates.find(c => c.nutrition_status === 'official')

    let proposal: RematchProposal | null = null

    if (bestCandidate && bestCandidate.match_score >= REMATCH_THRESHOLD) {
      proposal = {
        queue_entry_id: entry.id,
        food_name: entry.food_name,
        candidate: bestCandidate,
        match_score: bestCandidate.match_score,
        message: '我們找到可信營養資料。',
        actions: ['update_record', 'keep_text', 'view_diff'],
      }
    } else if (bestCatalog && bestCatalog.score >= REMATCH_THRESHOLD) {
      const refreshed = collectAllCandidates(bestCatalog.item.name)
      const c = refreshed[0]
      if (c && c.nutrition_status === 'official') {
        proposal = {
          queue_entry_id: entry.id,
          food_name: entry.food_name,
          candidate: c,
          match_score: bestCatalog.score,
          message: '我們找到可信營養資料。',
          actions: ['update_record', 'keep_text', 'view_diff'],
        }
      }
    }

    if (proposal) {
      proposals.push(proposal)
      setUnknownPossibleMatches(
        entry.id,
        proposals.filter(p => p.queue_entry_id === entry.id).map(p => p.candidate.name)
      )
    }
  }

  return proposals
}

/** User must explicitly accept — never auto-overwrite */
export function applyRematchProposal(
  proposal: RematchProposal,
  userAction: 'update_record' | 'keep_text' | 'view_diff'
): { applied: boolean; message: string } {
  if (userAction === 'keep_text') {
    return { applied: false, message: '已保持文字紀錄，未覆蓋營養資料。' }
  }
  if (userAction === 'view_diff') {
    return { applied: false, message: '請在 UI 查看差異後由使用者決定。' }
  }
  if (userAction === 'update_record') {
    return {
      applied: true,
      message: `已依使用者確認更新為：${proposal.candidate.name}`,
    }
  }
  return { applied: false, message: '未知操作' }
}
