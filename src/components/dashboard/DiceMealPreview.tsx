'use client'

import { Check } from 'lucide-react'
import { formatEatOutStoreLine } from '@/lib/eat-out-builder'
import type { MealSuggestion } from '@/lib/meal-engine-types'
import { TODAY } from '@/lib/today-design'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { FoodNutritionStatus } from '@/lib/banks/types'
import {
  confidenceDisclaimer,
  confidenceDisplayLabel,
  formatRecommendationCalories,
  formatRecommendationMacroGrams,
} from '@/lib/recommendation/v2/display-macro'
import type { ConfidenceLevel } from '@/lib/recommendation/v2/types'

export interface MealPreviewItem extends Omit<ConvenienceItem, 'calories' | 'protein_g'> {
  calories: number | null
  protein_g: number | null
  nutrition_status?: FoodNutritionStatus
}

interface Props {
  items: MealPreviewItem[]
  recommendationReasons?: MealSuggestion['recommendation_reason']
  benefitPoints?: string[]
  coachBullets?: string[]
  confidenceLevel?: MealSuggestion['confidence_level']
}

export default function DiceMealPreview({
  items,
  recommendationReasons,
  benefitPoints,
  coachBullets,
  confidenceLevel,
}: Props) {
  if (!items.length) return null

  const stores = [...new Set(items.map(i => i.store))]
  const storeLine =
    stores.length === 1
      ? formatEatOutStoreLine(items[0]!)
      : formatEatOutStoreLine(items.find(i => !/可樂|雪碧|紅茶|綠茶|咖啡|豆漿|奶茶/.test(i.name)) ?? items[0]!)
  const level = confidenceLevel as ConfidenceLevel | undefined
  const primaryItem = items[0]!
  const comboName =
    items.length === 1
      ? primaryItem.name
      : items.map(i => i.name).join(' + ')

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein_g ?? 0),
      fat: acc.fat + (item.fat_g ?? 0),
      carbs: acc.carbs + (item.carbs_g ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )

  const reasonBullets = [
    ...(recommendationReasons ?? []).map(r => r.label),
    ...(benefitPoints ?? []),
    ...(coachBullets ?? []),
  ]
  const uniqueBullets = [...new Set(reasonBullets.filter(Boolean))].slice(0, 3)

  return (
    <div className="space-y-4 py-1" style={{ fontFamily: TODAY.font }}>
      <p className="text-[14px] px-0.5" style={{ color: TODAY.mocha, fontWeight: 600 }}>
        {storeLine}
      </p>

      <div className="space-y-2">
        <p className="text-[18px] leading-snug" style={{ color: TODAY.text, fontWeight: 600 }}>
          {comboName}
        </p>
        {items.length > 1 ? (
          <ul className="space-y-1 pl-0.5">
            {items.map((item, i) => (
              <li key={`${item.id}-${i}`} className="text-[14px]" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                {item.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="text-[20px] tabular-nums" style={{ color: TODAY.text, fontWeight: 700 }}>
          {level ? formatRecommendationCalories(totals.calories, level) : `${totals.calories} kcal`}
        </p>
        <p className="text-[14px] tabular-nums" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          {level
            ? [
                formatRecommendationMacroGrams(totals.protein, '蛋白質', level),
                formatRecommendationMacroGrams(totals.fat, '脂肪', level),
                formatRecommendationMacroGrams(totals.carbs, '碳水', level),
              ].join(' · ')
            : `蛋白質 ${Math.round(totals.protein)}g · 脂肪 ${Math.round(totals.fat)}g · 碳水 ${Math.round(totals.carbs)}g`}
        </p>
      </div>

      {confidenceLevel && (
        <p className="text-[12px] px-0.5" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>
          {confidenceDisclaimer(confidenceLevel) ?? confidenceDisplayLabel(confidenceLevel)}
        </p>
      )}

      <div className="rounded-2xl px-4 py-3 space-y-2" style={{ backgroundColor: TODAY.surface }}>
        <p className="text-[13px]" style={{ color: TODAY.mocha, fontWeight: 600 }}>
          推薦你吃這個，因為：
        </p>
        <ul className="space-y-1.5">
          {uniqueBullets.length > 0 ? (
            uniqueBullets.map(point => (
              <li
                key={point}
                className="text-[13px] leading-relaxed flex gap-2 items-start"
                style={{ color: TODAY.textSecondary, fontWeight: 400 }}
              >
                <Check className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.mocha }} />
                <span>{point}</span>
              </li>
            ))
          ) : (
            <li
              className="text-[13px] leading-relaxed flex gap-2 items-start"
              style={{ color: TODAY.textSecondary, fontWeight: 400 }}
            >
              <Check className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.mocha }} />
              <span>這餐符合你今天的節奏，Betterbit 幫你把外食選擇算清楚。</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
