'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import BetterBitLogo from '@/components/brand/BetterBitLogo'

const APP_STORE_URL = '#'

const NAV_LINKS = [
  { label: '首頁', href: '#hero' },
  { label: '功能介紹', href: '#features' },
  { label: '怎麼運作', href: '#how-it-works' },
  { label: '方案價格', href: '#pricing' },
  { label: '常見問題', href: '#faq' },
  { label: '部落格', href: '#' },
] as const

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
        <a href="#hero" className="flex items-center gap-2.5">
          <BetterBitLogo size={28} />
          <span className="text-lg font-semibold tracking-tight text-gray-900">BetterBit</span>
        </a>

        <nav className="hidden items-center gap-9 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-gray-500 transition-colors duration-200 hover:text-gray-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:block">
          <a
            href={APP_STORE_URL}
            className="rounded-full bg-[#76b69a] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(118,182,154,0.35)] transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_6px_20px_rgba(118,182,154,0.45)]"
          >
            App Store 下載
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center justify-center rounded-full p-2 text-gray-700 lg:hidden"
          aria-label={menuOpen ? '關閉選單' : '開啟選單'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-6 py-5 lg:hidden">
          <nav className="flex flex-col gap-5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-gray-700 transition-colors duration-200 hover:text-gray-900"
              >
                {link.label}
              </a>
            ))}
            <a
              href={APP_STORE_URL}
              className="mt-2 rounded-full bg-[#76b69a] px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_2px_10px_rgba(118,182,154,0.35)]"
            >
              App Store 下載
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
