import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_TC } from 'next/font/google'
import './globals.css'
import '@/styles/betterbit-v2.css'
import '@/styles/capacitor-ios-shell.css'
import { Toaster } from '@/components/ui/sonner'
import CapacitorShell from '@/components/capacitor/CapacitorShell'
import AppUpdateGate from '@/components/update/AppUpdateGate'
import OfflineShell from '@/components/capacitor/OfflineShell'
import OfflineMutationSync from '@/components/offline/OfflineMutationSync'
import NativeAuthCallbackListener from '@/components/auth/NativeAuthCallbackListener'
import { colors } from '@/lib/design-system'
import { MARKETING_SITE_URL } from '@/lib/app-url'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/site-metadata'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-tc',
  display: 'swap',
})

const appUrl = MARKETING_SITE_URL

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: appUrl,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: SITE_NAME },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#FFF9F2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var ua=navigator.userAgent||'';if(!/iPhone|iPad|iPod/i.test(ua))return;var isNative=window.location.protocol==='capacitor:'||!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());if(!isNative)return;var h=screen.height;var t=h>=812?47:20;var b=h>=812?34:0;var r=document.documentElement;r.classList.add('capacitor-ios');r.style.setProperty('--app-safe-top',t+'px');r.style.setProperty('--app-safe-bottom',b+'px');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${notoSansTC.variable} h-full antialiased`}
        style={{
          backgroundColor: colors.bg.canvas,
          fontFamily: 'var(--font-noto-tc), var(--font-inter), system-ui, sans-serif',
        }}
        suppressHydrationWarning
      >
        {children}
        <NativeAuthCallbackListener />
        <CapacitorShell />
        <AppUpdateGate />
        <OfflineMutationSync />
        <OfflineShell />
        <Toaster theme="light" richColors={false} position="top-center" />
      </body>
    </html>
  )
}
