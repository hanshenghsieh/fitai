import { NextRequest } from 'next/server'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { createAdminClient } from '@/lib/supabase/server'
import { trackServer } from '@/lib/analytics/track-server'
import { captureError } from '@/lib/observability/capture-error'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json()

    if (!email || !password || !displayName) {
      return jsonWithCors({ error: 'Missing fields' }, req, { status: 400 })
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return jsonWithCors({ error: 'Server configuration error' }, req, { status: 500 })
    }

    console.log('Registration started')

    const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      }),
    })

    const userData = await signupRes.json()
    console.log('Signup response status:', signupRes.status)

    if (!userData.id) {
      const errMsg = userData.message || userData.error_description || JSON.stringify(userData)
      console.error('User creation error:', errMsg)
      throw new Error(errMsg)
    }
    console.log('✅ User created:', userData.id)

    const userId = userData.id

    console.log('Creating profile...')
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?on_conflict=id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: userId,
        display_name: displayName,
      }),
    })
    if (!profileRes.ok) {
      const profileError = await profileRes.text()
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
      })
      throw new Error(profileError || 'Profile bootstrap failed')
    }

    console.log('Profile created, returning success')

    try {
      const admin = createAdminClient()
      await trackServer(
        { name: 'account_created', properties: { auth_method: 'email', platform: 'unknown' } },
        { supabase: admin, userId }
      )
      // Trial starts immediately at profile creation (getAccessStatus derives
      // isTrial from user_profiles.created_at, no separate start action exists),
      // so this fires at the same single-fire point as account_created above.
      await trackServer({ name: 'trial_started', properties: {} }, { supabase: admin, userId })
    } catch (trackErr) {
      captureError(trackErr, { feature: 'analytics', operation: 'track', userId })
    }

    return jsonWithCors({ userId, email }, req)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Registration failed'
    console.error('Registration error:', msg)
    return jsonWithCors({ error: msg }, req, { status: 400 })
  }
}
