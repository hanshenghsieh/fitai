export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { colors } from '@/lib/design-system'
import PremiumScreen from '@/components/premium/PremiumScreen'
import { getAccessStatus } from '@/lib/subscription-access'

export default async function PremiumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('user_profiles').select('created_at').eq('id', user.id).single(),
    supabase.from('subscriptions').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
  ])

  const access = getAccessStatus(profile?.created_at ?? new Date().toISOString(), subscription)

  return (
    <div className="max-w-lg mx-auto" style={{ backgroundColor: colors.bg.canvas }}>
      <Suspense fallback={null}>
        <PremiumScreen access={access} />
      </Suspense>
    </div>
  )
}
