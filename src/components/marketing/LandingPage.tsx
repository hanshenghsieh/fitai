'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import V2PageBackground from '@/components/betterbit-v2/V2PageBackground'
import V2PrimaryButton from '@/components/betterbit-v2/V2PrimaryButton'
import V2Card from '@/components/betterbit-v2/V2Card'
import { SUBSCRIPTION_PRICE_MONTHLY } from '@/lib/subscription-pricing'

export default function LandingPage() {
  return (
    <V2PageBackground className="min-h-[100dvh]">
      <div className="max-w-lg mx-auto px-[18px] pt-14 pb-16 space-y-10">
        <div className="text-center space-y-4">
          <p className="text-[12px] font-semibold tracking-[0.2em]" style={{ color: BB_V2.accent.green }}>
            BETTERBIT
          </p>
          <h1 className="text-[28px] leading-tight" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
            外食減脂不用算，Betterbit 幫你算好
          </h1>
          <p className="text-[16px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
            拍一餐、看懂今天還能吃多少，讓每一次外食都更接近目標。
          </p>
        </div>

        <V2Card padding="24px" className="text-center space-y-3">
          <div
            className="mx-auto w-[220px] h-[420px] rounded-[32px] border-[6px]"
            style={{ borderColor: BB_V2.text.deepGreen, background: BB_V2.bg.pill }}
          >
            <div className="p-4 space-y-2 text-left">
              <p className="text-[11px] tracking-[0.15em]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
                BETTERBIT
              </p>
              <p className="text-[20px] leading-snug" style={{ fontWeight: 700 }}>
                今天
              </p>
              <p className="text-[12px]" style={{ color: BB_V2.text.secondary }}>
                剩餘可吃 · 蛋白質 · 推薦
              </p>
            </div>
          </div>
          <p className="text-[12px]" style={{ color: BB_V2.text.muted }}>
            App Store 高級感 UI · Visual V2
          </p>
        </V2Card>

        <div className="space-y-3">
          <Link href="/register" className="block">
            <V2PrimaryButton>開始使用 · 14 天免費試用</V2PrimaryButton>
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 py-3 text-[15px]"
            style={{ color: BB_V2.text.secondary }}
          >
            已有帳號？登入 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {[
            { title: '拍照記錄', desc: 'AI 估算熱量與三大營養素，不用填表。' },
            { title: '外食也能執行', desc: '台灣品牌菜單對齊熱量與蛋白質目標。' },
            { title: 'Betterbit Pro', desc: `${SUBSCRIPTION_PRICE_MONTHLY} 起 · 完整減脂工具。` },
          ].map(item => (
            <V2Card key={item.title} padding="16px 18px">
              <h3 className="text-[15px] mb-1" style={{ fontWeight: 600 }}>
                {item.title}
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                {item.desc}
              </p>
            </V2Card>
          ))}
        </div>

        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[12px] pt-4">
          <Link href="/privacy" style={{ color: BB_V2.text.muted }}>
            隱私權政策
          </Link>
          <Link href="/terms" style={{ color: BB_V2.text.muted }}>
            服務條款
          </Link>
          <Link href="/support" style={{ color: BB_V2.text.muted }}>
            支援
          </Link>
        </nav>
      </div>
    </V2PageBackground>
  )
}
