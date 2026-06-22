'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'
import type { AccessStatus } from '@/lib/subscription-access'
import { colors } from '@/lib/design-system'
import { getStripePriceId, SUBSCRIPTION_PRICE_LABEL } from '@/lib/stripe-config'
import { isAppStoreSafeMode } from '@/lib/app-store-safe-mode'
import SettingsSection from './SettingsSection'

interface Props {
  access: AccessStatus
}

export default function SettingsSubscriptionSection({ access }: Props) {
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

  useEffect(() => {
    void loadSubscriptionStatus()
  }, [])

  useEffect(() => {
    if (searchParams.get('subscribed') === '1') toast.message('歡迎回來。我們會繼續照顧你的計畫。')
    if (searchParams.get('canceled') === '1') toast.message('沒關係。試用期內仍可使用。')
  }, [searchParams])

  async function loadSubscriptionStatus() {
    try {
      const res = await fetch('/api/get-subscription')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
      }
    } finally {
      setLoading(false)
    }
  }

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

  const isSubscribed = subscription?.status === 'active'

  if (isAppStoreSafeMode()) return null

  return (
    <SettingsSection title="會員" description="不是付費牆，是持續照顧。">
      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mx-auto" style={{ color: colors.text.tertiary }} />
        ) : isSubscribed ? (
          <>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: colors.accent.sage }} />
              <div>
                <p className="text-[15px] leading-relaxed" style={{ color: colors.text.primary }}>
                  會員進行中。計畫會持續跟上你的變化。
                </p>
                {subscription?.current_period_end && (
                  <p className="text-[13px] mt-1" style={{ color: colors.text.tertiary }}>
                    {subscription.cancel_at_period_end ? '本期結束後停止 · ' : ''}
                    下次結算 {new Date(subscription.current_period_end).toLocaleDateString('zh-TW')}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleBillingPortal}
              disabled={portalLoading}
              className="w-full py-3 rounded-xl text-[14px] font-medium"
              style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
            >
              {portalLoading ? '開啟中…' : '管理會員與帳單'}
            </button>
          </>
        ) : (
          <>
            <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
              {access.isTrial && access.trialDaysLeft > 0
                ? `試用還有 ${access.trialDaysLeft} 天。想繼續，我們會在這裡。`
                : '想繼續被照顧，可以加入會員。'}
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: colors.text.tertiary }}>
              {SUBSCRIPTION_PRICE_LABEL} · 每週計畫會安靜地跟上你。
            </p>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={subscribing || !stripeReady}
              className="w-full py-3 rounded-xl text-[15px] font-medium disabled:opacity-40"
              style={{ backgroundColor: colors.accent.action, color: colors.bg.elevated }}
            >
              {subscribing ? '前往付款…' : stripeReady ? '加入會員' : '會員準備中'}
            </button>
          </>
        )}
      </div>
    </SettingsSection>
  )
}
