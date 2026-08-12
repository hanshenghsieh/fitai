import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/api/auth'

export const metadata: Metadata = {
  title: 'Founder Dashboard · BetterBit',
}

/**
 * Admin-only, same gate as /growth (Phase 1 P0-2): server-side isAdminEmail
 * check on every request, redirecting non-admins before any dashboard data
 * is fetched or rendered.
 */
export default async function FounderDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isAdminEmail(user?.email)) {
    redirect('/login')
  }

  return <div className="min-h-dvh bg-background">{children}</div>
}
