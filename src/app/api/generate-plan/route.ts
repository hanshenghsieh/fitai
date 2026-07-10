import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { createServiceClient } from '@/lib/supabase/server'
import { format, addMonths } from 'date-fns'
import { generateWeeklyPlanForUser } from '@/lib/generate-weekly-plan'
import { shouldGrantFullAccessPreIap } from '@/lib/ios-payment-gate'
import type { Goal, UserProfile } from '@/types'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(req: NextRequest) {
  try {
    const cronAuth = req.headers.get('authorization')
    const cronUserId = req.headers.get('x-user-id')
    const isCron =
      !!process.env.CRON_SECRET &&
      cronAuth === `Bearer ${process.env.CRON_SECRET}` &&
      !!cronUserId

    let supabase
    let userId: string
    let userEmail: string | null = null

    if (isCron) {
      supabase = await createServiceClient()
      userId = cronUserId!
    } else {
      const auth = await requireApiUser(req)
      if (!auth.ok) return auth.response
      supabase = auth.supabase
      userId = auth.user.id
      userEmail = auth.user.email ?? null
    }

    let profile: UserProfile | null = null
    let goal: Goal | null = null
    let regenReason: string | null = null

    try {
      const body = await req.json()
      if (body.regen_reason) regenReason = String(body.regen_reason)
      if (body.profile && body.goal) {
        const dbProfile = (
          await supabase.from('user_profiles').select('*').eq('id', userId).single()
        ).data
        if (dbProfile) {
          profile = { ...dbProfile, ...body.profile } as UserProfile
        }
        goal = {
          goal_type: body.goal,
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
        } as Goal
      }
    } catch {
      // no body
    }

    const result = await generateWeeklyPlanForUser(supabase, {
      userId,
      userEmail,
      regenReason,
      profile,
      goal,
      iosNativeReview: shouldGrantFullAccessPreIap(req.headers),
    })

    if (!result.ok) {
      return jsonWithCors({ error: result.error, code: result.code }, req, { status: result.status })
    }

    return jsonWithCors({ success: true, data: result.data }, req)
  } catch (err) {
    console.error('Error generating plan:', err)
    return jsonWithCors(
      { error: err instanceof Error ? err.message : 'Failed to generate plan' },
      req,
      { status: 500 }
    )
  }
}
