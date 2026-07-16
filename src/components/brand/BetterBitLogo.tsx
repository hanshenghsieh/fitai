'use client'

/**
 * BetterBit brand mark — the official leaf-integrated "B" logo.
 * Source asset: /public/brand/betterbit-logo.png (extracted directly from the
 * approved reference design — green gradient B + white-outlined leaf, on a fully
 * transparent background, NO square / plate / app-icon frame). Bundled into the
 * static export so it loads identically in the iOS local-hybrid WKWebView.
 *
 * `size` = rendered height in px; width scales to keep the mark's aspect ratio.
 */
export default function BetterBitLogo({ size = 72, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/betterbit-logo.png"
      alt="BetterBit"
      className={className}
      style={{ display: 'block', height: size, width: 'auto' }}
    />
  )
}
