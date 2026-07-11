/**
 * Route helper for Capacitor local static export.
 *
 * ios-local builds use `trailingSlash: true`, so the export produces
 * `/dashboard/index.html`. The Next.js client router only matches the
 * trailing-slash form; navigating to `/dashboard` (no slash) falls back to a
 * hard navigation that 404s in the Capacitor WebView. Wrap every in-app
 * navigation target with `appRoute()` so links work in both web and ios-local.
 */

/** True when running inside Capacitor's bundled local WebView. */
function isCapacitorLocalWebView(): boolean {
  if (typeof window === 'undefined') return false
  const origin = window.location.origin
  if (origin === 'https://localhost' || origin === 'http://localhost') return true
  if (origin.startsWith('capacitor://')) return true
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return cap?.isNativePlatform?.() === true
}

function needsTrailingSlash(): boolean {
  if (process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios-local') return true
  return isCapacitorLocalWebView()
}

/** True when running as the Capacitor local static export (needs hard nav). */
export function isLocalHybrid(): boolean {
  return isCapacitorLocalWebView()
}

/** Add a trailing slash to the pathname (preserving query/hash) for ios-local. */
export function appRoute(path: string): string {
  if (!needsTrailingSlash()) return path
  if (!path.startsWith('/')) return path
  if (path === '/') return '/'

  const hashIndex = path.indexOf('#')
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path

  const queryIndex = withoutHash.indexOf('?')
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex) : ''
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash

  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`
  return normalized + search + hash
}

/**
 * Build an explicit `index.html` file URL (legacy hard-navigation helper).
 *
 * Kept for reference/tests. Navigation now uses Next.js client-side routing
 * (see `navigateTo`), which the static export supports via prefetched RSC
 * payloads — this avoids full page reloads and repeated auth/data refetches.
 */
export function toFileUrl(path: string): string {
  const hashIndex = path.indexOf('#')
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path

  const queryIndex = withoutHash.indexOf('?')
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex) : ''
  let pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash

  if (!pathname || pathname === '/') {
    pathname = '/index.html'
  } else {
    pathname = `${pathname.replace(/\/$/, '')}/index.html`
  }
  return pathname + search + hash
}

/**
 * Navigate to an in-app route using Next.js client-side routing when a router
 * callback is provided (SPA transition — no full page reload). Falls back to a
 * hard navigation only when no router callback is available.
 */
export function navigateTo(path: string, fallback?: (target: string) => void): void {
  if (typeof window === 'undefined') return
  const target = appRoute(path)
  if (fallback) {
    fallback(target)
    return
  }
  window.location.assign(target)
}

/**
 * Normalize a pathname for comparison. Strips a trailing `/index.html` (used by
 * the Capacitor hard-nav file URLs) and any trailing slash, keeping "/" as-is.
 */
export function normalizePath(pathname: string): string {
  if (!pathname) return '/'
  let p = pathname
  if (p.endsWith('/index.html')) {
    p = p.slice(0, -'/index.html'.length) || '/'
  } else if (p === '/index.html') {
    p = '/'
  }
  if (p !== '/' && p.endsWith('/')) {
    p = p.slice(0, -1)
  }
  return p || '/'
}

export const APP_ROUTES = {
  home: '/',
  get today() { return appRoute('/dashboard') },
  get record() { return appRoute('/weekly') },
  get analysis() { return appRoute('/progress') },
  get settings() { return appRoute('/settings') },
  get login() { return appRoute('/login') },
  get onboarding() { return appRoute('/onboarding') },
  get register() { return appRoute('/register') },
} as const
