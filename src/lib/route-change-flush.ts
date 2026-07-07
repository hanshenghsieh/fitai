/** Flush pending Today check-in writes before client navigation (Capacitor tab switches). */
export function dispatchRouteChangeFlush(pathname: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('betterbit:route-change', { detail: { pathname } }))
}
