import { Utensils, Clock, TrendingUp, Compass } from 'lucide-react'

const POINTS = [
  { icon: Utensils, title: '不知道外食熱量', desc: '外食到底有多少熱量，全靠猜' },
  { icon: Clock, title: '每天算熱量太麻煩', desc: '手動記錄、查表太花時間' },
  { icon: TrendingUp, title: '吃多了不知道怎麼調整', desc: '今天吃多了，不知道明天怎麼辦' },
  { icon: Compass, title: '一般 App 只記錄，沒有下一步', desc: '只告訴你吃了多少，沒有具體建議' },
] as const

export default function ValueSection() {
  return (
    <section className="bg-[#faf9f6] py-24 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-bold tracking-tight text-balance text-gray-950 sm:text-4xl lg:text-5xl">
          你不是不自律，你只是缺少正確的工具
        </h2>

        <div className="mt-16 grid grid-cols-2 gap-5 lg:mt-20 lg:grid-cols-4 lg:gap-8">
          {POINTS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-center rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-[0_2px_16px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(0,0,0,0.07)] lg:p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#76b69a]/10 text-[#76b69a]">
                <Icon size={22} />
              </div>
              <h3 className="mt-5 text-sm font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
