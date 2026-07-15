/** Playwright QA only — set via page.addInitScript, never in production UI. */
export function isE2EAuthBypass(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(
    (window as Window & { __BETTERBIT_E2E_BYPASS_AUTH__?: boolean }).__BETTERBIT_E2E_BYPASS_AUTH__
  )
}
