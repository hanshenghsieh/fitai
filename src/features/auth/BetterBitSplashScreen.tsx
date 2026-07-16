'use client'

import BetterBitLogo from '@/components/brand/BetterBitLogo'
import { BB_V2 } from '@/lib/betterbit-v2'

/**
 * Splash / Loading / Redirect screen (design image 2).
 * Shown on: app launch, root session check, auth redirect, route loading,
 * onboarding-complete redirect and dashboard auth checking.
 *
 * Only: BetterBit logo + wordmark + "Eat smart. Live better." + faint dots.
 * No CTA / feature cards / calorie card / terms / phone mockup / dark bg.
 */
export default function BetterBitSplashScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="載入中"
      style={{
        minHeight: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        backgroundColor: BB_V2.bg.canvas,
        fontFamily: BB_V2.font,
        paddingTop: 'var(--app-safe-top, 0px)',
        paddingBottom: 'var(--app-safe-bottom, 0px)',
      }}
    >
      <BetterBitLogo size={84} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 26, fontWeight: 700, color: BB_V2.text.deepGreen, letterSpacing: '0.01em', margin: 0 }}>
          BetterBit
        </p>
        <p style={{ fontSize: 14, color: BB_V2.text.secondary, marginTop: 6 }}>Eat smart. Live better.</p>
      </div>
      <div aria-hidden style={{ display: 'flex', gap: 7, marginTop: 6 }}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="animate-pulse"
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: BB_V2.accent.green,
              opacity: 0.35,
              animationDelay: `${i * 180}ms`,
              animationDuration: '1s',
            }}
          />
        ))}
      </div>
    </div>
  )
}
