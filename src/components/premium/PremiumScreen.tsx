'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, Loader2 } from 'lucide-react'
import type { AccessStatus } from '@/lib/subscription-access'
import { colors } from '@/lib/design-system'
import { getStripePriceId } from '@/lib/stripe-config'
import {
  PREMIUM_STORY,
  premiumPosture,
  premiumPriceLine,
  premiumTrialWhisper,
} from '@/lib/premium-narrative'

interface Props {
  access: AccessStatus
}

export default function PremiumScreen({ access }: Props) {
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

  useEffect(() => {
    void fetch('/api/get-subscription')
      .then(r => r.ok ? r.json() : null)
      .then(data => setSubscription(data?.subscription ?? null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (searchParams.get('subscribed') === '1') toast.message('歡迎回來。我們會繼續照顧你的計畫。')
    if (searchParams.get('canceled') === '1') toast.message('沒關係。你隨時可以再來。')
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
      <div className="px-5 pt-12 pb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-[14px] mb-6"
          style={{ color: colors.text.tertiary }}
        >
          <ChevronLeft className="h-4 w-4" />
          設定
        </Link>

        <h1 className="text-[22px] font-medium tracking-tight" style={{ color: colors.text.primary }}>
          BetterBit 會員
        </h1>
        <p className="text-[15px] mt-3 leading-relaxed" style={{ color: colors.text.secondary }}>
          {premiumPosture(access, isSubscribed)}
        </p>
        {trialWhisper && !isSubscribed && (
          <p className="text-[14px] mt-2 leading-relaxed" style={{ color: colors.text.tertiary }}>
            {trialWhisper}
          </p>
        )}
      </div>

      <div className="px-5 space-y-8">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin mx-auto" style={{ color: colors.text.tertiary }} />
        ) : isSubscribed ? (
          <div className="space-y-6">
            <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
              謝謝你願意繼續。我們會安靜地跟上你的變化，你不用重來。
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
              className="text-[14px] font-medium"
              style={{ color: colors.accent.action }}
            >
              {portalLoading ? '開啟中…' : '管理帳單'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {PREMIUM_STORY.map(line => (
                <p key={line} className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
                  {line}
                </p>
              ))}
            </div>

            <p className="text-[14px] leading-relaxed" style={{ color: colors.text.tertiary }}>
              {premiumPriceLine()}
            </p>

            <div className="pt-2 space-y-4">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={subscribing || !stripeReady}
                className="text-[15px] font-medium disabled:opacity-40"
                style={{ color: colors.accent.action }}
              >
                {subscribing ? '前往付款…' : stripeReady ? '繼續一起走走' : '會員準備中'}
              </button>
              <Link href="/dashboard" className="block text-[14px]" style={{ color: colors.text.tertiary }}>
                先回去 Today
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
