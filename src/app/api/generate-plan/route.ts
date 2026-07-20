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
  const endpoint = '/api/generate-plan'
  let diagnosticUserId: string | undefined
  let diagnosticProvider = 'unknown'
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
    let provider = isCron ? 'cron' : 'unknown'
    let timeZone: string | null = null

    if (isCron) {
      supabase = await createServiceClient()
      userId = cronUserId!
    } else {
      const auth = await requireApiUser(req)
      if (!auth.ok) {
        console.warn('[PLAN_GENERATION]', {
          endpoint,
          status: auth.response.status,
          errorCode: 'UNAUTHORIZED',
          message: 'Bearer authentication failed',
          validationFields: ['authorization'],
        })
        return auth.response
      }
      supabase = auth.supabase
      userId = auth.user.id
      userEmail = auth.user.email ?? null
      provider =
        (auth.user.app_metadata?.provider as string | undefined) ??
        auth.user.identities?.[0]?.provider ??
        'unknown'
    }
    diagnosticUserId = userId
    diagnosticProvider = provider

    let profile: UserProfile | null = null
    let goal: Goal | null = null
    let regenReason: string | null = null

    try {
      const body = await req.json()
      if (body.regen_reason) regenReason = String(body.regen_reason)
      if (typeof body.timezone === 'string') timeZone = body.timezone
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
      timeZone,
      iosNativeReview: shouldGrantFullAccessPreIap(req.headers),
    })

    if (!result.ok) {
      console.error('[PLAN_GENERATION]', {
        userId,
        provider,
        endpoint,
        status: result.status,
        errorCode: result.code,
        message: result.error,
        validationFields: result.validationFields ?? [],
      })
      return jsonWithCors(
        {
          error: result.error,
          code: result.code,
          validation_fields: result.validationFields ?? [],
        },
        req,
        { status: result.status }
      )
    }

    console.info('[PLAN_GENERATION]', {
      userId,
      provider,
      endpoint,
      status: 200,
      weekStart: result.weekStart,
    })
    const responsePayload = {
      success: true,
      data: result.data,
      week_start: result.weekStart,
    }
    console.info('[PLAN_GENERATION_RESPONSE_JSON]', responsePayload)
    return jsonWithCors(responsePayload, req)
  } catch (err) {
    console.error('[PLAN_GENERATION]', {
      userId: diagnosticUserId,
      provider: diagnosticProvider,
      endpoint,
      status: 500,
      errorCode: 'UNKNOWN',
      message: err instanceof Error ? err.message : 'Failed to generate plan',
      validationFields: [],
    })
    return jsonWithCors(
      { error: err instanceof Error ? err.message : 'Failed to generate plan' },
      req,
      { status: 500 }
    )
  }
}
