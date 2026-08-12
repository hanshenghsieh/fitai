/**
 * Shared Sentry event sanitizer, imported by the client/server/edge Sentry
 * configs. Runs on every event right before it leaves the process — this is
 * the last line of defense even if a call site accidentally passes something
 * sensitive through `captureError`'s (already primitives-only) extra context.
 */

/** Key names that must never leave this process, wherever they show up in an event payload. */
const BLOCKED_KEY_PATTERN =
  /email|photo|image|avatar|prompt|ai_response|raw_response|description|content|weight|body_fat|calories|protein_g|carbs_g|fat_g|health_profile|password|token|secret|authorization/i

const MAX_STRING_LENGTH = 300
const REDACTED = '[redacted]'

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 4) return REDACTED
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]` : value
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(v => sanitizeValue(v, depth + 1))
  }
  if (value && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>, depth + 1)
  }
  return value
}

function sanitizeObject(obj: Record<string, unknown>, depth: number): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    out[key] = BLOCKED_KEY_PATTERN.test(key) ? REDACTED : sanitizeValue(value, depth)
  }
  return out
}

/**
 * Sentry's `beforeSend`/`beforeSendTransaction` hook. Strips known
 * health-sensitive and PII fields from request data, extra context, and
 * breadcrumbs — never blocks the event outright, only redacts fields.
 *
 * Deliberately untyped against Sentry's own ErrorEvent/TransactionEvent
 * shapes (which differ from each other and don't structurally satisfy a
 * plain index-signature type) — callers cast through `unknown` at the
 * sentry.*.config.ts init call sites. This function only ever touches the
 * handful of loosely-typed fields common to both event kinds.
 */
export function sanitizeSentryEvent(event: Record<string, unknown>): Record<string, unknown> {
  const next = { ...event } as Record<string, unknown>

  if (next.request && typeof next.request === 'object') {
    next.request = sanitizeObject(next.request as Record<string, unknown>, 0)
  }
  if (next.extra && typeof next.extra === 'object') {
    next.extra = sanitizeObject(next.extra as Record<string, unknown>, 0)
  }
  if (next.contexts && typeof next.contexts === 'object') {
    next.contexts = sanitizeObject(next.contexts as Record<string, unknown>, 0)
  }
  if (Array.isArray(next.breadcrumbs)) {
    next.breadcrumbs = next.breadcrumbs.map(b =>
      b && typeof b === 'object' ? sanitizeObject(b as Record<string, unknown>, 0) : b
    )
  }
  // Never forward an email as the Sentry user identity — internal id only.
  if (next.user && typeof next.user === 'object') {
    const user = { ...(next.user as Record<string, unknown>) }
    delete user.email
    delete user.username
    next.user = user
  }

  return next
}
