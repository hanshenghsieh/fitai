import type { CrawlerResult, RawFoodObservation } from '@/lib/food-kb/types'

export interface FoodCrawler {
  id: string
  name: string
  description: string
  /** Incremental: pass `since` ISO date to fetch only deltas */
  crawl(options?: { since?: string; limit?: number }): Promise<CrawlerResult>
}

export function wrapResult(
  adapter: FoodCrawler,
  observations: RawFoodObservation[],
  errors: string[],
  started: number
): CrawlerResult {
  return {
    adapter: adapter.id,
    source_type: observations[0]?.source_type ?? 'other',
    fetched: observations.length,
    observations,
    errors,
    duration_ms: Date.now() - started,
  }
}
