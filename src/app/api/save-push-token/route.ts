import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiUser(req)
    if (!auth.ok) return auth.response
    const { user, supabase } = auth

    const { token } = await req.json()
    if (!token) {
      return jsonWithCors({ error: 'Missing token' }, req, { status: 400 })
    }

    const { error } = await supabase.from('push_tokens').upsert({
      user_id: user.id,
      token: token,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) throw error

    console.log(`✅ Push token saved for user ${user.id}`)
    return jsonWithCors({ success: true }, req)
  } catch (err) {
    console.error('Error saving push token:', err)
    return jsonWithCors({ error: err instanceof Error ? err.message : 'Failed' }, req, { status: 500 })
  }
}
