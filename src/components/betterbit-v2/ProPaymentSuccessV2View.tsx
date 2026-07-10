'use client'

import { Check, Crown } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import {
  PRO_APP_STORE_MANAGE_HINT,
  PRO_PLAN_FULL_LABELS,
  PRO_PLAN_PRICES,
  type ProPlanId,
  yearlyPlanSubtextLines,
} from '@/lib/pro-subscription-v2'
import { PRO_V2_FEATURE_TITLES } from '@/lib/pro-v2-features'
import V2PageBackground from './V2PageBackground'
import V2PageEnter from './V2PageEnter'
import V2Card from './V2Card'
import V2PrimaryButton from './V2PrimaryButton'
import V2Confetti from './V2Confetti'

interface Props {
  plan: ProPlanId
  renewalDate?: string | null
  onStart: () => void
  onViewSubscription: () => void
  onRestore: () => void
  restoring?: boolean
}

export default function ProPaymentSuccessV2View({
  plan,
  renewalDate,
  onStart,
  onViewSubscription,
  onRestore,
  restoring,
}: Props) {
  const [yearlyPerMonth, yearlySavings] = yearlyPlanSubtextLines()

  return (
    <V2PageBackground>
      <V2Confetti active />
      <V2PageEnter>
        <div
          className="max-w-[640px] mx-auto pb-[max(28px,var(--app-safe-bottom,0px))]"
          style={{ paddingLeft: BB_V2.pagePadding, paddingRight: BB_V2.pagePadding }}
        >
          <div className="text-center pt-6 pb-4">
            <h1 className="text-[22px] leading-snug" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
              付款成功！
              <br />
              已升級為 BetterBit Pro
            </h1>
            <p className="text-[14px] mt-2" style={{ color: BB_V2.text.secondary }}>
              感謝你的信任，我們會陪你一起達成目標 💚
            </p>
          </div>

          <V2Card padding="24px 20px" className="text-center">
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center v2-success-check"
              style={{ backgroundColor: BB_V2.accent.green }}
            >
              <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
            </div>

            <h2 className="text-[20px] mt-4" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              訂閱成功！
            </h2>
            <p className="text-[18px] mt-1" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
              歡迎加入 BetterBit Pro 🎉
            </p>
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
              你已解鎖完整減脂功能
              <br />
              讓我們一起更聰明地瘦下去吧！
            </p>
          </V2Card>

          <V2Card padding="18px 16px" className="mt-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
                訂閱方案
              </span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green, fontWeight: 600 }}
              >
                {plan === 'yearly' ? '年繳方案' : '月繳方案'}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green }}
              >
                <Crown className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                  {PRO_PLAN_FULL_LABELS[plan]}
                </p>
                <p className="text-[22px] tabular-nums mt-0.5" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                  {PRO_PLAN_PRICES[plan]}
                </p>
                {plan === 'yearly' && (
                  <>
                    <p className="text-[13px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
                      {yearlyPerMonth}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: BB_V2.accent.green, fontWeight: 600 }}>
                      {yearlySavings} 💚
                    </p>
                  </>
                )}
              </div>
            </div>
            {renewalDate && (
              <>
                <div className="my-3 h-px" style={{ backgroundColor: BB_V2.divider }} />
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span style={{ color: BB_V2.text.secondary }}>下一次扣款日期</span>
                  <span style={{ color: BB_V2.text.primary, fontWeight: 600 }}>{renewalDate}</span>
                </div>
              </>
            )}
          </V2Card>

          <V2Card padding="16px" className="mt-4">
            <p className="text-[15px] mb-3" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              你現在可以使用所有 Pro 功能
            </p>
            <ul className="space-y-2.5">
              {PRO_V2_FEATURE_TITLES.map((title, index) => (
                <li
                  key={title}
                  className="flex items-center gap-2.5 v2-stagger-item"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <Check className="h-4 w-4 shrink-0" style={{ color: BB_V2.accent.green }} strokeWidth={2.5} />
                  <span className="text-[14px]" style={{ color: BB_V2.text.primary }}>
                    {title}
                  </span>
                </li>
              ))}
            </ul>
          </V2Card>

          <div className="space-y-3 mt-5">
            <V2PrimaryButton onClick={onStart}>開始使用 Pro 功能</V2PrimaryButton>
            <V2PrimaryButton variant="secondary" onClick={onViewSubscription}>
              查看訂閱資訊
            </V2PrimaryButton>
            <p className="text-[11px] text-center leading-relaxed px-2" style={{ color: BB_V2.text.muted }}>
              {PRO_APP_STORE_MANAGE_HINT}
            </p>
            <button
              type="button"
              onClick={onRestore}
              disabled={restoring}
              className="w-full py-2 text-[13px] disabled:opacity-40"
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
