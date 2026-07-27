import { Check, X } from 'lucide-react'
import PhoneMockup from '../ui/PhoneMockup'

const GENERIC_APP_POINTS = [
  '只告訴你吃了多少',
  '營養資訊不完整或不準確',
  '需要自己計算與調整',
  '沒有明確的飲食建議',
  '外食、便當資料不完整',
] as const

const BETTERBIT_POINTS = [
  '告訴你接下來還能吃多少',
  '完整營養素分析（蛋白質/碳水/脂肪）',
  'AI 幫你計算、自動調整',
  '根據目標與進度給你飲食建議',
  '持續更新的台灣在地食物資料庫',
] as const

export default function ComparisonSection() {
  return (
    <section className="bg-[#f4f7f5] py-24 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
          BetterBit 與一般飲食紀錄 App 的差異
        </h2>

        <div className="relative mt-16 grid items-center gap-10 lg:mt-20 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
          <div className="rounded-3xl border border-gray-100 bg-white p-9 shadow-[0_2px_16px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(0,0,0,0.07)]">
            <h3 className="text-sm font-semibold text-gray-400">一般飲食紀錄 App</h3>
            <ul className="mt-6 flex flex-col gap-4">
              {GENERIC_APP_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-gray-500">
                  <X size={16} className="mt-0.5 shrink-0 text-gray-300" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto flex flex-col items-center">
            <PhoneMockup
              src="/marketing/hero-dashboard.png"
              alt="BetterBit 今日儀表板"
              className="w-40 sm:w-48"
            />
            <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)]">
              VS
            </div>
          </div>

          <div className="rounded-3xl border-2 border-[#76b69a]/40 bg-white p-9 shadow-[0_16px_40px_rgba(118,182,154,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(118,182,154,0.18)]">
            <h3 className="text-sm font-semibold text-[#76b69a]">BetterBit</h3>
            <ul className="mt-6 flex flex-col gap-4">
              {BETTERBIT_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check size={16} className="mt-0.5 shrink-0 text-[#76b69a]" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
