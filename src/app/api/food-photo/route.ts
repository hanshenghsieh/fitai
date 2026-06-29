import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseFoodImage } from '@/lib/claude/client'
import { storesInText } from '@/lib/dice-store-names'
import { createPhotoV2State } from '@/lib/nutrition/search-v2/photo-pipeline'
import { buildPhotoMatchSnapshot } from '@/lib/nutrition/photo-match-snapshot'

export const maxDuration = 60

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024

async function readImageFromRequest(request: NextRequest): Promise<{ imageBase64: string; mimeType: string }> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const image = formData.get('image')
    if (!(image instanceof File)) {
      throw new Error('Missing image')
    }
    if (image.size > MAX_UPLOAD_BYTES) {
      throw new Error('照片太大，請換一張或重拍')
    }
    const buffer = Buffer.from(await image.arrayBuffer())
    return {
      imageBase64: buffer.toString('base64'),
      mimeType: image.type || 'image/jpeg',
    }
  }

  const { imageBase64, mimeType } = await request.json()
  if (!imageBase64) throw new Error('Missing image')
  if (typeof imageBase64 === 'string' && imageBase64.length > MAX_UPLOAD_BYTES * 1.4) {
    throw new Error('照片太大，請換一張或重拍')
  }
  return { imageBase64, mimeType: mimeType || 'image/jpeg' }
}

function labelFromParseItems(items: Array<{ name: string }>): string {
  const names = items.map(item => item.name.trim()).filter(Boolean)
  return names.length > 1 ? names.join(' + ') : names[0] ?? ''
}

function buildMatchSnapshot(label: string, photoId: string) {
  const trimmed = label.trim() || '未知食物'
  try {
    const v2 = createPhotoV2State(trimmed, {
      store: storesInText(trimmed)?.[0],
      photo_id: photoId,
    })
    return buildPhotoMatchSnapshot(v2)
  } catch {
    return buildPhotoMatchSnapshot(
      createPhotoV2State('未知食物', { photo_id: photoId })
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      return NextResponse.json({ error: '拍照辨識尚未設定' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { imageBase64, mimeType } = await readImageFromRequest(request)
    const { data } = await parseFoodImage(imageBase64, mimeType)

    const label = labelFromParseItems(data.items ?? [])
    const photoId = `photo-api-${Date.now()}`
    const photo_v2 = buildMatchSnapshot(label, photoId)

    return NextResponse.json({ success: true, data, photo_v2 })
  } catch (err) {
    console.error('Food photo parse error:', err)
    const message = err instanceof Error ? err.message : '辨識失敗，改用搜尋或常吃？'
    const status = message === 'Missing image' ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
