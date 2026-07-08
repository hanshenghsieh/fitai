'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { AccessStatus } from '@/lib/subscription-access'
import { colors } from '@/lib/design-system'
import { shouldHideExternalPaymentsClient, shouldShowAppleIapClient } from '@/lib/ios-payment-gate'
import { getStripePriceId, SUBSCRIPTION_PRICE_LABEL } from '@/lib/stripe-config'
import {
  PREMIUM_BODY,
  PREMIUM_FEATURES,
  PREMIUM_MANAGE_FOOTNOTE,
  PREMIUM_MANAGE_FOOTNOTE_WEB,
  PREMIUM_SUBTITLE_SUBSCRIBED,
  premiumPosture,
  premiumTrialWhisper,
} from '@/lib/premium-narrative'
import { isCapacitorNative } from '@/lib/capacitor-native'
import LegalLinksRow from '@/components/legal/LegalLinksRow'
import PremiumTestFlightScreen from '@/components/premium/PremiumTestFlightScreen'
import AppleIapSubscriptionSection from '@/components/settings/AppleIapSubscriptionSection'
import SettingsSubpageHeader from '@/components/settings/SettingsSubpageHeader'

interface Props {
  access: AccessStatus
}

function PremiumFeatureList() {
  return (
    <ul className="space-y-2.5">
      {PREMIUM_FEATURES.map(feature => (
        <li key={feature} className="text-[15px] leading-relaxed flex gap-2" style={{ color: colors.text.secondary }}>
          <span style={{ color: colors.accent.sage }}>✓</span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PremiumScreen({ access }: Props) {
  const [hidePayments, setHidePayments] = useState(shouldHideExternalPaymentsClient())
  const [showAppleIap, setShowAppleIap] = useState(shouldShowAppleIapClient())

  useEffect(() => {
    setHidePayments(shouldHideExternalPaymentsClient())
    setShowAppleIap(shouldShowAppleIapClient())
  }, [])

  if (showAppleIap) {
    return <AppleIapSubscriptionSection access={access} />
  }

  if (hidePayments) {
    return <PremiumTestFlightScreen />
  }

  return <PremiumStripeScreen access={access} />
}

function PremiumStripeScreen({ access }: Props) {
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<{
    status: string
    current_period_end?: string
    cancel_at_period_end?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const priceId = getStripePriceId()
  const stripeReady = !!priceId
  const isSubscribed = subscription?.status === 'active'
  const manageFootnote = isCapacitorNative() ? PREMIUM_MANAGE_FOOTNOTE : PREMIUM_MANAGE_FOOTNOTE_WEB

  useEffect(() => {
    void fetch('/api/get-subscription')
      .then(r => r.ok ? r.json() : null)
      .then(data => setSubscription(data?.subscription ?? null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (searchParams.get('subscribed') === '1') toast.message('訂閱成功，會員功能已啟用。')
    if (searchParams.get('canceled') === '1') toast.message('尚未完成付款。')
  }, [searchParams])

  async function handleSubscribe() {
    if (!stripeReady) {
      toast.error('會員功能準備中')
      return
    }
    setSubscribing(true)
    try {
      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (data.url) window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '無法完成')
    } finally {
      setSubscribing(false)
    }
  }

  async function handleBillingPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (data.url) window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '無法開啟')
    } finally {
      setPortalLoading(false)
    }
  }

  const trialWhisper = premiumTrialWhisper(access)

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: colors.bg.canvas }}>
      <SettingsSubpageHeader
        title="BetterBit Pro"
        subtitle={premiumPosture(access, isSubscribed)}
      />
      {(isSubscribed || trialWhisper) && (
        <div className="px-5 -mt-2 pb-4">
          {isSubscribed && (
            <p className="text-[14px] leading-relaxed" style={{ color: colors.text.secondary }}>
              {PREMIUM_SUBTITLE_SUBSCRIBED}
            </p>
          )}
          {trialWhisper && !isSubscribed && (
            <p className="text-[14px] leading-relaxed" style={{ color: colors.text.tertiary }}>
              {trialWhisper}
            </p>
          )}
        </div>
      )}

      <div className="px-5 space-y-8">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mx-auto" style={{ color: colors.text.tertiary }} />
        ) : isSubscribed ? (
          <div className="space-y-6">
            <PremiumFeatureList />
            <p className="text-[16px] font-medium" style={{ color: colors.text.primary }}>
              {SUBSCRIPTION_PRICE_LABEL}
            </p>
            {subscription?.current_period_end && (
              <p className="text-[13px]" style={{ color: colors.text.tertiary }}>
                {subscription.cancel_at_period_end ? '本期結束後停止 · ' : ''}
                下次結算 {new Date(subscription.current_period_end).toLocaleDateString('zh-TW')}
              </p>
            )}
            <button
              type="button"
              onClick={handleBillingPortal}
              disabled={portalLoading}
              className="w-full py-3 rounded-xl text-[15px] font-medium"
              style={{ backgroundColor: colors.bg.muted, color: colors.text.primary }}
            >
              {portalLoading ? '開啟中…' : '管理訂閱'}
            </button>
            <p className="text-[12px] leading-relaxed" style={{ color: colors.text.tertiary }}>
              {manageFootnote}
            </p>
            <LegalLinksRow />
            <Link href="/dashboard" className="block text-[14px]" style={{ color: colors.text.tertiary }}>
              回到 Today
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
              {PREMIUM_BODY}
            </p>
            <PremiumFeatureList />
            <p className="text-[16px] font-medium" style={{ color: colors.text.primary }}>
              {SUBSCRIPTION_PRICE_LABEL}
            </p>

            <div className="pt-2 space-y-4">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={subscribing || !stripeReady}
                className="text-[15px] font-medium disabled:opacity-40"
                style={{ color: colors.accent.action }}
              >
                {subscribing ? '前往付款…' : stripeReady ? '立即升級' : '會員準備中'}
              </button>
              <LegalLinksRow />
              <Link href="/dashboard" className="block text-[14px]" style={{ color: colors.text.tertiary }}>
                回到 Today
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
