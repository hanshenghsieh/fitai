'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatEatOutStoreLine } from '@/lib/eat-out-builder'
import { buildTrustFromSuggestion } from '@/lib/meal-trust-copy'
import type { HighlightKey, MealSuggestion } from '@/lib/meal-engine-types'
import { TODAY } from '@/lib/today-design'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { MealType } from '@/lib/checkin-utils'
import type { LifeEventMode, WorkSchedule } from '@/lib/human-mode'

interface Props {
  items: ConvenienceItem[]
  mealType?: MealType
  schedule?: WorkSchedule
  lifeEvent?: LifeEventMode | null
  prefersCook?: boolean
  highlightKey?: HighlightKey
  highlightPriceMeta?: MealSuggestion['highlight_price_meta']
  debugReason?: string
}

export default function DiceMealPreview({
  items,
  mealType = 'lunch',
  schedule = 'standard',
  lifeEvent,
  prefersCook,
  highlightKey = 'balanced',
  highlightPriceMeta,
  debugReason,
}: Props) {
  const [trustOpen, setTrustOpen] = useState(false)
  if (!items.length) return null

  const totalCal = items.reduce((s, i) => s + (i.calories ?? 0), 0)
  const totalPro = items.reduce((s, i) => s + (i.protein_g ?? 0), 0)
  const stores = [...new Set(items.map(i => i.store))]
  const storeLine =
    stores.length === 1
      ? formatEatOutStoreLine(items[0]!)
      : formatEatOutStoreLine(items.find(i => !/可樂|雪碧|紅茶|綠茶|咖啡|豆漿|奶茶/.test(i.name)) ?? items[0]!)
  const trustCtx = {
    mealType,
    schedule,
    lifeEvent,
    isConvenience: !prefersCook,
    isCook: prefersCook,
    storeNames: stores,
  }
  const trust = buildTrustFromSuggestion(highlightKey, items, trustCtx, highlightPriceMeta)

  return (
    <div className="space-y-6 py-2" style={{ fontFamily: TODAY.font }}>
      <p className="text-[14px] px-0.5" style={{ color: TODAY.mocha, fontWeight: 600 }}>
        {storeLine}
      </p>

      <ul className="space-y-7">
        {items.map((item, i) => (
          <li key={`${item.id}-${i}`} className="space-y-1.5">
            <p className="text-[17px] leading-snug" style={{ color: TODAY.text, fontWeight: 500 }}>
              {item.name}
            </p>
            <p className="text-[15px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
              {item.calories} kcal · 蛋白質 {item.protein_g}g
            </p>
          </li>
        ))}
      </ul>

      <p className="text-[15px] pt-2" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
        合計 {totalCal} kcal · {Math.round(totalPro)}g 蛋白
      </p>

      <button
        type="button"
        onClick={() => setTrustOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 py-2.5 px-0"
      >
        <span className="text-[14px]" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>
          為什麼這餐？
        </span>
        {trustOpen ? (
          <ChevronUp className="w-4 h-4 shrink-0" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.textSecondary }} />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.textSecondary }} />
        )}
      </button>
      {trustOpen && (
        <div className="pt-1 pb-2 space-y-1">
          <p className="text-[15px]" style={{ color: TODAY.text, fontWeight: 500 }}>{trust.title}</p>
          <p className="text-[14px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            {trust.body}
          </p>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && debugReason && (
        <pre
          className="text-[11px] leading-relaxed whitespace-pre-wrap px-0.5 pt-2"
          style={{ color: TODAY.textSecondary, fontWeight: 400 }}
        >
          {debugReason}
        </pre>
      )}
    </div>
  )
}
