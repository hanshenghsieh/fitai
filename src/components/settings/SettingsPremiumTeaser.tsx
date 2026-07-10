'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AccessStatus } from '@/lib/subscription-access'
import SettingsSection from '@/components/settings/SettingsSection'
import SettingsRow from '@/components/settings/SettingsRow'
import {
  shouldBypassSubscriptionPaywallClient,
  shouldShowAppleIapClient,
} from '@/lib/ios-payment-gate'
import { SUBSCRIPTION_PRICE_MONTHLY } from '@/lib/subscription-pricing'

interface Props {
  access: AccessStatus
}

export default function SettingsPremiumTeaser({ access }: Props) {
  const router = useRouter()
  const [isSubscribed, setIsSubscribed] = useState(access.isSubscribed)
  const [bypassPaywall, setBypassPaywall] = useState(shouldBypassSubscriptionPaywallClient())
  const [appleIap, setAppleIap] = useState(shouldShowAppleIapClient())

  useEffect(() => {
    setBypassPaywall(shouldBypassSubscriptionPaywallClient())
    setAppleIap(shouldShowAppleIapClient())
  }, [])

  useEffect(() => {
    if (bypassPaywall || access.isSubscribed) return
    void fetch('/api/get-subscription')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setIsSubscribed(data?.subscription?.status === 'active'))
      .catch(() => {})
  }, [bypassPaywall, access.isSubscribed])

  const description = bypassPaywall
    ? '封測期間開放完整功能。'
    : isSubscribed
      ? 'BetterBit Pro 使用中'
      : appleIap
        ? '透過 App Store 訂閱解鎖完整工具'
        : '解鎖完整外食減脂工具'

  const detail = bypassPaywall
    ? '封測期間開放完整功能'
    : isSubscribed
      ? '你已解鎖完整減脂工具'
      : SUBSCRIPTION_PRICE_MONTHLY

  return (
    <SettingsSection title="會員" description={description}>
      <SettingsRow
        label={
          bypassPaywall
            ? 'BetterBit Pro'
            : isSubscribed
              ? 'BetterBit Pro 使用中'
              : 'BetterBit Pro'
        }
        detail={detail}
        onClick={() => router.push('/settings/premium')}
        last
      />
    </SettingsSection>
  )
}
