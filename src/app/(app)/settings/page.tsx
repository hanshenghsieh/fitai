export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: goal }] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    supabase.from('goals').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
  ])

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-4 pt-12 pb-6 text-white">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-emerald-100 text-sm mt-1">{user.email}</p>
      </div>
      <SettingsClient profile={profile} goal={goal?.[0] ?? null} />
    </div>
  )
}
