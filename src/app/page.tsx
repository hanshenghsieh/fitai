import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/site-metadata'
import MarketingHome from '@/components/marketing/MarketingHome'
import RootRedirectClient from '@/features/auth/RootRedirectClient'

export const metadata: Metadata = createPageMetadata({
  title: '外食減脂，不用自己算 | BetterBit',
  description: '拍下每一餐，BetterBit 幫你估算熱量與營養，並告訴你今天接下來怎麼吃。',
  path: '/',
})

// The iOS app bundles this exact route as its offline entry point (see
// capacitor.config.ts webDir: 'out', no server.url). It must keep showing the
// session-aware onboarding flow — only the web deployment gets the public
// marketing homepage.
const isIosLocalBuild = process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios-local'

export default function HomePage() {
  if (isIosLocalBuild) {
    return <RootRedirectClient />
  }

  return <MarketingHome />
}
