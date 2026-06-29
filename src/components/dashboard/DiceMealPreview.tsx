'use client'

import { formatEatOutStoreLine } from '@/lib/eat-out-builder'
import type { MealSuggestion } from '@/lib/meal-engine-types'
import { TODAY } from '@/lib/today-design'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { FoodNutritionStatus } from '@/lib/banks/types'
import {
  confidenceDisclaimer,
  confidenceDisplayLabel,
  formatRecommendationDetailLine,
  formatRecommendationMacroLine,
  formatRecommendationTotalsLine,
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
  confidenceLevel?: MealSuggestion['confidence_level']
}

export default function DiceMealPreview({
  items,
  recommendationReasons,
  benefitPoints,
  confidenceLevel,
}: Props) {
  if (!items.length) return null

  const stores = [...new Set(items.map(i => i.store))]
  const storeLine =
    stores.length === 1
      ? formatEatOutStoreLine(items[0]!)
      : formatEatOutStoreLine(items.find(i => !/可樂|雪碧|紅茶|綠茶|咖啡|豆漿|奶茶/.test(i.name)) ?? items[0]!)
  const level = confidenceLevel as ConfidenceLevel | undefined

  const itemMacros = (item: MealPreviewItem) => ({
    calories: item.calories ?? 0,
    protein: item.protein_g ?? 0,
    fat: item.fat_g ?? 0,
    carbs: item.carbs_g ?? 0,
  })

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein_g ?? 0),
    }),
    { calories: 0, protein: 0 }
  )

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
              {level
                ? formatRecommendationMacroLine(itemMacros(item), level)
                : `${item.calories ?? '—'} kcal · 蛋白質 ${item.protein_g ?? '—'}g`}
              {item.fat_g != null && item.carbs_g != null ? (
                <span className="block text-[13px] mt-0.5" style={{ opacity: 0.9 }}>
                  {level
                    ? formatRecommendationDetailLine(
                        { fat: item.fat_g, carbs: item.carbs_g },
                        level
                      )
                    : `脂肪 ${Math.round(item.fat_g)}g · 碳水 ${Math.round(item.carbs_g)}g`}
                </span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-[15px] pt-2" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
        {level
          ? formatRecommendationTotalsLine(totals, level)
          : `合計 ${totals.calories} kcal · ${Math.round(totals.protein)}g 蛋白`}
      </p>

      {confidenceLevel && (
        <p className="text-[12px] px-0.5" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>
          {confidenceDisclaimer(confidenceLevel) ?? confidenceDisplayLabel(confidenceLevel)}
        </p>
      )}

      {(recommendationReasons?.length || benefitPoints?.length) ? (
        <div
          className="rounded-2xl px-4 py-3 space-y-2"
          style={{ backgroundColor: TODAY.surface }}
        >
          <p className="text-[13px]" style={{ color: TODAY.mocha, fontWeight: 600 }}>
            推薦你吃這個，因為：
          </p>
          <ul className="space-y-1.5">
            {(recommendationReasons ?? []).map(reason => (
              <li
                key={reason.code}
                className="text-[13px] leading-relaxed flex gap-2"
                style={{ color: TODAY.textSecondary, fontWeight: 400 }}
              >
                <span aria-hidden>✅</span>
                <span>{reason.label}</span>
              </li>
            ))}
            {(benefitPoints ?? []).map(point => (
              <li
                key={point}
                className="text-[13px] leading-relaxed flex gap-2"
                style={{ color: TODAY.textSecondary, fontWeight: 400 }}
              >
                <span aria-hidden>✅</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
