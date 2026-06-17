import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json()

    if (!email || !password || !displayName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    console.log('Creating user:', email)

    // Create user via admin API
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
    console.log('Signup response:', { status: signupRes.status, body: userData })

    if (!userData.id) {
      const errMsg = userData.message || userData.error_description || JSON.stringify(userData)
      console.error('User creation error:', errMsg)
      throw new Error(errMsg)
    }
    console.log('✅ User created:', userData.id)

    const userId = userData.id

    // Create profile
    console.log('Creating profile...')
    await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: userId,
        display_name: displayName,
      }),
    })

    console.log('Profile created, returning success')
    return NextResponse.json({ userId, email })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Registration failed'
    console.error('Registration error:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
