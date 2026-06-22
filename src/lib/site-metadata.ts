import type { Metadata } from 'next'
import { getAppUrl } from '@/lib/app-url'

export const SITE_NAME = '再健一點'
export const SITE_DESCRIPTION =
  '安靜陪伴你的健康節奏。你不用完美，照常過就好。'
export const SITE_TAGLINE = '依你的體態與目標，自動算出該吃多少、動多少。'

export function createPageMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title: string
  description: string
  path: string
  index?: boolean
}): Metadata {
  const url = `${getAppUrl()}${path.startsWith('/') ? path : `/${path}`}`

  return {
    title,
    description,
    alternates: { canonical: path.startsWith('/') ? path : `/${path}` },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'zh_TW',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
  }
}
