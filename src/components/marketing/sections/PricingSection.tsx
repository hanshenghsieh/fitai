import { Check } from 'lucide-react'

const APP_STORE_URL = '#'

const FEATURES = [
  '完整功能使用',
  'AI 辨識次數無限制',
  '營養分析與建議',
  '進度追蹤與目標調整',
  '隨時可取消',
] as const

const PLANS = [
  { name: '月繳方案', price: 'NT$ 190', unit: '/月', highlight: false, badge: null },
  { name: '年繳方案', price: 'NT$ 990', unit: '/年', highlight: true, badge: '最超值' },
] as const

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-[#faf9f6] py-24 lg:py-36">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
            簡單透明的方案
          </h2>
          <p className="mt-4 text-base text-gray-500">14 天免費試用．隨時可取消</p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:mt-20 lg:items-center">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl bg-white p-9 transition-all duration-300 ${
                plan.highlight
                  ? 'border-2 border-[#76b69a] shadow-[0_24px_48px_-12px_rgba(118,182,154,0.3)] lg:scale-[1.06] lg:p-10'
                  : 'border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(0,0,0,0.07)]'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3.5 right-8 rounded-full bg-[#76b69a] px-3.5 py-1.5 text-xs font-bold tracking-wide text-white shadow-[0_6px_16px_rgba(118,182,154,0.45)]">
                  {plan.badge}
                </span>
              )}

              <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-gray-950">{plan.price}</span>
                <span className="text-sm text-gray-400">{plan.unit}</span>
              </div>
              {plan.highlight && <p className="mt-1.5 text-xs text-gray-400">平均每月只需 NT$ 83</p>}

              <ul className="mt-7 flex flex-col gap-3.5">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Check size={16} className="shrink-0 text-[#76b69a]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={APP_STORE_URL}
                className={`mt-8 block rounded-full px-6 py-3.5 text-center text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
                  plan.highlight
                    ? 'bg-[#76b69a] text-white shadow-[0_16px_32px_-8px_rgba(118,182,154,0.55)] hover:shadow-[0_20px_40px_-8px_rgba(118,182,154,0.6)]'
                    : 'bg-gray-900 text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.2)]'
                }`}
              >
                開始 14 天免費試用
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
