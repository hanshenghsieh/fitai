import type { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/app-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/privacy', '/terms', '/support', '/register', '/login'],
      disallow: [
        '/api/',
        '/dashboard',
        '/onboarding',
        '/weekly',
        '/progress',
        '/settings',
      ],
    },
    sitemap: `${getAppUrl()}/sitemap.xml`,
    host: getAppUrl(),
  }
}
