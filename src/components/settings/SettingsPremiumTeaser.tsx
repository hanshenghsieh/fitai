'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AccessStatus } from '@/lib/subscription-access'
import SettingsSection from '@/components/settings/SettingsSection'
import SettingsRow from '@/components/settings/SettingsRow'
import { shouldHideExternalPaymentsClient } from '@/lib/ios-payment-gate'
import { SUBSCRIPTION_PRICE_LABEL } from '@/lib/stripe-config'

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
      description={hidePayments ? '封測期間開放完整功能。' : isSubscribed ? 'BetterBit Pro 使用中' : '解鎖完整外食減脂工具'}
    >
      <SettingsRow
        label={
          hidePayments
            ? 'BetterBit Pro'
            : isSubscribed
              ? 'BetterBit Pro 使用中'
              : 'BetterBit Pro'
        }
        detail={
          hidePayments
            ? '封測期間開放完整功能'
            : isSubscribed
              ? '你已解鎖完整減脂工具'
              : SUBSCRIPTION_PRICE_LABEL
        }
        onClick={() => router.push('/settings/premium')}
        last
      />
    </SettingsSection>
  )
}
