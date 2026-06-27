'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Remount page content on tab change and reset scroll so Today UI never bleeds into Week. */
export default function AppRouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('betterbit:route-change', { detail: { pathname } }))
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  return (
    <div key={pathname} className="relative isolate min-h-0 overflow-x-hidden">
      {children}
    </div>
  )
}
