'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AccessStatus } from '@/lib/subscription-access'
import SettingsSection from '@/components/settings/SettingsSection'
import SettingsRow from '@/components/settings/SettingsRow'
import { shouldHideExternalPaymentsClient } from '@/lib/ios-payment-gate'

interface Props {
  access: AccessStatus
}

export default function SettingsPremiumTeaser({ access }: Props) {
  const router = useRouter()
  const [isSubscribed, setIsSubscribed] = useState(access.isSubscribed)
  const [hidePayments, setHidePayments] = useState(shouldHideExternalPaymentsClient())

  useEffect(() => {
    setHidePayments(shouldHideExternalPaymentsClient())
  }, [])

  useEffect(() => {
    if (hidePayments || access.isSubscribed) return
    void fetch('/api/get-subscription')
      .then(r => r.ok ? r.json() : null)
      .then(data => setIsSubscribed(data?.subscription?.status === 'active'))
      .catch(() => {})
  }, [hidePayments, access.isSubscribed])

  return (
    <SettingsSection
      title="會員"
      description={hidePayments ? '封測期間開放完整功能。' : '管理方案與會員功能'}
    >
      <SettingsRow
        label={
          hidePayments
            ? 'BetterBit 會員'
            : isSubscribed
              ? '會員進行中'
              : 'BetterBit 會員'
        }
        detail={
          hidePayments
            ? '封測期間開放完整功能'
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
