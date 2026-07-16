'use client'

import BetterBitSplashScreen from '@/features/auth/BetterBitSplashScreen'

/**
 * Auth loading shell — now the BetterBit splash (design image 2).
 * Kept as a named module so existing imports (RootRedirectClient, AppAuthGuard)
 * all resolve to the same splash screen.
 */
export default function AppAuthLoadingShell() {
  return <BetterBitSplashScreen />
}
