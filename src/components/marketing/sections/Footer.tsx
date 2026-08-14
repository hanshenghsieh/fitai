import { Mail } from 'lucide-react'
import BetterBitLogo from '@/components/brand/BetterBitLogo'
import { SUPPORT_EMAIL } from '@/lib/support'

const LINK_COLUMNS = [
  {
    title: '產品',
    links: [
      { label: '功能介紹', href: '#features' },
      { label: '怎麼運作', href: '#how-it-works' },
      { label: '方案價格', href: '#pricing' },
    ],
  },
  {
    title: '支援',
    links: [
      { label: '常見問題', href: '#faq' },
      { label: '聯絡我們', href: `mailto:${SUPPORT_EMAIL}?subject=BetterBit%20使用者問題回報` },
      { label: '使用條款', href: '/terms' },
      { label: '隱私權政策', href: '/privacy' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-12 sm:grid-cols-3 lg:gap-8">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <BetterBitLogo size={24} />
              <span className="text-base font-semibold tracking-tight text-gray-900">BetterBit</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              AI 外食減脂助手，幫你輕鬆達成飲食目標。
            </p>
            <div className="mt-5 flex items-center gap-3 text-gray-400">
              <a
                href="https://www.instagram.com/betterbit.tw/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gray-400 text-[9px] font-bold leading-none text-white transition-colors duration-200 hover:bg-gray-600"
              >
                IG
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} aria-label="Email">
                <Mail size={18} className="transition-colors duration-200 hover:text-gray-600" />
              </a>
            </div>
          </div>

          {LINK_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-gray-900">{column.title}</h3>
              <ul className="mt-5 flex flex-col gap-3.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-500 transition-colors duration-200 hover:text-gray-900"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-gray-100 pt-8 text-center text-xs text-gray-400 lg:mt-20">
          © 2026 BetterBit All rights reserved.
        </div>
      </div>
    </footer>
  )
}
