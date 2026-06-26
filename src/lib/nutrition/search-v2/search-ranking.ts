import type { SearchSourceTier, SearchV2Candidate } from '@/lib/nutrition/search-v2/types'

const TIER_ORDER: Record<SearchSourceTier, number> = {
  official: 0,
  onr: 1,
  food_dna: 2,
  recent: 3,
  favorite: 4,
  unknown: 5,
}

export function compareSearchCandidates(a: SearchV2Candidate, b: SearchV2Candidate): number {
  const tierDiff = TIER_ORDER[a.source_tier] - TIER_ORDER[b.source_tier]
  if (tierDiff !== 0) return tierDiff
  const scoreDiff = b.match_score - a.match_score
  if (scoreDiff !== 0) return scoreDiff
  return a.name.localeCompare(b.name, 'zh-TW')
}

export function rankSearchCandidates(candidates: SearchV2Candidate[]): SearchV2Candidate[] {
  return [...candidates].sort(compareSearchCandidates)
}

export function sourceTierLabel(tier: SearchSourceTier): string {
  const labels: Record<SearchSourceTier, string> = {
    official: 'Official',
    onr: 'ONR',
    food_dna: 'Food DNA',
    recent: 'Recent Foods',
    favorite: 'Favorites',
    unknown: 'Unknown',
  }
  return labels[tier]
}
