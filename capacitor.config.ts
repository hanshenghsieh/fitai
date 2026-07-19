import type { CapacitorConfig } from '@capacitor/cli'

/**
 * BetterBit iOS — Build 16 local hybrid (default).
 *
 * Production / TestFlight / Archive:
 *   - webDir: out (from `npm run build:ios-local`)
 *   - NO server.url — App loads bundled HTML/JS/CSS from device
 *   - API via NEXT_PUBLIC_API_BASE_URL baked into the static export
 *
 * Development only (live reload against Next dev server):
 *   CAPACITOR_DEV_SERVER_URL=http://localhost:3000 npx cap sync ios
 *   or legacy: CAP_SERVER_URL=http://localhost:3000
 *
 * Build 15 remote wrapper (emergency rollback only — do NOT use for Build 16):
 *   CAPACITOR_REMOTE_URL=https://betterbit.app npx cap sync ios
 */
const devServerUrl =
  process.env.CAPACITOR_DEV_SERVER_URL?.trim() ||
  process.env.CAP_SERVER_URL?.trim() ||
  process.env.CAPACITOR_REMOTE_URL?.trim() ||
  ''

const config: CapacitorConfig = {
  appId: 'app.fitai.betterbit',
  appName: 'Betterbit',
  webDir: 'out',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    allowsLinkPreview: false,
  },
  plugins: {
    // Native URLSession for window.fetch — bypasses missing CORS on production /api/*
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 300,
      launchAutoHide: true,
      backgroundColor: '#FDFCF8',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#FDFCF8',
      overlaysWebView: true,
    },
    LocalNotifications: {
      // Show deterministic local reminders while the app is in the foreground too.
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
}

if (devServerUrl) {
  config.server = {
    url: devServerUrl,
    cleartext: devServerUrl.startsWith('http://'),
    androidScheme: 'https',
    allowNavigation: [
      'betterbit.app',
      '*.betterbit.app',
      'localhost',
      '127.0.0.1',
      '*.vercel.app',
    ],
  }
} else {
  // Local bundled assets — allow API / auth navigation to remote hosts
  config.server = {
    androidScheme: 'https',
    allowNavigation: [
      'betterbit.app',
      '*.betterbit.app',
      '*.vercel.app',
    ],
  }
}

export default config
