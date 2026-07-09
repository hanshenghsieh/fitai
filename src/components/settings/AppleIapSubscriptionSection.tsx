'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { AccessStatus } from '@/lib/subscription-access'
import { colors } from '@/lib/design-system'
import {
  APPLE_IAP_LEGAL_DISCLOSURE,
  APPLE_IAP_PRICE_LABEL,
  isRevenueCatConfigured,
} from '@/lib/apple-iap-config'
import { purchaseAppleIap, restoreAppleIap, type AppleIapPurchaseStep } from '@/lib/apple-iap-client'
import {
  PREMIUM_BODY,
  PREMIUM_FEATURES,
  PREMIUM_MANAGE_FOOTNOTE,
  PREMIUM_SUBTITLE_SUBSCRIBED,
  premiumPosture,
  premiumTrialWhisper,
} from '@/lib/premium-narrative'
import LegalLinksRow from '@/components/legal/LegalLinksRow'
import SettingsSubpageHeader from '@/components/settings/SettingsSubpageHeader'
import { createClient } from '@/lib/supabase/client'

interface Props {
  access: AccessStatus
  compact?: boolean
}

function FeatureList() {
  return (
    <ul className="space-y-2.5">
      {PREMIUM_FEATURES.map(feature => (
        <li key={feature} className="text-[14px] leading-relaxed flex gap-2" style={{ color: colors.text.secondary }}>
          <span className="shrink-0" style={{ color: colors.accent.sage }}>✓</span>
          <span className="min-w-0">{feature}</span>
        </li>
      ))}
    </ul>
  )
}

export default function AppleIapSubscriptionSection({ access, compact = false }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<{
    status: string
    current_period_end?: string | null
    subscription_source?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseStep, setPurchaseStep] = useState<AppleIapPurchaseStep | null>(null)
  const [restoring, setRestoring] = useState(false)

  const iapReady = isRevenueCatConfigured()
  const isSubscribed = subscription?.status === 'active' || access.isSubscribed
  const trialWhisper = premiumTrialWhisper(access)

  const purchaseStepLabel: Record<AppleIapPurchaseStep, string> = {
    configure: '連接付款…',
    offerings: '讀取方案…',
    purchase: '等待 Apple 付款…',
    sync: '同步會員…',
  }

  useEffect(() => {
    void (async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const res = await fetch('/api/get-subscription')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
      }
      setLoading(false)
    })()
  }, [])

  async function refreshSubscription() {
    const res = await fetch('/api/get-subscription')
    if (res.ok) {
      const data = await res.json()
      setSubscription(data.subscription)
    }
  }

  async function handleSubscribe() {
    if (!userId) {
      toast.error('請先登入')
      return
    }
    if (!iapReady) {
      toast.error('訂閱尚未開放')
      return
    }
    if (purchasing) return
    setPurchasing(true)
    setPurchaseStep('configure')
    try {
      const result = await purchaseAppleIap(userId, step => setPurchaseStep(step))
      if (result.active) {
        toast.message('訂閱成功，會員功能已啟用。')
        await refreshSubscription()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '無法完成訂閱'
      if (!/cancel|已取消/i.test(message)) toast.error(message)
    } finally {
      setPurchasing(false)
      setPurchaseStep(null)
    }
  }

  async function handleRestore() {
    if (!userId) {
      toast.error('請先登入')
      return
    }
    if (!iapReady) {
      toast.error('還原購買尚未開放')
      return
    }
    setRestoring(true)
    try {
      const result = await restoreAppleIap(userId)
      if (result.active) {
        toast.message('已還原你的會員訂閱。')
        await refreshSubscription()
      } else {
        toast.message('找不到可還原的訂閱。')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '還原失敗')
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return (
      <div className={compact ? 'py-4 flex justify-center' : 'px-5 py-8 flex justify-center'}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: colors.text.tertiary }} />
      </div>
    )
  }

  const content = isSubscribed ? (
    <div className="space-y-4">
      <p className="text-[15px] leading-relaxed" style={{ color: colors.text.primary }}>
        {PREMIUM_SUBTITLE_SUBSCRIBED}
      </p>
      {subscription?.current_period_end && (
        <p className="text-[13px]" style={{ color: colors.text.tertiary }}>
          下次續訂 {new Date(subscription.current_period_end).toLocaleDateString('zh-TW')}
        </p>
      )}
      <p className="text-[12px] leading-relaxed" style={{ color: colors.text.tertiary }}>
        {PREMIUM_MANAGE_FOOTNOTE}
      </p>
      <button
        type="button"
        onClick={handleRestore}
        disabled={restoring || !iapReady}
        className="text-[14px] underline underline-offset-2 disabled:opacity-40"
        style={{ color: colors.text.secondary }}
      >
        {restoring ? '還原中…' : '還原購買'}
      </button>
    </div>
  ) : (
    <div className="space-y-4">
      {!compact && (
        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          {PREMIUM_BODY}
        </p>
      )}
      {!compact && <FeatureList />}
      {trialWhisper && (
        <p className="text-[14px] leading-relaxed" style={{ color: colors.text.tertiary }}>
          {trialWhisper}
        </p>
      )}
      <p className="text-[16px] font-medium" style={{ color: colors.text.primary }}>
        {APPLE_IAP_PRICE_LABEL}
      </p>
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={purchasing || !iapReady}
        className="w-full py-3 rounded-xl text-[15px] font-medium disabled:opacity-40"
        style={{ backgroundColor: colors.accent.action, color: colors.bg.elevated }}
      >
        {purchasing
          ? purchaseStep
            ? purchaseStepLabel[purchaseStep]
            : '處理中…'
          : iapReady
            ? '訂閱 BetterBit Pro'
            : '訂閱準備中'}
      </button>
      <button
        type="button"
        onClick={handleRestore}
        disabled={restoring || !iapReady}
        className="w-full py-3 rounded-xl text-[14px] font-medium disabled:opacity-40"
        style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
      >
        {restoring ? '還原中…' : '還原購買'}
      </button>
      <p className="text-[12px] leading-relaxed" style={{ color: colors.text.tertiary }}>
        {APPLE_IAP_LEGAL_DISCLOSURE}
      </p>
      {!compact && <LegalLinksRow />}
    </div>
  )

  if (compact) {
    return <div className="px-4 py-4 space-y-4">{content}</div>
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: colors.bg.canvas }}>
      <SettingsSubpageHeader
        title="BetterBit Pro"
        subtitle={premiumPosture(access, isSubscribed)}
      />
        <div className="px-6 space-y-5">
        {content}
        <Link href="/dashboard" className="block text-[14px]" style={{ color: colors.text.tertiary }}>
          回到 Today
        </Link>
      </div>
    </div>
  )
}
