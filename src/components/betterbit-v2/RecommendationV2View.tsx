'use client'

import { Sparkles } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import V2Card from './V2Card'
import V2SectionTitle from './V2SectionTitle'
import V2NutrientTile from './V2NutrientTile'

export interface RecommendationItem {
  id: string
  name: string
  tag?: string
  kcal: number
  proteinG: number
  reason?: string
  imageUrl?: string | null
  onSelect?: () => void
}

interface Props {
  items: RecommendationItem[]
  caloriesLogged: number
  caloriesTarget: number
  proteinLogged: number
  proteinTarget: number
  fatLogged: number
  fatTarget: number
  onRoll?: () => void
  rolling?: boolean
}

function DiceVisual({ onClick, rolling }: { onClick?: () => void; rolling?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={rolling}
      className="mx-auto block relative w-[160px] h-[160px] touch-manipulation disabled:opacity-60"
      aria-label="點擊骰子推薦一餐"
    >
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{ background: 'radial-gradient(circle, rgba(82,168,85,0.15) 0%, transparent 70%)' }}
      />
      <div
        className="relative w-full h-full rounded-[28px] flex items-center justify-center text-[56px] shadow-lg"
        style={{ background: BB_V2.bg.card, border: `2px solid ${BB_V2.border}` }}
      >
        🎲
      </div>
    </button>
  )
}

export default function RecommendationV2View({
  items,
  caloriesLogged,
  caloriesTarget,
  proteinLogged,
  proteinTarget,
  fatLogged,
  fatTarget,
  onRoll,
  rolling,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2 pt-2">
        <div className="flex items-center justify-center gap-1.5">
          <Sparkles className="h-4 w-4" style={{ color: BB_V2.accent.green }} />
          <h2 className="text-[18px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
            推薦今天吃什麼？
          </h2>
        </div>
        <p className="text-[13px] px-4" style={{ color: BB_V2.text.secondary }}>
          依據你的目標與剩餘熱量，為你挑選最適合的選擇
        </p>
      </div>

      <DiceVisual onClick={onRoll} rolling={rolling} />
      <p className="text-center text-[13px]" style={{ color: BB_V2.text.muted }}>
        👆 點擊骰子，為你推薦一餐！
      </p>

      {items.length > 0 && (
        <div>
          <V2SectionTitle>為你推薦</V2SectionTitle>
          <div className="space-y-3">
            {items.map(item => (
              <V2Card key={item.id} padding="12px" onClick={item.onSelect}>
                <div className="flex gap-3 items-center">
                  <div
                    className="w-16 h-16 rounded-2xl shrink-0 bg-cover bg-center"
                    style={{
                      backgroundColor: BB_V2.bg.pill,
                      backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] truncate" style={{ fontWeight: 600 }}>
                        {item.name}
                      </p>
                      {item.tag && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: BB_V2.bg.softGreen, color: BB_V2.accent.green, fontWeight: 600 }}
                        >
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] mt-1 tabular-nums" style={{ color: BB_V2.text.secondary }}>
                      {Math.round(item.kcal)} kcal · {Math.round(item.proteinG)} g 蛋白質
                    </p>
                    {item.reason && (
                      <p className="text-[12px] mt-1 line-clamp-2" style={{ color: BB_V2.text.muted }}>
                        {item.reason}
                      </p>
                    )}
                  </div>
                </div>
              </V2Card>
            ))}
          </div>
        </div>
      )}

      <V2Card padding="16px">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 600 }}>
            今日營養目標進度
          </p>
          <span className="text-[12px]" style={{ color: BB_V2.text.muted }}>
            查看詳情 ›
          </span>
        </div>
        <div className="flex gap-2">
          <V2NutrientTile title="熱量" current={caloriesLogged} target={caloriesTarget} unit="kcal" />
          <V2NutrientTile title="蛋白質" current={proteinLogged} target={proteinTarget} />
          <V2NutrientTile title="脂肪" current={fatLogged} target={fatTarget} color={BB_V2.macro.fat} />
        </div>
      </V2Card>
    </div>
  )
}
