import * as Sentry from '@sentry/nextjs'

/**
 * Canonical list of server error-tracking surfaces (Phase 2 TASK 1). Keep in
 * sync with the routes actually wired to captureError — see
 * capture-error.test.ts for the coverage lock.
 */
export const ERROR_CAPTURE_FEATURES = [
  'food-photo',
  'manual-nutrition',
  'checkin-save',
  'subscription-verification',
  'revenuecat-webhook',
  'stripe-webhook',
  'inbody-parse',
  'client-boundary',
  'analytics',
  'settings-body',
] as const

export type ErrorCaptureFeature = (typeof ERROR_CAPTURE_FEATURES)[number]

export type ErrorCapturePlatform = 'ios' | 'web' | 'unknown'

/**
 * Extra context is intentionally primitive-only (no nested objects/arrays).
 * This is a type-level guardrail, not just convention: a caller cannot
 * accidentally attach a full AI response, a photo data URL, or a raw meal
 * description object here even if they wanted to — they'd have to flatten it
 * into a scalar first, which is the point at which they should stop and not.
 * sanitizeSentryEvent (redact.ts) is the second, runtime layer of defense.
 */
export type ErrorCaptureExtra = Record<string, string | number | boolean | null | undefined>

export interface ErrorCaptureContext {
  feature: ErrorCaptureFeature
  /** What the code was trying to do, e.g. 'parse', 'save', 'verify', 'match'. */
  operation: string
  /** Internal UUID only — never an email or other PII. */
  userId?: string | null
  platform?: ErrorCapturePlatform
  extra?: ErrorCaptureExtra
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : 'Unknown error')
}

/**
 * Canonical entry point for reporting a server/API error to Sentry with
 * consistent, sanitized context. Use this instead of calling
 * Sentry.captureException directly from route handlers, so every capture
 * site carries the same shape (feature/operation/user/platform) and goes
 * through the same primitive-only extra-context guardrail.
 */
export function captureError(error: unknown, context: ErrorCaptureContext): void {
  const err = toError(error)
  Sentry.captureException(err, {
    tags: {
      feature: context.feature,
      operation: context.operation,
      platform: context.platform ?? 'unknown',
      error_type: err.name || 'Error',
    },
    extra: context.extra,
    user: context.userId ? { id: context.userId } : undefined,
  })
}
