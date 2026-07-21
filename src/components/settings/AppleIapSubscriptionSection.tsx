'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { AccessStatus } from '@/lib/subscription-access'
import { BB_V2 } from '@/lib/betterbit-v2'
import { isRevenueCatConfigured } from '@/lib/apple-iap-config'
import {
  getAppleIapOffering,
  getAppleIapStatus,
  isAppleIapCancellation,
  purchaseAppleIap,
  restoreAppleIap,
  type AppleIapOffering,
  type AppleIapPackageOption,
  type AppleIapPurchaseStep,
} from '@/lib/apple-iap-client'
import { isCapacitorNative } from '@/lib/capacitor-native'
import {
  buildDynamicAnnualPriceCopy,
  formatProRenewalDate,
  inferProPlanId,
  type ProPlanId,
} from '@/lib/pro-subscription-v2'
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
  const [offering, setOffering] = useState<AppleIapOffering | null>(null)
  const [offeringError, setOfferingError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<ProPlanId>('yearly')
  const [activeProductId, setActiveProductId] = useState<string | null>(null)

  const iapReady = isRevenueCatConfigured()
  const isSubscribed = subscription?.status === 'active' || access.isSubscribed
  const selectedPackage: AppleIapPackageOption | null =
    selectedPlan === 'yearly' ? offering?.annual ?? null : offering?.monthly ?? null

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

      const backendRequest = apiFetch('/api/get-subscription')
      let nativeStatus: Awaited<ReturnType<typeof getAppleIapStatus>> = {
        active: false,
      }
      if (user?.id && isRevenueCatConfigured()) {
        try {
          const loadedOffering = await getAppleIapOffering(user.id)
          setOffering(loadedOffering)
          setSelectedPlan(loadedOffering.annual ? 'yearly' : 'monthly')
          setOfferingError(null)
        } catch (error) {
          setOffering(null)
          setOfferingError(
            error instanceof Error
              ? error.message
              : '目前無法載入訂閱方案，請稍後重試'
          )
        }
        nativeStatus = await getAppleIapStatus(user.id).catch(() => {
              console.info('[IAP_ENTITLEMENT_STATUS]', {
                source: 'refresh',
                active: false,
                unavailable: true,
              })
              return { active: false }
            })
      }
      const res = await backendRequest
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
      setActiveProductId(nativeStatus.productId ?? null)
      setLoading(false)
    })()
  }, [])

  async function handleSubscribe(plan: ProPlanId) {
    if (!userId) {
      toast.error('請先登入')
      return
    }
    if (!iapReady) {
      toast.error('訂閱尚未開放')
      return
    }
    if (purchasing) return
    const packageToPurchase =
      plan === 'yearly' ? offering?.annual ?? null : offering?.monthly ?? null
    if (!packageToPurchase) {
      toast.error('請先選擇可用的訂閱方案')
      return
    }

    setPurchasing(true)
    setPurchaseStep('configure')
    try {
      const result = await purchaseAppleIap(
        userId,
        packageToPurchase,
        step => setPurchaseStep(step)
      )
      if (result.active) {
        triggerV2Haptic('success')
        setSubscription({
          status: 'active',
          current_period_end: result.expiresAt ?? null,
          subscription_source: result.backendSynced
            ? 'revenuecat'
            : 'revenuecat_sdk',
        })
        setActiveProductId(result.productId ?? packageToPurchase.productId)
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
        setActiveProductId(result.productId ?? null)
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

  async function handleReloadOfferings() {
    if (!userId) return
    setLoading(true)
    setOfferingError(null)
    try {
      const loadedOffering = await getAppleIapOffering(userId)
      setOffering(loadedOffering)
      setSelectedPlan(loadedOffering.annual ? 'yearly' : 'monthly')
    } catch (error) {
      setOffering(null)
      setOfferingError(
        error instanceof Error ? error.message : '目前無法載入訂閱方案，請稍後重試'
      )
    } finally {
      setLoading(false)
    }
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
        plan={inferProPlanId(activeProductId)}
        renewalDate={renewalDate}
        paymentMethod="Apple ID 付款"
        onBack={() => router.back()}
        onManageSubscription={handleManageSubscription}
      />
    )
  }

  const annualPriceCopy =
    offering?.monthly && offering.annual
      ? buildDynamicAnnualPriceCopy({
          monthlyPrice: offering.monthly.price,
          annualPrice: offering.annual.price,
          annualLocalizedPrice: offering.annual.localizedPrice,
          currencyCode: offering.annual.currencyCode,
        })
      : null
  const planOptions = {
    ...(offering?.monthly
      ? {
          monthly: {
            price: `${offering.monthly.localizedPrice}／月`,
            subtext: '隨時取消',
            hasEligible14DayTrial: offering.monthly.hasEligible14DayTrial,
          },
        }
      : {}),
    ...(offering?.annual
      ? {
          yearly: {
            price: `${offering.annual.localizedPrice}／年`,
            subtextLines: [
              annualPriceCopy?.perMonth ??
                (offering.annual.localizedPricePerMonth
                  ? `約 ${offering.annual.localizedPricePerMonth}／月`
                  : ''),
              ...(annualPriceCopy ? [annualPriceCopy.savings] : []),
            ].filter(Boolean),
            savingsHighlight: annualPriceCopy?.savings,
            badge: '最優惠',
            hasEligible14DayTrial: offering.annual.hasEligible14DayTrial,
          },
        }
      : {}),
  }

  return (
    <ProSubscriptionV2View
      access={access}
      planOptions={planOptions}
      selectedPlan={selectedPlan}
      onSelectPlan={setSelectedPlan}
      offeringsError={offeringError}
      onReloadOfferings={() => void handleReloadOfferings()}
      handlers={{
        onSubscribe: plan => void handleSubscribe(plan),
        onRestore: () => void handleRestore(),
        purchasing,
        restoring,
        iapReady: iapReady && selectedPackage != null,
        purchaseLabel: purchasing
          ? purchaseStep
            ? purchaseStepLabel[purchaseStep]
            : '處理中…'
          : undefined,
      }}
    />
  )
}
