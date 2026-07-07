'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { generateWeeklyPlanForUser } from '@/lib/generate-weekly-plan'
import { messageForGeneratePlanError } from '@/lib/generate-plan-errors'
import { shouldGrantFullAccessPreIap } from '@/lib/ios-payment-gate'

export async function generatePlanAction(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: messageForGeneratePlanError({ code: 'UNAUTHORIZED' }) }
  }

  try {
    const headerList = await headers()
    const result = await generateWeeklyPlanForUser(supabase, {
      userId: user.id,
      userEmail: user.email,
      iosNativeReview: shouldGrantFullAccessPreIap({
        get: name => headerList.get(name),
      }),
    })

    if (!result.ok) {
      return {
        ok: false,
        error: messageForGeneratePlanError({ error: result.error, code: result.code }),
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/weekly')
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: messageForGeneratePlanError({
        error: err instanceof Error ? err.message : undefined,
      }),
    }
  }
}
