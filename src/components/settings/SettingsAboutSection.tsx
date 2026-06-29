'use client'

import { colors } from '@/lib/design-system'
import SettingsSection from './SettingsSection'

export default function SettingsAboutSection() {
  return (
    <SettingsSection title="關於 BetterBit">
      <div className="px-4 py-5 space-y-3">
        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          BetterBit 是一款為一般減脂外食族設計的下一餐決策工具。你不需要懂複雜的營養學，也不用每天精準計算每一克食物；BetterBit 會根據你今天剩餘的熱量、蛋白質缺口與飲食狀態，幫你推薦比較不容易破功的外食選擇。
        </p>
        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          無論是便利商店、早餐店、便當、自助餐、滷味或連鎖餐廳，BetterBit 都希望讓你在不知道吃什麼的時候，有一個更簡單、更安心的答案。它不是要限制你的生活，而是幫你在日常外食中，少一點亂猜，多一點掌控。
        </p>
        <p className="text-[12px] pt-2" style={{ color: colors.text.tertiary }}>
          BetterBit · 再健一點
        </p>
      </div>
    </SettingsSection>
  )
}
