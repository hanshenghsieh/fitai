import { Landmark, Dumbbell, Target } from 'lucide-react'
import PhoneMockup from '../ui/PhoneMockup'

const FEATURE_BLOCKS = [
  {
    title: 'AI 幫你選下一餐',
    desc: '根據你的目標與今日飲食狀態，推薦適合你的外食選擇。',
    image: '/marketing/hero-analysis.png',
    imageSide: 'right',
    bg: 'bg-white',
  },
  {
    title: '每日減脂節奏',
    desc: '即時掌握今日剩餘熱量，知道下一餐該怎麼選。',
    image: '/marketing/feature-fat-loss-pace.png',
    imageSide: 'left',
    bg: 'bg-[#f4f7f5]',
  },
  {
    title: '智慧化追蹤',
    desc: '看見自己的變化，讓減脂不再靠猜測。',
    image: '/marketing/feature-progress.png',
    imageSide: 'right',
    bg: 'bg-white',
  },
] as const

const OVERVIEW_ITEMS = [
  { icon: Landmark, label: 'Calorie Bank' },
  { icon: Dumbbell, label: '運動追蹤' },
  { icon: Target, label: '目標管理' },
] as const

export default function FeatureSection() {
  return (
    <section id="features">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 lg:px-8 lg:pb-28 lg:pt-36">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
          不只是記錄，
          <br />
          陪你完成減脂旅程
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-center text-lg leading-relaxed text-gray-500">
          從飲食分析、進度追蹤，到每日調整，
          <br className="hidden sm:block" />
          BetterBit 幫你建立更容易維持的減脂習慣。
        </p>
      </div>

      {FEATURE_BLOCKS.map((block) => (
        <div key={block.title} className={block.bg}>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:gap-20 lg:px-8 lg:py-28">
            <div
              className={`text-center lg:text-left ${block.imageSide === 'left' ? 'lg:order-2' : 'lg:order-1'}`}
            >
              <h3 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">{block.title}</h3>
              <p className="mt-4 text-lg leading-relaxed text-gray-500">{block.desc}</p>
            </div>
            <div
              className={`flex justify-center ${block.imageSide === 'left' ? 'lg:order-1 lg:justify-end' : 'lg:order-2 lg:justify-start'}`}
            >
              <PhoneMockup
                src={block.image}
                alt={block.title}
                className="w-64 hover:!-translate-y-2 sm:w-72 lg:w-80"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {OVERVIEW_ITEMS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-4 rounded-3xl border border-gray-100 bg-white px-6 py-10 text-center shadow-[0_2px_16px_rgba(0,0,0,0.03)]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#76b69a]/10 text-[#76b69a]">
                <Icon size={26} />
              </div>
              <h3 className="text-base font-semibold text-gray-900">{label}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
