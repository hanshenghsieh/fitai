import { appRoute } from '@/lib/navigation/routes'

/**
 * Capacitor static export serves /dashboard/ as dashboard/index.html.
 * Clean URLs like /dashboard 404 on the local WebView server.
 *
 * @deprecated Use `appRoute` from `@/lib/navigation/routes` instead.
 */
export function iosLocalPath(path: string): string {
  return appRoute(path)
}
