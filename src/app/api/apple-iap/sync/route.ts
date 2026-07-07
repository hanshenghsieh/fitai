import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { upsertAppleIapSubscription } from '@/lib/apple-iap-store'
import { isAppleIapEnabled } from '@/lib/apple-iap-config'
import { shouldBlockExternalPaymentsOnServer } from '@/lib/ios-payment-gate'

const syncSchema = z.object({
  originalTransactionId: z.string().min(4).max(256),
  productId: z.string().max(128).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  isRestore: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  if (!isAppleIapEnabled()) {
    return NextResponse.json({ error: 'Apple IAP not enabled' }, { status: 503 })
  }

  if (!shouldBlockExternalPaymentsOnServer(req.headers)) {
    return NextResponse.json({ error: 'Apple IAP sync only available on iOS' }, { status: 403 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = syncSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const row = await upsertAppleIapSubscription(supabase, {
      userId: user.id,
      originalTransactionId: parsed.data.originalTransactionId || user.id,
      productId: parsed.data.productId,
      expiresAt: parsed.data.expiresAt,
    })

    return NextResponse.json({
      success: true,
      subscription: {
        status: row.status,
        subscription_source: row.subscription_source,
        current_period_end: row.current_period_end,
      },
      restored: parsed.data.isRestore === true,
    })
  } catch (err) {
    console.error('Apple IAP sync failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
