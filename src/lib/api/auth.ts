import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { errorJsonWithCors } from '@/lib/api/cors'

export function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('Authorization')?.trim()
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token || null
}

export function createSupabaseForAccessToken(accessToken: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

export type ApiAuthSuccess = {
  ok: true
  user: User
  supabase: SupabaseClient
  accessToken: string
}

export type ApiAuthFailure = {
  ok: false
  response: NextResponse
}

export async function requireApiUser(request: NextRequest): Promise<ApiAuthSuccess | ApiAuthFailure> {
  const accessToken = extractBearerToken(request)
  if (!accessToken) {
    return {
      ok: false,
      response: errorJsonWithCors(request, 'Missing Authorization Bearer token', 401),
    }
  }

  const supabase = createSupabaseForAccessToken(accessToken)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken)

  if (error || !user) {
    return {
      ok: false,
      response: errorJsonWithCors(request, 'Unauthorized', 401),
    }
  }

  return { ok: true, user, supabase, accessToken }
}
