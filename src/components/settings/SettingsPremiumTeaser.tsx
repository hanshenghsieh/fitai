'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AccessStatus } from '@/lib/subscription-access'
import SettingsSection from '@/components/settings/SettingsSection'
import SettingsRow from '@/components/settings/SettingsRow'
import { isAppStoreSafeMode } from '@/lib/app-store-safe-mode'

interface Props {
  access: AccessStatus
}

export default function SettingsPremiumTeaser({ access }: Props) {
  const router = useRouter()
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    void fetch('/api/get-subscription')
      .then(r => r.ok ? r.json() : null)
      .then(data => setIsSubscribed(data?.subscription?.status === 'active'))
      .catch(() => {})
  }, [])

  const safeMode = isAppStoreSafeMode()

  return (
    <SettingsSection
      title="會員"
      description={safeMode ? '即將開放。' : '管理方案與會員功能'}
    >
      <SettingsRow
        label={safeMode ? 'BetterBit Premium' : isSubscribed ? '會員進行中' : 'BetterBit 會員'}
        detail={
          safeMode
            ? '即將開放。'
            : isSubscribed
              ? '管理方案與帳單'
              : '解鎖完整外食減脂工具'
        }
        onClick={() => router.push('/settings/premium')}
        last
      />
    </SettingsSection>
  )
}
