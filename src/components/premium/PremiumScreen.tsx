'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { AccessStatus } from '@/lib/subscription-access'
import { BB_V2 } from '@/lib/betterbit-v2'
import { getStripePriceId } from '@/lib/stripe-config'
import { formatProRenewalDate, type ProPlanId } from '@/lib/pro-subscription-v2'
import {
  resolvePremiumPaymentSurface,
  shouldHideExternalPaymentsClient,
  shouldShowAppleIapClient,
} from '@/lib/ios-payment-gate'
import PremiumTestFlightScreen from '@/components/premium/PremiumTestFlightScreen'
import AppleIapSubscriptionSection from '@/components/settings/AppleIapSubscriptionSection'
import ProSubscriptionV2View from '@/components/betterbit-v2/ProSubscriptionV2View'
import ProPaymentSuccessV2View from '@/components/betterbit-v2/ProPaymentSuccessV2View'
import ProActiveStatusV2View from '@/components/betterbit-v2/ProActiveStatusV2View'
import { apiFetch } from '@/lib/api/client'

interface Props {
  access: AccessStatus
}

type WebView = 'paywall' | 'success' | 'active'

export default function PremiumScreen({ access }: Props) {
  const [hidePayments, setHidePayments] = useState(shouldHideExternalPaymentsClient())
  const [showAppleIap, setShowAppleIap] = useState(shouldShowAppleIapClient())

  useEffect(() => {
    setHidePayments(shouldHideExternalPaymentsClient())
    setShowAppleIap(shouldShowAppleIapClient())
  }, [])
  const surface = resolvePremiumPaymentSurface({
    showAppleIap,
    hideExternalPayments: hidePayments,
  })

  if (surface === 'apple_iap') {
    return <AppleIapSubscriptionSection access={access} />
  }

  if (surface === 'informational') {
    // Native safe-mode fallback while Apple IAP is not configured.
    return <PremiumTestFlightScreen />
  }

  return <PremiumStripeV2Screen access={access} />
}

function PremiumStripeV2Screen({ access }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<{
    status: string
    current_period_end?: string
    cancel_at_period_end?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [view, setView] = useState<WebView>('paywall')
  const [purchasedPlan, setPurchasedPlan] = useState<ProPlanId>('yearly')

  const priceId = getStripePriceId()
  const stripeReady = !!priceId
  const isSubscribed = subscription?.status === 'active'
  const renewalDate = formatProRenewalDate(subscription?.current_period_end)

  useEffect(() => {
    void apiFetch('/api/get-subscription')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setSubscription(data?.subscription ?? null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (searchParams.get('subscribed') === '1') {
      setView('success')
      void apiFetch('/api/get-subscription')
        .then(r => (r.ok ? r.json() : null))
        .then(data => setSubscription(data?.subscription ?? null))
    }
    if (searchParams.get('canceled') === '1') toast.message('尚未完成付款。')
  }, [searchParams])

  useEffect(() => {
    if (loading || view === 'success') return
    if (isSubscribed) setView('active')
    else setView('paywall')
  }, [loading, isSubscribed, view])

  async function handleSubscribe(plan: ProPlanId) {
    if (!stripeReady) {
      toast.error('會員功能準備中')
      return
    }
    setPurchasedPlan(plan)
    setSubscribing(true)
    try {
      const res = await apiFetch('/api/create-subscription', {
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
    try {
      const res = await apiFetch('/api/billing-portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (data.url) window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '無法開啟')
    }
  }

  if (loading) {
    return (
      <div className="px-5 py-8 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: BB_V2.text.muted }} />
      </div>
    )
  }

  if (view === 'success') {
    return (
      <ProPaymentSuccessV2View
        plan={purchasedPlan}
        renewalDate={renewalDate}
        onStart={() => router.push('/dashboard')}
        onViewSubscription={() => setView('active')}
        onRestore={() => toast.message('Web 版請使用帳單管理')}
      />
    )
  }

  if (view === 'active' && isSubscribed) {
    return (
      <ProActiveStatusV2View
        plan="monthly"
        renewalDate={renewalDate}
        paymentMethod="Stripe 信用卡"
        onBack={() => router.push('/settings')}
        onManageSubscription={() => void handleBillingPortal()}
      />
    )
  }

  return (
    <ProSubscriptionV2View
      access={access}
      handlers={{
        onSubscribe: plan => void handleSubscribe(plan),
        onRestore: () => toast.message('Web 版請使用帳單管理'),
        purchasing: subscribing,
        iapReady: stripeReady,
        purchaseLabel: subscribing ? '前往付款…' : undefined,
      }}
    />
  )
}
