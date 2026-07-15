'use client'

import { useState } from 'react'
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

export interface ProPaywallV2Handlers {
  onSubscribe: (plan: ProPlanId) => void
  onRestore: () => void
  purchasing?: boolean
  restoring?: boolean
  purchaseLabel?: string
  iapReady?: boolean
}

interface Props {
  access: AccessStatus
  handlers: ProPaywallV2Handlers
  showClose?: boolean
  availablePlans?: 'all' | 'monthly-only'
}

export default function ProSubscriptionV2View({
  access,
  handlers,
  showClose = true,
  availablePlans = 'all',
}: Props) {
  const router = useRouter()
  const monthlyOnly = availablePlans === 'monthly-only'
  const [plan, setPlan] = useState<ProPlanId>(
    monthlyOnly ? 'monthly' : 'yearly'
  )
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
    setPlan(next)
  }

  const handleSubscribe = () => {
    triggerV2Haptic('medium')
    onSubscribe(plan)
  }

  return (
    <V2PageBackground>
      <V2Header
        title="Betterbit Pro"
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

          <div className={monthlyOnly ? 'flex' : 'flex gap-3'}>
            <V2PricingCard
              title="月訂方案"
              price={PRO_PLAN_PRICES.monthly}
              subtext="隨時取消"
              selected={plan === 'monthly'}
              onSelect={() => selectPlan('monthly')}
            />
            {!monthlyOnly && (
              <V2PricingCard
                title="年訂方案"
                price={PRO_PLAN_PRICES.yearly}
                subtextLines={[yearlyPerMonth, yearlySavings]}
                savingsHighlight={yearlySavings}
                badge="最優惠"
                selected={plan === 'yearly'}
                onSelect={() => selectPlan('yearly')}
              />
            )}
          </div>

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
              {iapReady ? '立即升級 Betterbit Pro' : '訂閱準備中'}
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
