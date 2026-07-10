import { NextRequest } from 'next/server'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return jsonWithCors({ error: 'Missing userId' }, req, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return jsonWithCors({ error: 'Service key not configured' }, req, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_confirm: true,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('Confirm email error:', error)
      return jsonWithCors({ error: 'Failed to confirm email' }, req, { status: res.status })
    }

    return jsonWithCors({ success: true }, req)
  } catch (err) {
    console.error('Confirm email error:', err)
    return jsonWithCors(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      req,
      { status: 500 }
    )
  }
}
