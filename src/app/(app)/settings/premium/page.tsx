export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import PremiumScreen from '@/components/premium/PremiumScreen'
import { getAccessStatus } from '@/lib/subscription-access'
import { SUBSCRIPTION_ACCESS_FIELDS } from '@/lib/subscription-types'

export default async function PremiumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('user_profiles').select('created_at').eq('id', user.id).single(),
    supabase.from('subscriptions').select(SUBSCRIPTION_ACCESS_FIELDS).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const access = getAccessStatus(profile?.created_at ?? new Date().toISOString(), subscription, {
    userEmail: user.email,
  })

  return (
    <Suspense
      fallback={
        <div className="px-5 app-page-top pb-10 animate-pulse space-y-4">
          <div className="h-8 w-40 rounded-lg bg-white/60" />
          <div className="h-48 rounded-2xl bg-white/60" />
        </div>
      }
    >
      <PremiumScreen access={access} />
    </Suspense>
  )
}
