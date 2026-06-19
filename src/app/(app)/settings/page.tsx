export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { colors } from '@/lib/design-system'
import ZaiJian from '@/components/character/ZaiJian'
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
    <div className="max-w-lg mx-auto min-h-screen" style={{ backgroundColor: colors.bg.canvas }}>
      <div className="px-4 pt-12 pb-6">
        <ZaiJian
          size="md"
          line={{ text: '設定。', expression: 'normal', subtext: user.email ?? '' }}
          layout="bubble"
        />
      </div>
      <SettingsClient profile={profile} goal={goal?.[0] ?? null} />
    </div>
  )
}
