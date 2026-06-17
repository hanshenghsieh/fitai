import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, token } = await req.json()
    if (!userId || !token) {
      return NextResponse.json({ error: 'Missing userId or token' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from('push_tokens').upsert({
      user_id: userId,
      token: token,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) throw error

    console.log(`✅ Push token saved for user ${userId}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error saving push token:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
