import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/dashboard/BottomNav'
import TrialBanner from '@/components/subscription/TrialBanner'
import { getAccessStatus } from '@/lib/subscription-access'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('user_profiles').select('onboarding_completed, created_at').eq('id', user.id).single(),
    supabase.from('subscriptions').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
  ])

  if (!profile?.onboarding_completed) redirect('/onboarding')

  const access = getAccessStatus(profile.created_at, subscription)

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F7F3EC' }}>
      <TrialBanner access={access} />
      {children}
      <BottomNav />
    </div>
  )
}
