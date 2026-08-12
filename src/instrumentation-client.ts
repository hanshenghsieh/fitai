import * as Sentry from '@sentry/nextjs'
import { sanitizeSentryEvent } from '@/lib/observability/redact'
import packageJson from '../package.json'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  release: packageJson.version,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend: (event) =>
    sanitizeSentryEvent(event as unknown as Record<string, unknown>) as unknown as typeof event,
  beforeSendTransaction: (event) =>
    sanitizeSentryEvent(event as unknown as Record<string, unknown>) as unknown as typeof event,
})

// Sentry's browser SDK already installs global handlers for uncaught
// exceptions (window.onerror) and unhandled promise rejections
// (window.onunhandledrejection) as part of Sentry.init() above — no need to
// register them a second time here.

export function onRouterTransitionStart(url: string) {
  Sentry.addBreadcrumb({ category: 'navigation', message: url, level: 'info' })
}
