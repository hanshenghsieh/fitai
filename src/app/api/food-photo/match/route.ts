import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { storesInText } from '@/lib/dice-store-names'
import { createPhotoV2State } from '@/lib/nutrition/search-v2/photo-pipeline'
import { buildPhotoMatchSnapshot } from '@/lib/nutrition/photo-match-snapshot'
import { captureError } from '@/lib/observability/capture-error'
import { classifyPipelineFailure } from '@/lib/observability/photo-outcome'

export const maxDuration = 30

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  let userId: string | null = null
  try {
    const auth = await requireApiUser(request)
    if (!auth.ok) return auth.response
    userId = auth.user.id

    const { label, store, photo_id } = await request.json()
    const trimmed = typeof label === 'string' ? label.trim() : ''
    if (!trimmed) return jsonWithCors({ error: 'Missing label' }, request, { status: 400 })

    const resolvedStore =
      typeof store === 'string' && store.trim() ? store.trim() : storesInText(trimmed)?.[0]

    let v2
    try {
      v2 = createPhotoV2State(trimmed, {
        store: resolvedStore,
        photo_id: typeof photo_id === 'string' ? photo_id : `photo-match-${Date.now()}`,
      })
    } catch {
      v2 = createPhotoV2State('未知食物', {
        photo_id: typeof photo_id === 'string' ? photo_id : `photo-match-${Date.now()}`,
      })
    }

    return jsonWithCors(
      {
        success: true,
        photo_v2: buildPhotoMatchSnapshot(v2),
      },
      request
    )
  } catch (err) {
    console.error('Food photo match error:', err)
    captureError(err, {
      feature: 'manual-nutrition',
      operation: 'match',
      userId,
      extra: { failure_type: classifyPipelineFailure(err) },
    })
    return jsonWithCors(
      { error: err instanceof Error ? err.message : '比對失敗' },
      request,
      { status: 500 }
    )
  }
}
