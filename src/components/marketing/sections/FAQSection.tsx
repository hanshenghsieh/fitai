'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  { q: 'BetterBit 適合誰？', a: '任何想要外食也能控制熱量、卻不想自己算營養素的人都適合使用 BetterBit。' },
  { q: 'AI 辨識準確嗎？', a: 'BetterBit 使用持續更新的台灣在地食物資料庫，並支援手動調整份量，讓估算更貼近實際攝取。' },
  { q: '可以手動調整食物份量嗎？', a: '可以，辨識結果會列出每一項食物，你可以自由調整份量或替換品項。' },
  { q: '需要每天記錄嗎？', a: '不需要，但每天記錄能讓 BetterBit 給你的建議更精準。' },
  { q: '有 14 天免費試用嗎？', a: '有，所有方案皆提供 14 天免費試用，試用期間可隨時取消。' },
  { q: '如何取消訂閱？', a: '可以隨時在裝置的訂閱管理頁面取消，取消後仍可使用至當期結束。' },
] as const

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-24 lg:py-36">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
          常見問題
        </h2>

        <div className="mt-14 flex flex-col gap-3 lg:mt-16">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-gray-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-gray-900">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-gray-400 transition-transform duration-300 ease-out ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm leading-relaxed text-gray-500">{faq.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
