import PhoneMockup from '../ui/PhoneMockup'

const FEATURES = [
  {
    title: '每日紀錄',
    desc: '一週飲食狀況一目了然，回顧每天的表現',
    image: '/marketing/feature-daily-record.png',
  },
  {
    title: '進度追蹤',
    desc: '清楚掌握自己的進步幅度',
    image: '/marketing/feature-progress.png',
  },
  {
    title: '減脂節奏',
    desc: '依你的步調選擇保守、標準或積極，彈性調整目標',
    image: '/marketing/feature-fat-loss-pace.png',
  },
  {
    title: '熱量銀行',
    desc: '直覺顯示今日剩餘熱量收支，一目了然',
    image: '/marketing/feature-calorie-bank.png',
  },
  {
    title: '營養素分析',
    desc: '蛋白質、碳水、脂肪攝取量都清楚',
    image: '/marketing/feature-nutrition.png',
  },
  {
    title: '運動紀錄',
    desc: '紀錄運動消耗，讓熱量計算更精準',
    image: '/marketing/feature-workout.png',
  },
] as const

export default function FeatureSection() {
  return (
    <section id="features" className="py-24 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
          更多實用功能
        </h2>

        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:mt-20 lg:gap-x-8">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col items-center text-center">
              <PhoneMockup src={feature.image} alt={feature.title} className="w-full max-w-[160px]" />
              <h3 className="mt-5 text-sm font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
