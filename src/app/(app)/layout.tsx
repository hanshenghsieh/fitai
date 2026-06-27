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
    <div className="min-h-screen min-h-[100dvh] pb-[92px] overscroll-none overflow-x-hidden" style={{ backgroundColor: TODAY.bg }}>
      <AppRouteShell>{children}</AppRouteShell>
      <BottomNav />
    </div>
  )
}
