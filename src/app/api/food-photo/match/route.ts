import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { storesInText } from '@/lib/dice-store-names'
import { createPhotoV2State } from '@/lib/nutrition/search-v2/photo-pipeline'
import { buildPhotoMatchSnapshot } from '@/lib/nutrition/photo-match-snapshot'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { label, store, photo_id } = await request.json()
    const trimmed = typeof label === 'string' ? label.trim() : ''
    if (!trimmed) return NextResponse.json({ error: 'Missing label' }, { status: 400 })

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

    return NextResponse.json({
      success: true,
      photo_v2: buildPhotoMatchSnapshot(v2),
    })
  } catch (err) {
    console.error('Food photo match error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '比對失敗' },
      { status: 500 }
    )
  }
}
