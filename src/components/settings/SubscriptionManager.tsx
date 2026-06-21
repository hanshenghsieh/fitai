'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CreditCard, Check, Loader2, ExternalLink, XCircle } from 'lucide-react'
import { colors, cardStyle } from '@/lib/design-system'
import { getStripePriceId, SUBSCRIPTION_PRICE_LABEL } from '@/lib/stripe-config'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'

export default function SubscriptionManager() {
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<{
    status: string
    current_period_end?: string
    cancel_at_period_end?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const priceId = getStripePriceId()
  const stripeReady = !!priceId

  useEffect(() => {
    loadSubscriptionStatus()
  }, [])

  useEffect(() => {
    if (searchParams.get('subscribed') === '1') {
      toast.success('訂閱成功', { description: '每週計畫會持續依你的數據更新。' })
    }
    if (searchParams.get('canceled') === '1') {
      toast.message('沒訂閱也沒關係', { description: '試用期內仍可使用完整計畫。' })
    }
  }, [searchParams])

  async function loadSubscriptionStatus() {
    try {
      const res = await fetch('/api/get-subscription')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
      }
    } catch {
      console.error('Error loading subscription')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe() {
    if (!stripeReady) {
      toast.error('訂閱功能準備中，請稍後再試')
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
      else toast.error('無法初始化付款')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '訂閱失敗')
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
      toast.error(err instanceof Error ? err.message : '無法開啟帳單管理')
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleCancel() {
    setCanceling(true)
    try {
      const res = await fetch('/api/cancel-subscription', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(data.message || '已取消')
      loadSubscriptionStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '取消失敗')
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 text-center" style={cardStyle}>
        <Loader2 className="h-5 w-5 animate-spin mx-auto" style={{ color: colors.accent.action }} />
      </div>
    )
  }

  const isSubscribed = subscription?.status === 'active'
  const isCanceling = subscription?.cancel_at_period_end

  return (
    <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
      <div className="flex items-start gap-3">
        <ZaiJian size="xs" expression={isSubscribed ? 'proud' : 'normal'} />
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.accent.action }}>
            訂閱
          </p>
          <h3 className="text-[15px] font-semibold mt-0.5" style={{ color: colors.text.primary }}>
            {isSubscribed ? '計畫持續更新中' : '解鎖每週自動重算'}
          </h3>
          <p className="text-[13px] mt-1" style={{ color: colors.text.secondary }}>
            {SUBSCRIPTION_PRICE_LABEL} — 約兩杯手搖/月，比單次營養諮詢便宜。體重變化後自動重算計畫。
          </p>
        </div>
      </div>

      {!isSubscribed && (
        <ul className="text-[12px] space-y-1 pl-1" style={{ color: colors.text.tertiary }}>
          <li>· 比 ChatGPT 多：記住你的常吃、幫你兜外食組合</li>
          <li>· 比 MFP 少煩：不用從零搜每一口</li>
          <li>· 可隨時在帳單管理取消</li>
        </ul>
      )}

      {isSubscribed ? (
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: colors.accent.actionSoft }}>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" style={{ color: colors.accent.action }} />
            <span className="text-[14px] font-semibold" style={{ color: colors.text.primary }}>已訂閱</span>
          </div>
          {subscription?.current_period_end && (
            <p className="text-[12px]" style={{ color: colors.text.secondary }}>
              {isCanceling ? '本期結束後停止：' : '下次結算：'}
              {new Date(subscription.current_period_end).toLocaleDateString('zh-TW')}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBillingPortal}
              disabled={portalLoading}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1"
              style={{ backgroundColor: colors.bg.elevated, color: colors.text.primary, border: `1px solid ${colors.border.subtle}` }}
            >
              {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              管理帳單
            </button>
            {!isCanceling && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={canceling}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
              >
                {canceling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                取消訂閱
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={subscribing || !stripeReady}
          className="w-full py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
        >
          {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {stripeReady ? `訂閱 ${SUBSCRIPTION_PRICE_LABEL}` : '訂閱準備中'}
        </button>
      )}

      {!stripeReady && (
        <p className="text-[11px] text-center" style={{ color: colors.text.tertiary }}>
          {pickZaiJianLine('loading').subtext ?? '付款設定中，試用期內功能完整。'}
        </p>
      )}
    </div>
  )
}
