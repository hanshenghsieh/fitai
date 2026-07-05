import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { format, addMonths } from 'date-fns'
import { generateWeeklyPlanForUser } from '@/lib/generate-weekly-plan'
import type { Goal, UserProfile } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const cronAuth = req.headers.get('authorization')
    const cronUserId = req.headers.get('x-user-id')
    const isCron =
      !!process.env.CRON_SECRET &&
      cronAuth === `Bearer ${process.env.CRON_SECRET}` &&
      !!cronUserId

    const supabase = isCron ? await createServiceClient() : await createClient()

    let userId: string
    let userEmail: string | null = null
    if (isCron) {
      userId = cronUserId!
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
      }
      userId = user.id
      userEmail = user.email ?? null
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
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (err) {
    console.error('Error generating plan:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate plan' },
      { status: 500 }
    )
  }
}
