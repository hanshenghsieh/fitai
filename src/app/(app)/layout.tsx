import { redirect } from 'next/navigation'
import BottomNav from '@/components/dashboard/BottomNav'
import AppRouteShell from '@/components/app/AppRouteShell'
import { TODAY } from '@/lib/today-design'
import { getAppProfile } from '@/lib/supabase/app-session'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getAppProfile()
  if (!user) redirect('/login')
  if (!profile?.onboarding_completed) redirect('/onboarding')

  return (
    <div className="app-shell" style={{ backgroundColor: TODAY.bg }}>
      <main
        id="app-scroll-root"
        className="app-scroll-with-nav overflow-y-auto overflow-x-hidden overscroll-y-none"
        style={{ WebkitOverflowScrolling: 'touch', backgroundColor: TODAY.bg }}
      >
        <AppRouteShell>{children}</AppRouteShell>
      </main>
      <BottomNav />
    </div>
  )
}
