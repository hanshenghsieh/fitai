'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { UserProfile } from '@/types'
import type { AccessStatus } from '@/lib/subscription-access'
import { parseGeneratePlanError } from '@/lib/api-errors'
import SettingsHeader from './SettingsHeader'
import SettingsAccountSection from './SettingsAccountSection'
import SettingsPremiumTeaser from './SettingsPremiumTeaser'
import SettingsHealthSection from './SettingsHealthSection'
import SettingsNotificationsSection from './SettingsNotificationsSection'
import SettingsPrivacySection from './SettingsPrivacySection'
import SettingsSupportSection from './SettingsSupportSection'
import SettingsAboutSection from './SettingsAboutSection'
import SettingsDeleteAccountSection from './SettingsDeleteAccountSection'

interface Props {
  profile: UserProfile | null
  email: string
  access: AccessStatus
}

export default function SettingsScreen({ profile, email, access }: Props) {
  const [regenLoading, setRegenLoading] = useState(false)
  const router = useRouter()

  async function handleRegenPlan() {
    setRegenLoading(true)
    try {
      const res = await fetch('/api/generate-plan', { method: 'POST' })
      if (!res.ok) {
        toast.error(await parseGeneratePlanError(res))
        return
      }
      toast.message('好，本週重排中')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('網路連線失敗')
    } finally {
      setRegenLoading(false)
    }
  }

  return (
    <div className="pb-12">
      <SettingsHeader />
      <SettingsAccountSection
        profile={profile}
        email={email}
        onRegenPlan={() => void handleRegenPlan()}
        regenLoading={regenLoading}
      />
      <SettingsPremiumTeaser access={access} />
      <SettingsHealthSection />
      <SettingsNotificationsSection />
      <SettingsPrivacySection />
      <SettingsSupportSection />
      <SettingsAboutSection />
      <SettingsDeleteAccountSection />
    </div>
  )
}
