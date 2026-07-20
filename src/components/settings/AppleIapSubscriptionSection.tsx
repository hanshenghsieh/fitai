'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { AccessStatus } from '@/lib/subscription-access'
import { BB_V2 } from '@/lib/betterbit-v2'
import { isRevenueCatConfigured } from '@/lib/apple-iap-config'
import {
  getAppleIapStatus,
  isAppleIapCancellation,
  purchaseAppleIap,
  restoreAppleIap,
  type AppleIapPurchaseStep,
} from '@/lib/apple-iap-client'
import { isCapacitorNative } from '@/lib/capacitor-native'
import { formatProRenewalDate } from '@/lib/pro-subscription-v2'
import { triggerV2Haptic } from '@/lib/v2-haptics'
import ProSubscriptionV2View from '@/components/betterbit-v2/ProSubscriptionV2View'
import ProActiveStatusV2View, {
  openAppleSubscriptionManagement,
} from '@/components/betterbit-v2/ProActiveStatusV2View'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'

interface Props {
  access: AccessStatus
  compact?: boolean
}

export default function AppleIapSubscriptionSection({ access, compact = false }: Props) {
  const router = useRouter()
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

  const purchaseStepLabel: Record<AppleIapPurchaseStep, string> = {
    configure: '正在連接 App Store...',
    offerings: '正在讀取方案...',
    purchase: '正在確認訂閱...',
    sync: '正在同步會員...',
  }

  const renewalDate = formatProRenewalDate(subscription?.current_period_end)

  useEffect(() => {
    void (async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const [res, nativeStatus] = await Promise.all([
        apiFetch('/api/get-subscription'),
        user?.id && isRevenueCatConfigured()
          ? getAppleIapStatus(user.id).catch(() => {
              console.info('[IAP_ENTITLEMENT_STATUS]', {
                source: 'refresh',
                active: false,
                unavailable: true,
              })
              return { active: false }
            })
          : Promise.resolve({ active: false }),
      ])
      let backendSubscription: typeof subscription = null
      if (res.ok) {
        const data = await res.json()
        backendSubscription = data.subscription
      }
      setSubscription(
        nativeStatus.active
          ? {
              status: 'active',
              current_period_end: nativeStatus.expiresAt ?? null,
              subscription_source: 'revenuecat_sdk',
            }
          : backendSubscription
      )
      setLoading(false)
    })()
  }, [])

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
        triggerV2Haptic('success')
        setSubscription({
          status: 'active',
          current_period_end: result.expiresAt ?? null,
          subscription_source: result.backendSynced
            ? 'revenuecat'
            : 'revenuecat_sdk',
        })
        toast.success('Betterbit Pro 已啟用')
        console.info('[IAP_POST_PURCHASE_NAVIGATION]', {
          entitlementActive: true,
          backendSynced: result.backendSynced === true,
          destination: '/settings',
          method: 'replace',
        })
        router.replace('/settings')
        router.refresh()
      }
    } catch (err) {
      if (!isAppleIapCancellation(err)) {
        triggerV2Haptic('error')
        const message = err instanceof Error ? err.message : '無法完成訂閱'
        toast.error(message)
      }
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
        triggerV2Haptic('success')
        toast.message('已恢復你的 Betterbit Pro 權限')
        setSubscription({
          status: 'active',
          current_period_end: result.expiresAt ?? null,
          subscription_source: result.backendSynced
            ? 'revenuecat'
            : 'revenuecat_sdk',
        })
      } else {
        toast.message('目前找不到可恢復的訂閱')
      }
    } catch {
      triggerV2Haptic('error')
      toast.error('恢復購買失敗，請稍後再試')
    } finally {
      setRestoring(false)
    }
  }

  function handleManageSubscription() {
    if (isCapacitorNative()) {
      openAppleSubscriptionManagement()
      return
    }
    toast.message('請在 iPhone App 內或 App Store 管理訂閱')
  }

  if (loading) {
    return (
      <div className={compact ? 'py-4 flex justify-center' : 'px-5 py-8 flex justify-center'}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: BB_V2.text.muted }} />
      </div>
    )
  }

  if (compact) {
    return (
      <div className="px-4 py-4 space-y-3">
        <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
          {isSubscribed ? 'Betterbit Pro 使用中' : 'Betterbit Pro'}
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
          {isSubscribed ? '你已解鎖完整減脂工具' : '解鎖完整減脂體驗與進階工具'}
        </p>
        <button
          type="button"
          onClick={() => router.push('/settings/premium')}
          className="w-full py-3 rounded-full text-[14px]"
          style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green, fontWeight: 600 }}
        >
          {isSubscribed ? '查看 Pro 會員' : '升級 Betterbit Pro'}
        </button>
      </div>
    )
  }

  if (isSubscribed) {
    return (
      <ProActiveStatusV2View
        plan="monthly"
        renewalDate={renewalDate}
        paymentMethod="Apple ID 付款"
        onBack={() => router.back()}
        onManageSubscription={handleManageSubscription}
      />
    )
  }

  return (
    <ProSubscriptionV2View
      access={access}
      availablePlans="monthly-only"
      handlers={{
        onSubscribe: () => void handleSubscribe(),
        onRestore: () => void handleRestore(),
        purchasing,
        restoring,
        iapReady,
        purchaseLabel: purchasing
          ? purchaseStep
            ? purchaseStepLabel[purchaseStep]
            : '處理中…'
          : undefined,
      }}
    />
  )
}
