'use client'

import { isCapacitorNative } from '@/lib/capacitor-native'

/**
 * Opens an external citation link. Mirrors the existing native-vs-web open
 * pattern already shipped for Apple subscription management
 * (openAppleSubscriptionManagement in ProActiveStatusV2View.tsx) so external
 * https:// links behave consistently inside the Capacitor iOS static export.
 */
function openHealthSourceLink(url: string) {
  if (isCapacitorNative()) {
    window.location.href = url
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export default function HealthSourceLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => openHealthSourceLink(href)}
      className="underline underline-offset-2 text-left"
    >
      {children}
    </button>
  )
}
