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
    title: '快速記錄',
    desc: '也可以輸入菜名或掃描條碼，快速完成記錄',
    shot: '文字輸入或掃描條碼記錄',
    image: '/marketing/step-text-barcode.png',
  },
] as const

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
          三步驟，輕鬆記錄每一餐
        </h2>

        {/* Mobile / tablet: stacked per step (unchanged) */}
        <div className="mt-16 flex flex-col items-center gap-16 lg:hidden">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                {step.number}
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-gray-900">{step.title}</h3>
              <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-gray-500">{step.desc}</p>
              <PhoneMockup src={step.image} alt={step.shot} className="mt-7 w-48 sm:w-52" />
            </div>
          ))}
        </div>

        {/* Desktop: text row and phone row are separate grids so all three
            phones share one bottom baseline regardless of description length */}
        <div className="hidden lg:block">
          <div className="mt-20 grid grid-cols-3 gap-x-20">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-gray-900">{step.title}</h3>
                <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 grid grid-cols-3 items-end gap-x-20">
            {STEPS.map((step, i) => (
              <div key={step.number} className="relative flex items-end justify-center">
                <PhoneMockup src={step.image} alt={step.shot} className="w-48" />
                {i < STEPS.length - 1 && (
                  <ChevronRight
                    className="absolute top-1/2 -right-5 -translate-y-1/2 shrink-0 text-gray-300"
                    size={28}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
