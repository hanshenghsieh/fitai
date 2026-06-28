import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseFoodImage } from '@/lib/claude/client'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      return NextResponse.json({ error: '拍照辨識尚未設定' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { imageBase64, mimeType } = await request.json()
    if (!imageBase64) return NextResponse.json({ error: 'Missing image' }, { status: 400 })

    const { data } = await parseFoodImage(imageBase64, mimeType || 'image/jpeg')

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Food photo parse error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '辨識失敗，改用搜尋或常吃？' },
      { status: 500 }
    )
  }
}
