/** Canonical production origin — single source of truth for API/auth/billing redirects */
export const PRODUCTION_APP_URL = 'https://betterbit.app'

/** Public marketing site domain — used for canonical URLs, sitemap, robots.txt, OG metadata */
export const MARKETING_SITE_URL = 'https://betterbit.tw'

/** Resolve app origin: env → production default → localhost dev */
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'production') return PRODUCTION_APP_URL
  return 'http://localhost:3000'
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getAppUrl()}${normalized}`
}
