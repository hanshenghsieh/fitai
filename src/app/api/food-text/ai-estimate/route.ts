import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { resolveNutritionWithAiFallback } from '@/lib/nutrition/ai-nutrition-fallback'
import { captureError } from '@/lib/observability/capture-error'

export const maxDuration = 30

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

/**
 * Text-search AI fallback — the same LEVEL 1 (trusted DB) -> LEVEL 2 (AI
 * estimate) orchestration already live on the photo path (see
 * food-photo/match/route.ts), reused here rather than duplicated. Only
 * called by the client after its own lightweight searchFoodMenu() +
 * findP0FoodCandidates() have already missed AND the user made an explicit
 * submit — see TextSearchAiFallbackController.trigger(). LEVEL 1 here uses
 * search-v2's independent matcher (matcher-core.ts), so a query the client's
 * lighter search missed can still resolve as a trusted DB hit with no AI
 * call at all.
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const auth = await requireApiUser(request)
    if (!auth.ok) return auth.response
    userId = auth.user.id

    const { query } = await request.json()
    const trimmed = typeof query === 'string' ? query.trim() : ''
    if (!trimmed) return jsonWithCors({ error: 'Missing query' }, request, { status: 400 })

    const result = await resolveNutritionWithAiFallback(trimmed, {})

    if (result.outcome === 'trusted_db' || result.outcome === 'ai_fallback') {
      return jsonWithCors(
        { success: true, outcome: result.outcome, candidate: result.candidate },
        request
      )
    }

    return jsonWithCors(
      { success: false, reason: result.aiFailure ?? 'unresolved' },
      request
    )
  } catch (err) {
    console.error('Food text AI estimate error:', err)
    captureError(err, { feature: 'manual-nutrition', operation: 'text-ai-estimate', userId })
    return jsonWithCors(
      { error: err instanceof Error ? err.message : '估算失敗' },
      request,
      { status: 500 }
    )
  }
}
