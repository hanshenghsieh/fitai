import { timingSafeEqual } from 'node:crypto'

export const REVENUECAT_LIFECYCLE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'CANCELLATION',
  'UNCANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'REFUND_REVERSED',
  'TRANSFER',
  'TEMPORARY_ENTITLEMENT_GRANT',
])

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

export function isRevenueCatWebhookAuthorized(
  provided: string | null,
  expected = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION?.trim()
): boolean {
  return !!provided && !!expected && safeEqual(provided, expected)
}

export function parseRevenueCatWebhookTrigger(payload: unknown): {
  eventType: string
  userIds: string[]
  supported: boolean
} | null {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }
  const event = (payload as Record<string, unknown>).event
  if (event == null || typeof event !== 'object' || Array.isArray(event)) {
    return null
  }
  const record = event as Record<string, unknown>
  if (typeof record.type !== 'string') return null

  const transferredFrom = Array.isArray(record.transferred_from)
    ? record.transferred_from.filter(
        (value): value is string =>
          typeof value === 'string' && UUID_PATTERN.test(value)
      )
    : []
  const transferredTo = Array.isArray(record.transferred_to)
    ? record.transferred_to.filter(
        (value): value is string =>
          typeof value === 'string' && UUID_PATTERN.test(value)
      )
    : []
  if (
    record.type === 'TRANSFER' &&
    (transferredFrom.length === 0 || transferredTo.length === 0)
  ) {
    return null
  }

  const candidates = [
    record.app_user_id,
    ...transferredFrom,
    ...transferredTo,
  ]
  const userIds = [
    ...new Set(
      candidates.filter(
        (value): value is string =>
          typeof value === 'string' && UUID_PATTERN.test(value)
      )
    ),
  ]
  return {
    eventType: record.type,
    userIds,
    supported: REVENUECAT_LIFECYCLE_EVENTS.has(record.type),
  }
}
