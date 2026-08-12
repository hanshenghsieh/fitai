export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { createAdminClient } from '@/lib/supabase/server'
import { isAnalyticsEventName, type AnalyticsEventInput } from '@/lib/analytics/events'
import { recordFirstMealLoggedOnce, trackServer } from '@/lib/analytics/track-server'
import { captureError } from '@/lib/observability/capture-error'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; properties?: unknown; platform?: unknown }
    | null

  if (!isAnalyticsEventName(body?.name)) {
    return jsonWithCors({ error: 'Unknown event name' }, request, { status: 400 })
  }

  const platform = typeof body?.platform === 'string' ? body.platform : undefined
  const admin = createAdminClient()

  try {
    if (body.name === 'first_meal_logged') {
      await recordFirstMealLoggedOnce({ supabase: admin, userId: auth.user.id, platform })
    } else {
      const event = {
        name: body.name,
        properties: (body.properties as Record<string, unknown>) ?? {},
      } as AnalyticsEventInput
      await trackServer(event, { supabase: admin, userId: auth.user.id, platform })
    }
    return jsonWithCors({ received: true }, request)
  } catch (err) {
    captureError(err, {
      feature: 'analytics',
      operation: 'track',
      userId: auth.user.id,
      extra: { event_name: body.name },
    })
    // Analytics failures must never surface as a hard error to the client.
    return jsonWithCors({ received: false }, request)
  }
}
