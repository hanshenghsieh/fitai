import { normalizeFoodName } from '@/lib/food-kb/normalize'
import { normalizeAliasToken, resolveAliasQuery } from '@/lib/nutrition/alias-engine'

/** Foods too ambiguous for silent auto apply — always pending_review. */
export const AUTO_APPLY_QUERY_BLOCKLIST: RegExp[] = [
  /滷味/,
  /自助餐/,
  /便當/,
  /火鍋/,
  /鹽酥/,
  /手搖|珍奶|全糖|半糖|微糖|少糖/,
]

/** Wrong-pair guards — substring similar but different dish. */
export const AUTO_APPLY_PAIR_DENY: Array<[RegExp, RegExp]> = [
  [/菜包/, /肉包/],
  [/竹筍湯$/, /竹筍排骨湯/],
  [/竹筍湯$/, /排骨湯/],
]

export function isAutoApplyQueryBlocked(query: string): boolean {
  const q = query.trim()
  return AUTO_APPLY_QUERY_BLOCKLIST.some(re => re.test(q))
}

export function isDeniedPair(original: string, candidate: string): boolean {
  for (const [a, b] of AUTO_APPLY_PAIR_DENY) {
    if (a.test(original) && b.test(candidate) && normalizeFoodName(original) !== normalizeFoodName(candidate)) {
      return true
    }
    if (b.test(original) && a.test(candidate) && normalizeFoodName(original) !== normalizeFoodName(candidate)) {
      return true
    }
  }
  return false
}

export interface MatchScoreResult {
  score: number
  match_kind: 'exact' | 'strong_alias' | 'none'
  alias_official_name?: string
}

export function computeAutoApplyMatchScore(originalName: string, candidateName: string, store?: string): MatchScoreResult {
  const original = normalizeFoodName(originalName)
  const candidate = normalizeFoodName(candidateName)
  if (!original || !candidate) return { score: 0, match_kind: 'none' }

  if (isDeniedPair(originalName, candidateName)) {
    return { score: 0, match_kind: 'none' }
  }

  if (original === candidate) {
    return { score: 1, match_kind: 'exact' }
  }

  const alias = resolveAliasQuery(originalName, store ? { store } : undefined)
  if (alias) {
    const officialNorm = normalizeFoodName(alias.official_name)
    if (officialNorm === candidate) {
      const aliasTok = normalizeAliasToken(alias.matched_alias)
      const queryTok = normalizeAliasToken(originalName)
      if (alias.match_type === 'alias' && aliasTok === queryTok) {
        return { score: 0.995, match_kind: 'strong_alias', alias_official_name: alias.official_name }
      }
      if (alias.match_type === 'official' && queryTok === officialNorm) {
        return { score: 1, match_kind: 'exact', alias_official_name: alias.official_name }
      }
    }
  }

  if (original.includes(candidate) || candidate.includes(original)) {
    return { score: 0.92, match_kind: 'none' }
  }

  return { score: 0, match_kind: 'none' }
}

export function passesAutoApplyScoreThreshold(score: number): boolean {
  return score >= 0.99
}
