'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { colors } from '@/lib/design-system'

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg.canvas }}>
      <header className="px-6 pt-14 pb-12 space-y-8">
        <div className="text-center space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.accent.action }}>
            科學健康引擎
          </p>
          <h1 className="text-[28px] font-semibold leading-tight" style={{ color: colors.text.primary }}>
            照著做就好
          </h1>
          <p className="text-[15px] leading-relaxed px-2" style={{ color: colors.text.secondary }}>
            依你的體重、體脂與目標，自動算出熱量缺口、蛋白質與運動量，<br />
            設計每日三餐與課表。你不用自己想。
          </p>
        </div>
        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 py-4 rounded-2xl text-[17px] font-semibold"
            style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
          >
            免費試用 7 天
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/login" className="text-center text-[13px] py-2" style={{ color: colors.text.tertiary }}>
            已有帳號？登入
          </Link>
        </div>
      </header>

      <section className="px-6 py-10 space-y-4">
        {[
          { title: '個人化計畫', desc: '輸入體態與生活型態，系統算出每日該吃多少、動多少。' },
          { title: '外食也能執行', desc: '7-11、全家真實 SKU，每餐對齊熱量與蛋白質目標。' },
          { title: '每週自動調整', desc: '依體重變化與回饋，下週計畫會更新，不用自己重算。' },
        ].map(item => (
          <div
            key={item.title}
            className="rounded-2xl p-5"
            style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
          >
            <h3 className="font-semibold text-[15px] mb-1" style={{ color: colors.text.primary }}>{item.title}</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: colors.text.secondary }}>{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="px-6 pb-16 text-center">
        <p className="text-[12px] leading-relaxed" style={{ color: colors.text.tertiary }}>
          再健只是介面。背後是完整的營養與運動計算。
        </p>
      </section>
    </div>
  )
}
