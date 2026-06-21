'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AccessStatus } from '@/lib/subscription-access'
import SettingsSection from '@/components/settings/SettingsSection'
import SettingsRow from '@/components/settings/SettingsRow'

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

  return (
    <SettingsSection title="會員" description="邀請，不是付費牆。">
      <SettingsRow
        label={isSubscribed ? '會員進行中' : 'BetterBit 會員'}
        detail={isSubscribed ? '計畫會持續跟上你' : '這段路，想繼續一起走？'}
        onClick={() => router.push('/settings/premium')}
        last
      />
    </SettingsSection>
  )
}
