import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_TC } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { colors } from '@/lib/design-system'

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

export const metadata: Metadata = {
  title: '再健一點',
  description: '安靜陪伴你的健康節奏。你不用完美，照常過就好。',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '再健一點' },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#F4F2EE',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansTC.variable} min-h-screen antialiased`}
        style={{
          backgroundColor: colors.bg.canvas,
          fontFamily: 'var(--font-noto-tc), var(--font-inter), system-ui, sans-serif',
        }}
        suppressHydrationWarning
      >
        {children}
        <Toaster theme="light" richColors={false} position="top-center" />
      </body>
    </html>
  )
}
