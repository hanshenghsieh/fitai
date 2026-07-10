import RootRedirectClient from '@/features/auth/RootRedirectClient'
import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = createPageMetadata({
  title: '照著做就好',
  description: '依你的體重、體脂與目標，自動算出熱量缺口、蛋白質與運動量，設計每日三餐與課表。',
  path: '/',
})

export default function HomePage() {
  return <RootRedirectClient />
}
