export const GROWTH_PLATFORMS = [
  { id: 'threads', label: 'Threads' },
  { id: 'dcard', label: 'Dcard' },
  { id: 'ptt', label: 'PTT' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'manual', label: '其他' },
] as const

export function detectPlatformFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('threads.net') || host.includes('threads.com')) return 'threads'
    if (host.includes('dcard.tw')) return 'dcard'
    if (host.includes('ptt.cc')) return 'ptt'
    if (host.includes('facebook.com') || host.includes('fb.com')) return 'facebook'
    if (host.includes('instagram.com')) return 'instagram'
    if (host.includes('reddit.com')) return 'reddit'
  } catch {
    return null
  }
  return null
}

export function isValidGrowthPostUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
