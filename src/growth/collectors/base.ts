import type {
  CollectorFetchParams,
  CollectorRunMeta,
  CollectorRunResult,
  CollectorSearchParams,
  CollectorStatus,
  GrowthCollector,
} from '@/growth/collectors/types'

export function unavailableResult(
  collector: Pick<GrowthCollector, 'platform' | 'capability' | 'dataSource'>,
  message: string,
  error?: string
): CollectorRunResult {
  const meta: CollectorRunMeta = {
    capability: collector.capability,
    dataSource: collector.dataSource,
    configured: false,
    message,
    error,
  }
  return { platform: collector.platform, posts: [], meta }
}

export function successResult(
  collector: Pick<GrowthCollector, 'platform' | 'capability' | 'dataSource'>,
  posts: CollectorRunResult['posts'],
  message: string,
  configured = true
): CollectorRunResult {
  return {
    platform: collector.platform,
    posts,
    meta: {
      capability: collector.capability,
      dataSource: collector.dataSource,
      configured,
      message,
    },
  }
}

export function notConfiguredSearch(
  collector: GrowthCollector,
  requirements: string[]
): CollectorRunResult {
  return unavailableResult(
    collector,
    `「${collector.label}」尚無法自動搜尋。${requirements.join(' ')}`
  )
}

export function notConfiguredFetch(
  collector: GrowthCollector,
  requirements: string[]
): CollectorRunResult {
  return unavailableResult(
    collector,
    `「${collector.label}」尚無法由此 URL 自動擷取。${requirements.join(' ')}`
  )
}

export async function safeCollectorCall(
  collector: GrowthCollector,
  mode: 'search' | 'fetch',
  fn: () => Promise<CollectorRunResult>
): Promise<CollectorRunResult> {
  try {
    return await fn()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Collector failed'
    return unavailableResult(
      collector,
      mode === 'search'
        ? `「${collector.label}」搜尋失敗`
        : `「${collector.label}」擷取失敗`,
      message
    )
  }
}

export function buildStatus(
  collector: Pick<GrowthCollector, 'platform' | 'label' | 'capability' | 'dataSource'>,
  configured: boolean,
  summary: string,
  requirements: string[],
  limitations: string[]
): CollectorStatus {
  return {
    platform: collector.platform,
    label: collector.label,
    capability: collector.capability,
    dataSource: collector.dataSource,
    configured,
    summary,
    requirements,
    limitations,
  }
}

export type { CollectorFetchParams, CollectorSearchParams }
