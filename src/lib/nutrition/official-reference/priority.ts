import type { OfficialSourcePriority, OfficialSourcePriorityKind } from './types'

/** Founder Official Source Priority — ONR always wins over Food DNA / USDA / delivery */
export const OFFICIAL_SOURCE_PRIORITY_ORDER: OfficialSourcePriority[] = ['A', 'B', 'C']

export const PRIORITY_A_KINDS: OfficialSourcePriorityKind[] = [
  'official_nutrition_pdf',
  'official_nutrition_page',
  'official_menu',
]

export const PRIORITY_B_KINDS: OfficialSourcePriorityKind[] = [
  'official_menu',
  'official_announcement',
]

export const PRIORITY_C_KINDS: OfficialSourcePriorityKind[] = ['mohw', 'usda']

export const FORBIDDEN_ONR_SOURCES = [
  'ubereats',
  'foodpanda',
  'google_maps',
  'ai_estimate',
  'gpt',
  'delivery',
] as const

export function priorityRank(p: OfficialSourcePriority): number {
  return OFFICIAL_SOURCE_PRIORITY_ORDER.indexOf(p)
}

export function isHigherPriorityThan(
  official: OfficialSourcePriority,
  other: 'food_dna' | 'usda' | 'delivery' | 'estimated'
): boolean {
  if (other === 'delivery' || other === 'estimated') return true
  if (other === 'food_dna') return true
  if (other === 'usda') return priorityRank(official) <= priorityRank('C')
  return true
}

export function isForbiddenOnrSourceType(sourceType: string): boolean {
  const s = sourceType.toLowerCase()
  return FORBIDDEN_ONR_SOURCES.some(f => s.includes(f.replace('_', '')) || s === f)
}

export function inferPriorityKind(sourceUrl: string): OfficialSourcePriorityKind {
  const u = sourceUrl.toLowerCase()
  if (u.endsWith('.pdf')) return 'official_nutrition_pdf'
  if (/mohw|fda\.gov\.tw|tfda|衛福部/.test(u)) return 'mohw'
  if (/usda|fdc\.nal\.usda/.test(u)) return 'usda'
  if (/nutrition|calorie|營養/.test(u)) return 'official_nutrition_page'
  return 'official_menu'
}

export function priorityForKind(kind: OfficialSourcePriorityKind): OfficialSourcePriority {
  if (PRIORITY_A_KINDS.includes(kind) && kind !== 'official_menu') return 'A'
  if (kind === 'official_menu') return 'A'
  if (PRIORITY_B_KINDS.includes(kind)) return 'B'
  return 'C'
}
