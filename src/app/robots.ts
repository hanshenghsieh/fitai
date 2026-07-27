import type { MetadataRoute } from 'next'
import { MARKETING_SITE_URL } from '@/lib/app-url'

export const dynamic = 'force-static'

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
    sitemap: `${MARKETING_SITE_URL}/sitemap.xml`,
    host: MARKETING_SITE_URL,
  }
}
