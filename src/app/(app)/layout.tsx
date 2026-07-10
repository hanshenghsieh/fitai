import BottomNav from '@/components/dashboard/BottomNav'
import AppRouteShell from '@/components/app/AppRouteShell'
import AppAuthGuard from '@/features/auth/AppAuthGuard'
import { BB_V2 } from '@/lib/betterbit-v2'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppAuthGuard>
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
    </AppAuthGuard>
  )
}
