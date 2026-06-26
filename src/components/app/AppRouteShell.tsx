'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Remount page content on tab change and reset scroll so Today UI never bleeds into Week. */
export default function AppRouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return <div key={pathname}>{children}</div>
}
