'use client'

import Link from 'next/link'
import {
  Calendar,
  ChevronRight,
  CreditCard,
  Crown,
  FileText,
  Gift,
  Share2,
  Check,
} from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import { isCapacitorNative } from '@/lib/capacitor-native'
import {
  PRO_ACTIVE_FOOTNOTE,
  PRO_PLAN_FULL_LABELS,
  PRO_PLAN_LABELS,
  type ProPlanId,
} from '@/lib/pro-subscription-v2'
import { PRO_V2_FEATURES } from '@/lib/pro-v2-features'
import V2PageBackground from './V2PageBackground'
import V2PageEnter from './V2PageEnter'
import V2Header from './V2Header'
import V2Card from './V2Card'

interface Props {
  plan: ProPlanId
  renewalDate: string
  paymentMethod: string
  onBack?: () => void
  onManageSubscription: () => void
}

export default function ProActiveStatusV2View({
  plan,
  renewalDate,
  paymentMethod,
  onBack,
  onManageSubscription,
}: Props) {
  return (
    <V2PageBackground>
      <V2Header title="BetterBit Pro" variant="back" onBack={onBack} hideRight />

      <V2PageEnter>
        <div
          className="max-w-[640px] mx-auto pb-[max(28px,var(--app-safe-bottom,0px))] space-y-4"
          style={{ paddingLeft: BB_V2.pagePadding, paddingRight: BB_V2.pagePadding }}
        >
          <V2Card padding="18px 16px">
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: BB_V2.accent.green, color: '#fff' }}
              >
                <Crown className="h-7 w-7" strokeWidth={BB_V2.iconStroke} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[18px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                      Pro 會員
                    </p>
                    <p className="text-[14px] mt-0.5" style={{ color: BB_V2.accent.green, fontWeight: 600 }}>
                      使用中 ✅
                    </p>
                    <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary }}>
                      你已解鎖完整減脂工具
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-0.5"
                    style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green, fontWeight: 600 }}
                  >
                    ✦ 享有所有 Pro 權益
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
              <div>
                <p className="text-[12px]" style={{ color: BB_V2.text.secondary }}>
                  方案
                </p>
                <p className="text-[15px] mt-0.5" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                  {PRO_PLAN_LABELS[plan]}
                </p>
              </div>
              <div>
                <p className="text-[12px]" style={{ color: BB_V2.text.secondary }}>
                  下次續訂日
                </p>
                <p className="text-[14px] mt-0.5 leading-snug" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                  {renewalDate}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onManageSubscription}
              className="w-full mt-4 flex items-center gap-3 px-3 py-3 rounded-2xl touch-manipulation"
              style={{ backgroundColor: BB_V2.bg.pill }}
            >
              <Calendar className="h-5 w-5 shrink-0" style={{ color: BB_V2.text.secondary }} />
              <span className="flex-1 text-left text-[14px]" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>
                管理訂閱方案
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" style={{ color: BB_V2.text.muted }} />
            </button>
          </V2Card>

          <div>
            <p className="text-[16px] px-1 mb-1" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
              你的 Pro 權益
            </p>
            <p className="text-[13px] px-1 mb-3" style={{ color: BB_V2.text.secondary }}>
              你目前可以使用所有 Pro 功能
            </p>
            <div className="space-y-2">
              {PRO_V2_FEATURES.map(({ icon: Icon, title, subtitle }) => (
                <V2Card key={title} padding="14px 16px" className="!rounded-[20px] !shadow-none">
                  <div className="flex items-center gap-3">
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                        {title}
                      </p>
                      <p className="text-[12px] mt-0.5 leading-snug" style={{ color: BB_V2.text.secondary }}>
                        {subtitle}
                      </p>
                    </div>
                    <Check className="h-5 w-5 shrink-0" style={{ color: BB_V2.accent.green }} strokeWidth={2.5} />
                  </div>
                </V2Card>
              ))}
            </div>
          </div>

          <V2Card
            padding="16px"
            className="!rounded-[20px]"
            style={{ backgroundColor: BB_V2.bg.softGreen, border: `1px solid ${BB_V2.accent.greenSoftBorder}` }}
          >
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#fff', color: BB_V2.accent.green }}
              >
                <Gift className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                  邀請好友，一起變好
                </p>
                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                  每邀請 1 位好友升級 Pro
                  <br />
                  你和好友各得{' '}
                  <span style={{ color: BB_V2.accent.green, fontWeight: 600 }}>7 天免費 Pro</span>
                </p>
              </div>
              <button
                type="button"
                disabled
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] opacity-60"
                style={{ backgroundColor: '#fff', color: BB_V2.text.primary, fontWeight: 600 }}
                aria-label="邀請好友即將開放"
              >
                <Share2 className="h-3.5 w-3.5" />
                即將開放
              </button>
            </div>
          </V2Card>

          <div>
            <p className="text-[16px] px-1 mb-3" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
              訂閱資訊
            </p>
            <V2Card padding="0 16px">
              <InfoRow icon={CreditCard} label="付款方式" value={paymentMethod} />
              <InfoRow icon={FileText} label="訂閱方案" value={PRO_PLAN_FULL_LABELS[plan]} />
              <InfoRow icon={Calendar} label="下次續訂日" value={renewalDate} last />
            </V2Card>
          </div>

          <p className="text-[11px] text-center leading-relaxed px-2" style={{ color: BB_V2.text.muted }}>
            {PRO_ACTIVE_FOOTNOTE}
          </p>
          <div className="flex justify-center items-center gap-3 text-[12px] pb-2">
            <Link href="/privacy" style={{ color: BB_V2.text.deepGreen }} className="underline underline-offset-2">
              隱私政策
            </Link>
            <span style={{ color: BB_V2.text.muted }}>×</span>
            <Link href="/terms" style={{ color: BB_V2.text.deepGreen }} className="underline underline-offset-2">
              服務條款
            </Link>
          </div>
        </div>
      </V2PageEnter>
    </V2PageBackground>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: typeof CreditCard
  label: string
  value: string
  last?: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 py-3.5"
      style={{ borderBottom: last ? undefined : `1px solid ${BB_V2.divider}` }}
    >
      <Icon className="h-5 w-5 shrink-0" style={{ color: BB_V2.text.secondary }} strokeWidth={BB_V2.iconStroke} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
          {label}
        </p>
        <p className="text-[14px] mt-0.5" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
          {value}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: BB_V2.text.muted }} />
    </div>
  )
}

export function openAppleSubscriptionManagement(): void {
  const url = 'https://apps.apple.com/account/subscriptions'
  if (isCapacitorNative()) {
    window.location.href = url
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
