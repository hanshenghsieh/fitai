/**
 * Runs once per server instance at cold start (Next.js instrumentation hook).
 * Used for startup-time deployment validation and observability init —
 * never log secret values here, only whether required config is present.
 */
export async function register() {
  if (!process.env.ADMIN_EMAILS?.trim()) {
    console.error(
      '[startup-check] ADMIN_EMAILS is not set in this environment. ' +
        '/growth and all /api/growth/** routes will deny every user (fail-closed) until it is configured.'
    )
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError: import('next').Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const Sentry = await import('@sentry/nextjs')
  await Sentry.captureRequestError(error, request, context)
}
