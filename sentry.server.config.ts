import * as Sentry from '@sentry/nextjs'
import { sanitizeSentryEvent } from '@/lib/observability/redact'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.npm_package_version,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: (event) =>
    sanitizeSentryEvent(event as unknown as Record<string, unknown>) as unknown as typeof event,
  beforeSendTransaction: (event) =>
    sanitizeSentryEvent(event as unknown as Record<string, unknown>) as unknown as typeof event,
})
