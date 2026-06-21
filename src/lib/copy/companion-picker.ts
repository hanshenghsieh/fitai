import {
  COMPANION_LINES,
  type CompanionCategory,
  type CompanionLine,
} from '@/lib/copy/companion-lines'

const RECENT_CAP = 50

export function pickCompanionLine(
  recentIds: string[],
  category?: CompanionCategory,
  salt = ''
): CompanionLine {
  const pool = category
    ? COMPANION_LINES.filter(l => l.category === category)
    : COMPANION_LINES
  const recent = new Set(recentIds.slice(-RECENT_CAP))
  const fresh = pool.filter(l => !recent.has(l.id))
  const candidates = fresh.length > 0 ? fresh : pool
  let h = 0
  const key = `${Date.now()}-${salt}`
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  const idx = Math.abs(h) % candidates.length
  return candidates[idx]!
}

export function companionCategoryForHour(hour: number): CompanionCategory | undefined {
  if (hour >= 23 || hour < 5) return 'night'
  if (hour >= 21) return 'lateNight'
  if (hour >= 17) return 'gentle'
  return undefined
}
