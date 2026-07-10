import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { upsertAppleIapSubscription } from '@/lib/apple-iap-store'
import { isAppleIapEnabled } from '@/lib/apple-iap-config'
import { shouldBlockExternalPaymentsOnServer } from '@/lib/ios-payment-gate'

const syncSchema = z.object({
  originalTransactionId: z.string().min(4).max(256),
  productId: z.string().max(128).optional(),
  expiresAt: z
    .string()
    .optional()
    .nullable()
    .refine(v => v == null || v === '' || !Number.isNaN(Date.parse(v)), {
      message: 'Invalid expiresAt',
    }),
  isRestore: z.boolean().optional(),
})

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(req: NextRequest) {
  if (!isAppleIapEnabled()) {
    return jsonWithCors({ error: 'Apple IAP not enabled' }, req, { status: 503 })
  }

  if (!shouldBlockExternalPaymentsOnServer(req.headers)) {
    return jsonWithCors({ error: 'Apple IAP sync only available on iOS' }, req, { status: 403 })
  }

  try {
    const auth = await requireApiUser(req)
    if (!auth.ok) return auth.response
    const { user } = auth

    const parsed = syncSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return jsonWithCors({ error: 'Invalid payload' }, req, { status: 400 })
    }

    const expiresRaw = parsed.data.expiresAt
    const expiresAt =
      expiresRaw == null || expiresRaw === ''
        ? null
        : new Date(expiresRaw).toISOString()

    const row = await upsertAppleIapSubscription(createAdminClient(), {
      userId: user.id,
      originalTransactionId: parsed.data.originalTransactionId || user.id,
      productId: parsed.data.productId,
      expiresAt,
    })

    return jsonWithCors(
      {
        success: true,
        subscription: {
          status: row.status,
          subscription_source: row.subscription_source,
          current_period_end: row.current_period_end,
        },
        restored: parsed.data.isRestore === true,
      },
      req
    )
  } catch (err) {
    console.error('Apple IAP sync failed:', err)
    return jsonWithCors(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      req,
      { status: 500 }
    )
  }
}
