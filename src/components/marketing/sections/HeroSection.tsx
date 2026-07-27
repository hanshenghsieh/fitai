import { Star } from 'lucide-react'
import PhoneMockup from '../ui/PhoneMockup'

const APP_STORE_URL = '#'

export default function HeroSection() {
  return (
    <section id="hero" className="mx-auto max-w-6xl px-6 pb-24 pt-20 lg:px-8 lg:pb-40 lg:pt-28">
      <div className="grid items-center gap-16 lg:grid-cols-[6fr_5fr] lg:gap-12">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-gray-950 sm:text-6xl lg:text-7xl">
            外食減脂，
            <br />
            <span className="text-[#76b69a]">不用自己算。</span>
          </h1>
          <p className="mx-auto mt-7 max-w-md text-lg leading-relaxed text-gray-500 lg:mx-0">
            拍下每一餐，BetterBit 幫你估算熱量與營養，
            <br className="hidden lg:block" />
            並告訴你今天接下來怎麼吃。
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 lg:items-start">
            <a
              href={APP_STORE_URL}
              className="rounded-full bg-[#76b69a] px-10 py-[1.15rem] text-base font-semibold text-white shadow-[0_16px_32px_-8px_rgba(118,182,154,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_20px_40px_-8px_rgba(118,182,154,0.6)]"
            >
              App Store 下載
            </a>
            <p className="text-sm text-gray-400">14 天免費試用．隨時可取消</p>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 lg:justify-start">
            <div className="flex text-[#76b69a]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={18} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <span className="text-sm text-gray-500">4.8．來自 1,200+ 用戶評價</span>
          </div>
        </div>

        <div className="relative flex items-center justify-center lg:justify-end">
          <PhoneMockup
            src="/marketing/hero-dashboard.png"
            alt="BetterBit 今日儀表板"
            priority
            className="relative z-10 w-48 sm:w-64 lg:w-72"
          />
          <PhoneMockup
            src="/marketing/hero-analysis.png"
            alt="BetterBit AI 食物分析"
            className="relative z-0 -ml-10 w-48 translate-y-14 transition-[transform] duration-[350ms] ease-[ease] hover:z-20 hover:!-translate-x-15 hover:!-translate-y-3 sm:-ml-14 sm:w-64 sm:translate-y-16 lg:-ml-16 lg:w-72"
          />
        </div>
      </div>
    </section>
  )
}
