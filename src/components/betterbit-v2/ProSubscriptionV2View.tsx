'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AccessStatus } from '@/lib/subscription-access'
import {
  PRO_AUTO_RENEW_DISCLOSURE,
  PRO_PLAN_PRICES,
  type ProPlanId,
  yearlyPlanSubtextLines,
} from '@/lib/pro-subscription-v2'
import { PRO_V2_FEATURES } from '@/lib/pro-v2-features'
import { premiumTrialWhisper } from '@/lib/premium-narrative'
import { triggerV2Haptic } from '@/lib/v2-haptics'
import { BB_V2 } from '@/lib/betterbit-v2'
import V2PageBackground from './V2PageBackground'
import V2PageEnter from './V2PageEnter'
import V2Header from './V2Header'
import V2PricingCard from './V2PricingCard'
import V2FeatureRow from './V2FeatureRow'
import V2PrimaryButton from './V2PrimaryButton'

const PAYWALL_PLAN_SESSION_KEY = 'betterbit:paywall:selected-plan'
const PAYWALL_PLAN_EVENT = 'betterbit:paywall-plan-change'

function readSavedPaywallPlan(): ProPlanId {
  const saved = window.sessionStorage.getItem(PAYWALL_PLAN_SESSION_KEY)
  return saved === 'monthly' || saved === 'yearly' ? saved : 'yearly'
}

function subscribeToPaywallPlan(onStoreChange: () => void): () => void {
  window.addEventListener(PAYWALL_PLAN_EVENT, onStoreChange)
  return () => window.removeEventListener(PAYWALL_PLAN_EVENT, onStoreChange)
}

export interface ProPaywallV2Handlers {
  onSubscribe: (plan: ProPlanId) => void
  onRestore: () => void
  purchasing?: boolean
  restoring?: boolean
  purchaseLabel?: string
  iapReady?: boolean
}

export interface ProPaywallPlanOption {
  price: string
  subtext?: string
  subtextLines?: string[]
  savingsHighlight?: string
  badge?: string
  hasEligible14DayTrial?: boolean
}

interface Props {
  access: AccessStatus
  handlers: ProPaywallV2Handlers
  showClose?: boolean
  availablePlans?: 'all' | 'monthly-only'
  planOptions?: Partial<Record<ProPlanId, ProPaywallPlanOption>>
  selectedPlan?: ProPlanId
  onSelectPlan?: (plan: ProPlanId) => void
  offeringsError?: string | null
  onReloadOfferings?: () => void
}

