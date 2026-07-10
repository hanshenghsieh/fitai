import { redirect } from 'next/navigation'
import BottomNav from '@/components/dashboard/BottomNav'
import AppRouteShell from '@/components/app/AppRouteShell'
import { BB_V2 } from '@/lib/betterbit-v2'
import { getAppProfile } from '@/lib/supabase/app-session'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getAppProfile()
  if (!user) redirect('/login')
  if (!profile?.onboarding_completed) redirect('/onboarding')

  return (
    <div className="app-shell v2-page-bg" style={{ backgroundColor: BB_V2.bg.canvas }}>
      <main
        id="app-scroll-root"
        aria-label="主要內容"
        className="app-scroll-with-nav overflow-y-auto overflow-x-hidden overscroll-y-none"
        style={{ WebkitOverflowScrolling: 'touch', backgroundColor: 'transparent' }}
      >
        <AppRouteShell>{children}</AppRouteShell>
      </main>
      <BottomNav />
    </div>
  )
}
