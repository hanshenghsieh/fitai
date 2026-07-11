'use client'

import { ChevronRight, Crown } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  subscribed: boolean
  onClick: () => void
}

export default function V2SettingsProCard({ subscribed, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="v2-settings-pro-card w-full text-left flex items-center gap-3 px-6 min-h-[104px] rounded-[28px] touch-manipulation v2-settings-stagger"
      style={{
        background: `linear-gradient(135deg, ${BB_V2.bg.softGreen} 0%, rgba(255,255,255,0.92) 100%)`,
        border: `1px solid ${BB_V2.accent.greenSoftBorder}`,
        boxShadow: '0 10px 30px rgba(18, 61, 36, 0.06)',
      }}
    >
      <div
        className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(145deg, ${BB_V2.accent.green} 0%, #2d6b31 100%)`,
          boxShadow: '0 4px 12px rgba(47, 143, 53, 0.28)',
        }}
      >
        <Crown className="h-6 w-6 text-white" strokeWidth={BB_V2.iconStroke} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[16px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
          {subscribed ? 'Betterbit Pro 使用中' : '升級 Betterbit Pro'}
        </p>
        <p className="text-[13px] mt-0.5" style={{ color: BB_V2.text.secondary }}>
          {subscribed ? '你已解鎖完整減脂工具' : '解鎖完整減脂工具'}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0" style={{ color: BB_V2.text.muted }} />
    </button>
  )
}
