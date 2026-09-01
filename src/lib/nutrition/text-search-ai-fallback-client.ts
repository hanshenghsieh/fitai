'use client'

import { apiFetch } from '@/lib/api/client'
import type { AiFallbackResolution, AiFallbackResolver } from '@/lib/nutrition/text-search-ai-fallback-controller'
import type { SearchV2Candidate } from '@/lib/nutrition/search-v2/types'

interface AiEstimateApiResponse {
  success: boolean
  outcome?: 'trusted_db' | 'ai_fallback'
  candidate?: SearchV2Candidate
  reason?: string
  error?: string
}

/**
 * The AiFallbackResolver implementation TodayFoodMore wires into
 * TextSearchAiFallbackController — POSTs to /api/food-text/ai-estimate,
 * which runs the same resolveNutritionWithAiFallback orchestrator already
 * live on the photo path. Kept as a thin adapter (not the controller itself)
 * so the cost/cancellation state machine stays testable without a network.
 */
export const fetchTextAiEstimate: AiFallbackResolver = async (
  query: string,
  signal: AbortSignal
): Promise<AiFallbackResolution> => {
  let res: Response
  try {
    res = await apiFetch('/api/food-text/ai-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err
    return { success: false, reason: 'network_error' }
  }

  if (!res.ok) return { success: false, reason: 'api_error' }

  let data: AiEstimateApiResponse
  try {
    data = await res.json()
  } catch {
    return { success: false, reason: 'schema_invalid' }
  }

  if (data.success && data.outcome && data.candidate) {
    return { success: true, outcome: data.outcome, candidate: data.candidate }
  }
  return { success: false, reason: data.reason ?? 'unresolved' }
}
