import {
  APPLE_IAP_ENTITLEMENT_ID,
  APPLE_IAP_PRODUCT_ID,
  isSupportedAppleIapProductId,
  type AppleIapProductId,
} from '@/lib/apple-iap-config'

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1'
const REVENUECAT_TIMEOUT_MS = 10_000

export interface VerifiedRevenueCatSubscription {
  userId: string
  active: boolean
  productId: AppleIapProductId
  purchasedAt: string
  expiresAt: string
  willRenew: boolean
}

export class RevenueCatConfigurationError extends Error {
  constructor() {
    super('RevenueCat server verification is not configured')
    this.name = 'RevenueCatConfigurationError'
  }
}

export class RevenueCatVerificationError extends Error {
  constructor(message = 'RevenueCat verification failed') {
    super(message)
    this.name = 'RevenueCatVerificationError'
  }
}

export function parseAppleIapSyncTrigger(
  payload: unknown
): { isRestore: boolean } | null {
  const record = asRecord(payload)
  if (!record) return null
  if (Object.keys(record).some(key => key !== 'isRestore')) return null
  if (record.isRestore != null && typeof record.isRestore !== 'boolean') {
    return null
  }
  return { isRestore: record.isRestore === true }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function validIso(value: unknown): string | null {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null
  return new Date(value).toISOString()
}

export function parseVerifiedRevenueCatSubscriber(
  userId: string,
  payload: unknown,
  now = new Date()
): VerifiedRevenueCatSubscription {
  const root = asRecord(payload)
  const subscriber = asRecord(root?.subscriber)
  if (!subscriber) throw new RevenueCatVerificationError()

  const entitlements = asRecord(subscriber.entitlements)
  const entitlement = asRecord(entitlements?.[APPLE_IAP_ENTITLEMENT_ID])
  const productId = entitlement?.product_identifier
  const purchasedAt = validIso(entitlement?.purchase_date)
  const expiresAt = validIso(entitlement?.expires_date)
  if (
    !isSupportedAppleIapProductId(productId) ||
    !purchasedAt ||
    !expiresAt
  ) {
    return {
      userId,
      active: false,
      productId: APPLE_IAP_PRODUCT_ID,
      purchasedAt: now.toISOString(),
      expiresAt: now.toISOString(),
      willRenew: false,
    }
  }

  const subscriptions = asRecord(subscriber.subscriptions)
  const productSubscription = asRecord(subscriptions?.[productId])
  const unsubscribeDetectedAt = validIso(productSubscription?.unsubscribe_detected_at)

  return {
    userId,
    active: new Date(expiresAt).getTime() > now.getTime(),
    productId,
    purchasedAt,
    expiresAt,
    willRenew: !unsubscribeDetectedAt,
  }
}

export async function fetchVerifiedRevenueCatSubscription(
  userId: string,
  options?: {
    fetcher?: typeof fetch
    secretApiKey?: string
    now?: Date
  }
): Promise<VerifiedRevenueCatSubscription> {
  const secretApiKey =
    options?.secretApiKey ?? process.env.REVENUECAT_SECRET_API_KEY?.trim()
  if (!secretApiKey) throw new RevenueCatConfigurationError()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REVENUECAT_TIMEOUT_MS)
  try {
    const response = await (options?.fetcher ?? fetch)(
      `${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretApiKey}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      }
    )
    if (!response.ok) {
      throw new RevenueCatVerificationError(
        `RevenueCat verification unavailable (${response.status})`
      )
    }
    return parseVerifiedRevenueCatSubscriber(
      userId,
      await response.json(),
      options?.now
    )
  } catch (error) {
    if (
      error instanceof RevenueCatConfigurationError ||
      error instanceof RevenueCatVerificationError
    ) {
      throw error
    }
    throw new RevenueCatVerificationError()
  } finally {
    clearTimeout(timeout)
  }
}