export default function ProSubscriptionV2View({
  access,
  handlers,
  showClose = true,
  availablePlans = 'all',
  planOptions,
  selectedPlan,
  onSelectPlan,
  offeringsError,
  onReloadOfferings,
}: Props) {
  const router = useRouter()
  const monthlyOnly = availablePlans === 'monthly-only'
  const savedPlan = useSyncExternalStore<ProPlanId>(
    subscribeToPaywallPlan,
    readSavedPaywallPlan,
    () => 'yearly'
  )
  const dynamicPlans = planOptions !== undefined
  const plan: ProPlanId =
    selectedPlan ??
    (monthlyOnly ? 'monthly' : savedPlan)
  const trialWhisper = premiumTrialWhisper(access)
  const [yearlyPerMonth, yearlySavings] = yearlyPlanSubtextLines()

  const {
    onSubscribe,
    onRestore,
    purchasing,
    restoring,
    purchaseLabel,
    iapReady = true,
  } = handlers

  const selectPlan = (next: ProPlanId) => {
    if (next === plan) return
    triggerV2Haptic('light')
    if (onSelectPlan) {
      onSelectPlan(next)
      return
    }
    window.sessionStorage.setItem(PAYWALL_PLAN_SESSION_KEY, next)
    window.dispatchEvent(new Event(PAYWALL_PLAN_EVENT))
  }

  const monthlyOption: ProPaywallPlanOption | undefined = dynamicPlans
    ? planOptions.monthly
    : {
        price: PRO_PLAN_PRICES.monthly,
        subtext: '隨時取消',
      }
  const yearlyOption: ProPaywallPlanOption | undefined =
    monthlyOnly
      ? undefined
      : dynamicPlans
        ? planOptions.yearly
        : {
            price: PRO_PLAN_PRICES.yearly,
            subtextLines: [yearlyPerMonth, yearlySavings],
            savingsHighlight: yearlySavings,
            badge: '最優惠',
          }
  const selectedOption = plan === 'yearly' ? yearlyOption : monthlyOption

  const handleSubscribe = () => {
    triggerV2Haptic('medium')
    onSubscribe(plan)
  }

  return (
    <V2PageBackground>
      <V2Header
        title="BetterBit Pro"
        variant={showClose ? 'close' : 'back'}
        onClose={showClose ? () => router.back() : undefined}
        onBack={!showClose ? () => router.back() : undefined}
        hideRight
      />

      <V2PageEnter>
        <div
          className="max-w-[640px] mx-auto pb-[max(28px,var(--app-safe-bottom,0px))] space-y-5"
          style={{ paddingLeft: BB_V2.pagePadding, paddingRight: BB_V2.pagePadding }}
        >
          <div className="text-center pt-2 pb-1">
            <h2 className="text-[22px] leading-snug" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
              解鎖完整減脂體驗 👑
            </h2>
            <p className="text-[14px] mt-2" style={{ color: BB_V2.text.secondary }}>
              更聰明的工具，幫助你更快看到成果
            </p>
            {trialWhisper && (
              <p className="text-[13px] mt-2" style={{ color: BB_V2.text.muted }}>
                {trialWhisper}
              </p>
            )}
          </div>

          {(monthlyOption || yearlyOption) && (
            <div className="grid grid-cols-2 max-[350px]:grid-cols-1 gap-3">
              {monthlyOption && (
                <V2PricingCard
                  title="月訂方案"
                  price={monthlyOption.price}
                  subtext={monthlyOption.subtext}
                  subtextLines={monthlyOption.subtextLines}
                  selected={plan === 'monthly'}
                  onSelect={() => selectPlan('monthly')}
                />
              )}
              {yearlyOption && (
                <V2PricingCard
                  title="年訂方案"
                  price={yearlyOption.price}
                  subtext={yearlyOption.subtext}
                  subtextLines={yearlyOption.subtextLines}
                  savingsHighlight={yearlyOption.savingsHighlight}
                  badge={yearlyOption.badge}
                  selected={plan === 'yearly'}
                  onSelect={() => selectPlan('yearly')}
                />
              )}
            </div>
          )}

          {offeringsError && !monthlyOption && !yearlyOption && (
            <div
              className="rounded-[20px] border px-4 py-5 text-center"
              style={{ background: BB_V2.bg.card, borderColor: BB_V2.border }}
            >
              <p className="text-[14px]" style={{ color: BB_V2.text.secondary }}>
                {offeringsError}
              </p>
              {onReloadOfferings && (
                <button
                  type="button"
                  onClick={onReloadOfferings}
                  className="mt-3 rounded-full px-5 py-2 text-[13px]"
                  style={{
                    background: BB_V2.bg.softGreen,
                    color: BB_V2.accent.green,
                    fontWeight: 600,
                  }}
                >
                  重新整理
                </button>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <p className="text-[16px] px-1" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
              Betterbit Pro 專屬功能
            </p>
            {PRO_V2_FEATURES.map(({ icon: Icon, title, subtitle }) => (
              <V2FeatureRow
                key={title}
                icon={<Icon className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
                title={title}
                subtitle={subtitle}
              />
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <V2PrimaryButton
              onClick={handleSubscribe}
              disabled={!iapReady || purchasing}
              loading={purchasing}
              loadingText={purchaseLabel}
            >
              {iapReady
                ? selectedOption?.hasEligible14DayTrial
                  ? '開始 14 天免費試用'
                  : '立即升級 BetterBit Pro'
                : '訂閱準備中'}
            </V2PrimaryButton>

            <p className="text-[11px] text-center leading-relaxed px-2" style={{ color: BB_V2.text.muted }}>
              {PRO_AUTO_RENEW_DISCLOSURE}
            </p>

            <div className="flex justify-center gap-6 text-[12px]">
              <Link href="/terms" style={{ color: BB_V2.text.muted }} className="underline underline-offset-2">
                服務條款
              </Link>
              <Link href="/privacy" style={{ color: BB_V2.text.muted }} className="underline underline-offset-2">
                隱私政策
              </Link>
            </div>

            <button
              type="button"
              onClick={onRestore}
              disabled={restoring || !iapReady}
              className="w-full py-2 text-[13px] disabled:opacity-40 touch-manipulation"
              style={{ color: BB_V2.accent.green, fontWeight: 500 }}
            >
              {restoring ? '還原中…' : '恢復購買'}
            </button>
          </div>
        </div>
      </V2PageEnter>
    </V2PageBackground>
  )
}
