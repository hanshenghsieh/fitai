import type { SourceFingerprint, SourceMonitorResult } from './types'

export function hashContent(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  return `h${Math.abs(h).toString(16)}`
}

export function buildSourceFingerprint(input: {
  brand: string
  source_url: string
  official_version?: string | null
  content?: string
  checked_at?: string
}): SourceFingerprint {
  const content = input.content ?? `${input.source_url}|${input.official_version ?? ''}`
  return {
    brand: input.brand,
    source_url: input.source_url,
    official_version: input.official_version ?? null,
    content_hash: hashContent(content),
    last_checked_at: input.checked_at ?? new Date().toISOString(),
  }
}

export function monitorSourceChange(
  previous: SourceFingerprint | null,
  current: SourceFingerprint
): SourceMonitorResult {
  if (!previous) {
    return {
      brand: current.brand,
      source_url: current.source_url,
      changed: false,
      change_type: null,
      previous_hash: null,
      current_hash: current.content_hash,
      requires_pending_review: false,
    }
  }

  let change_type: SourceMonitorResult['change_type'] = null
  if (previous.source_url !== current.source_url) change_type = 'url'
  else if (previous.official_version !== current.official_version) change_type = 'version'
  else if (previous.content_hash !== current.content_hash) {
    change_type = current.source_url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'hash'
  }

  const changed = change_type !== null
  return {
    brand: current.brand,
    source_url: current.source_url,
    changed,
    change_type,
    previous_hash: previous.content_hash,
    current_hash: current.content_hash,
    requires_pending_review: changed,
  }
}

export function monitorAllSources(
  previous: SourceFingerprint[],
  current: SourceFingerprint[]
): SourceMonitorResult[] {
  const prevMap = new Map(previous.map(p => [`${p.brand}::${p.source_url}`, p] as const))
  return current.map(c => monitorSourceChange(prevMap.get(`${c.brand}::${c.source_url}`) ?? null, c))
}
