import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseFoodImage } from '@/lib/claude/client'

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

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Food photo parse error:', err)
    const message = err instanceof Error ? err.message : '辨識失敗，改用搜尋或常吃？'
    const status = message === 'Missing image' ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
