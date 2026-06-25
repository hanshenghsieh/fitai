import type { CapacitorConfig } from '@capacitor/cli'

import { PRODUCTION_APP_URL } from './src/lib/app-url'

/**
 * BetterBit iOS shell — loads production Next.js (Vercel).
 * No static export; full SSR/API preserved on server.
 *
 * Local dev override (Mac):
 *   CAP_SERVER_URL=http://localhost:3000 npx cap sync ios
 */
const serverUrl =
  process.env.CAP_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  PRODUCTION_APP_URL

const config: CapacitorConfig = {
  appId: 'app.fitai.betterbit',
  appName: '再健一點',
  webDir: 'capacitor-www',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    androidScheme: 'https',
    allowNavigation: [
      'betterbit.app',
      '*.betterbit.app',
      'checkout.stripe.com',
      '*.stripe.com',
    ],
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#FFF9F2',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#FFF9F2',
    },
  },
}

export default config
