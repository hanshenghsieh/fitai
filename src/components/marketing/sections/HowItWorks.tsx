import { ChevronRight } from 'lucide-react'
import PhoneMockup from '../ui/PhoneMockup'

const STEPS = [
  {
    number: '1',
    title: '拍照',
    desc: '拍下你的餐點',
    shot: '拍照取景畫面',
    image: '/marketing/step-camera.png',
  },
  {
    number: '2',
    title: '確認',
    desc: 'AI 辨識食物與營養，你可以輕鬆調整份量',
    shot: 'AI 分析結果',
    image: '/marketing/step-confirm.png',
  },
  {
    number: '3',
    title: '了解',
    desc: '立即知道還能吃多少，並獲得飲食建議',
    shot: '今日飲食建議',
    image: '/marketing/hero-dashboard.png',
  },
] as const

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
          三步驟，輕鬆記錄每一餐
        </h2>

        <div className="mt-16 flex flex-col items-center gap-16 lg:mt-20 lg:flex-row lg:items-start lg:justify-center lg:gap-10">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex flex-col items-center lg:flex-row lg:items-start">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-gray-900">{step.title}</h3>
                <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-gray-500">{step.desc}</p>

                <PhoneMockup src={step.image} alt={step.shot} className="mt-7 w-48 sm:w-52" />
              </div>

              {i < STEPS.length - 1 && (
                <ChevronRight className="mx-2 mt-40 hidden shrink-0 text-gray-300 lg:block" size={28} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
