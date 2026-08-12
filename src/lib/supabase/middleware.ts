import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * DIAGNOSTIC-ONLY CHECKPOINTS (temporary — do not treat as a fix). Leading
 * theory: this middleware calls supabase.auth.getUser() unconditionally for
 * EVERY request including /api/*, using whatever Cookie header the request
 * carries — a real network call to Supabase's Cloudflare-fronted Auth API,
 * running before the route handler's own try/catch. Deliberately NOT
 * skipping this call for /api/* yet (that would be a fix, not a
 * measurement) — instrumented in place so the next physical-device test
 * proves or disproves it directly.
 */
export async function updateSession(request: NextRequest) {
  const requestId = request.headers.get('X-Client-Request-Id')
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  console.log('[WEIGHT_TRACE:1_middleware_getUser_start]', { request_id: requestId, pathname: request.nextUrl.pathname })
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[WEIGHT_TRACE:2_middleware_getUser_completed]', { request_id: requestId, hasUser: !!user })

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isLegalRoute = pathname === '/privacy' || pathname === '/terms' || pathname === '/support'
  const isGrowthRoute = pathname.startsWith('/growth')
  const isApiRoute = pathname.startsWith('/api')
  const isPublicAsset = pathname.startsWith('/_next') || pathname.startsWith('/favicon')

  if (!user && !isAuthRoute && !isLegalRoute && !isGrowthRoute && !isApiRoute && !isPublicAsset && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
