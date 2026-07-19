'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { TODAY } from '@/lib/today-design'
import type { MealSuggestion } from '@/lib/meal-engine-types'
import {
  brandSourceLabel,
  formatBrandItemLine,
  formatCalorieRange,
  formatFatRange,
  formatProteinRange,
} from '@/lib/recommendation/dish-first/adapter'
import { resolveBrandDisplayGroups } from '@/lib/recommendation/dish-first/brand-display'
import { getVariantsForTemplate } from '@/lib/recommendation/dish-first/catalog'
import {
  eatingTipsForRecommendation,
  recommendationCategoryLine,
  recommendationDisplayName,
  templateRequiresSpecificVariant,
} from '@/lib/recommendation/dish-first/display'
import {
  dishFitsRemainingNutrition,
  scoreDishVariantForUserDay,
} from '@/lib/recommendation/dish-first/score'
import type { DishVariant, BrandItem } from '@/lib/recommendation/dish-first/types'
import type { TodayMealState } from '@/lib/engines/next-meal-engine'
import {
  foodAllowedByDiet,
  type DietaryPreferenceContext,
} from '@/lib/recommendation/dietary-preference-filter'

interface Props {
  suggestion: MealSuggestion
  dayState: TodayMealState
  selectedVariantId?: string | null
  onSelectVariant?: (variantId: string | null) => void
  onSelectBrand?: (brand: BrandItem) => void
  brandLogging?: boolean
  coachBullets?: string[]
  dietaryPreferences?: DietaryPreferenceContext | null
}

const BRAND_PREVIEW_COUNT = 4

export default function DishRecommendationCard({
  suggestion,
  dayState,
  selectedVariantId,
  onSelectVariant,
  onSelectBrand,
  brandLogging = false,
  coachBullets = [],
  dietaryPreferences,
}: Props) {
  const dish = suggestion.dish_recommendation
  const [brandsExpanded, setBrandsExpanded] = useState(false)
  const dishAllowed =
    !!dish &&
    foodAllowedByDiet(dish.template, dietaryPreferences) &&
    (!dish.variant || foodAllowedByDiet(dish.variant, dietaryPreferences))

  const variants = useMemo(
    () =>
      dishAllowed && dish
        ? getVariantsForTemplate(dish.template.id).filter(
            variant =>
              foodAllowedByDiet(variant, dietaryPreferences) &&
              dishFitsRemainingNutrition(dish.template, dayState, variant)
          )
        : [],
    [dishAllowed, dish, dayState, dietaryPreferences]
  )
  const activeVariant = useMemo(() => {
    if (!dish) return null
    const id = selectedVariantId ?? dish.selectedVariantId ?? dish.variant?.id ?? null
    const fallbackVariant =
      dish.variant && foodAllowedByDiet(dish.variant, dietaryPreferences) ? dish.variant : null
    return variants.find(v => v.id === id) ?? fallbackVariant
  }, [dish, selectedVariantId, variants, dietaryPreferences])

  const brandGroups = useMemo(() => {
    if (!dish) return []
    const fatLimit =
      dayState.remainingFat <= 0 ? 12 : Math.max(12, dayState.remainingFat * 1.1)
    return resolveBrandDisplayGroups({
      template: dish.template,
      selectedVariant: activeVariant,
      variants,
      brandItems: dish.brandItems,
    })
      .map(group => ({
        ...group,
        items: group.items.filter(
          item =>
            foodAllowedByDiet(
              { name: item.itemName, aliases: item.aliases, tags: item.tags },
              dietaryPreferences
            ) &&
            Number.isFinite(item.calories) &&
            item.calories > 0 &&
            item.calories <= dayState.remainingCalories &&
            item.protein != null &&
            item.protein > 0 &&
            item.fat != null &&
            item.fat <= fatLimit
        ),
      }))
      .filter(group => group.items.length > 0)
  }, [dish, activeVariant, variants, dayState.remainingCalories, dayState.remainingFat, dietaryPreferences])

  const flatBrands = useMemo(() => brandGroups.flatMap(g => g.items), [brandGroups])

  if (!dish || !dishAllowed) return null

  const isSpecific = templateRequiresSpecificVariant(dish.template)
  const title = recommendationDisplayName(dish.template, activeVariant)
  const categoryLine = recommendationCategoryLine(dish.template, activeVariant)
  const calMid = (activeVariant ?? dish.template).typicalCalories.mid
  const proteinRange = formatProteinRange(dish.template, activeVariant)
  const fatRange = formatFatRange(dish.template, activeVariant)
  const reasonBullets = [
    ...dish.reasons.map(r => r.label),
    ...dish.benefitPoints,
    ...coachBullets,
  ]
  const uniqueBullets = [...new Set(reasonBullets.filter(Boolean))].slice(0, 4)
  const eatingTips = eatingTipsForRecommendation(dish)

  const visibleGroups = brandsExpanded
    ? brandGroups
    : brandGroups.slice(0, 2).map(group => ({
        ...group,
        items: group.items.slice(0, Math.max(1, Math.ceil(BRAND_PREVIEW_COUNT / Math.max(brandGroups.length, 1)))),
      }))

  return (
    <div className="space-y-4 py-1" style={{ fontFamily: TODAY.font }}>
      <p className="text-[13px] px-0.5" style={{ color: TODAY.mocha, fontWeight: 600 }}>
        推薦你吃
      </p>

      <div className="space-y-1.5">
        <p
          data-dietary-recommendation-name
          className="text-[22px] leading-snug"
          style={{ color: TODAY.text, fontWeight: 700 }}
        >
          {title}
        </p>
        {categoryLine ? (
          <p className="text-[14px]" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>
            {categoryLine} · 資料庫估算
          </p>
        ) : null}
        {isSpecific && !activeVariant && variants.length > 0 ? (
          <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            差異主要來自湯底、肉品、主食與醬料。
          </p>
        ) : null}
      </div>

      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px]" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>
            {isSpecific ? '你想吃哪種？' : '你想吃哪種？'}
          </p>
          <div className="flex flex-col gap-2">
            {variants.map(variant => {
              const active = (activeVariant?.id ?? null) === variant.id
              const score = scoreDishVariantForUserDay(variant, dish.template, dayState).total
              const deprioritized = score < 0 || /牛奶|麻辣|炸物|控肉|王子麵/.test(variant.name)
              return (
                <VariantChip
                  key={variant.id}
                  variant={variant}
                  active={active}
                  deprioritized={deprioritized && dayState.remainingCalories < 350}
                  onSelect={() => onSelectVariant?.(variant.id)}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-[20px] tabular-nums" style={{ color: TODAY.text, fontWeight: 700 }}>
          約 {calMid} kcal
        </p>
        <p className="text-[14px] tabular-nums leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          常見範圍：{formatCalorieRange(dish.template, activeVariant).replace(' kcal', '')} kcal
          {proteinRange ? ` · 蛋白質：${proteinRange}` : ''}
          {fatRange ? ` · 脂肪：${fatRange}` : ''}
        </p>
      </div>

      {eatingTips.length > 0 && (
        <div className="rounded-2xl px-4 py-3 space-y-1.5" style={{ backgroundColor: TODAY.surface }}>
          <p className="text-[13px]" style={{ color: TODAY.mocha, fontWeight: 600 }}>
            今天建議吃法
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            {eatingTips.join('、')}
          </p>
        </div>
      )}

      <div className="rounded-2xl px-4 py-3 space-y-2" style={{ backgroundColor: TODAY.surface }}>
        <p className="text-[13px]" style={{ color: TODAY.mocha, fontWeight: 600 }}>
          推薦你吃這個，因為：
        </p>
        <ul className="space-y-1.5">
          {uniqueBullets.map(point => (
            <li
              key={point}
              className="text-[13px] leading-relaxed flex gap-2 items-start"
              style={{ color: TODAY.textSecondary, fontWeight: 400 }}
            >
              <Check className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={TODAY.iconStroke} style={{ color: TODAY.mocha }} />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {flatBrands.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[13px] px-0.5" style={{ color: TODAY.textSecondary, fontWeight: 500 }}>
            可參考品牌
            {onSelectBrand ? (
              <span className="text-[12px] ml-1.5" style={{ color: TODAY.mocha, fontWeight: 400 }}>
                · 點品牌直接記錄
              </span>
            ) : null}
          </p>
          {visibleGroups.map(group => (
            <div key={group.label} className="space-y-2">
              {brandGroups.length > 1 || activeVariant ? (
                <p className="text-[12px] px-0.5" style={{ color: TODAY.mocha, fontWeight: 600 }}>
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-2">
                {group.items.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!onSelectBrand || brandLogging}
                      onClick={() => onSelectBrand?.(item)}
                      className="w-full text-left rounded-2xl px-4 py-3 disabled:opacity-40 touch-manipulation active:opacity-90"
                      style={{
                        backgroundColor: TODAY.card,
                        border: onSelectBrand ? '1.5px solid transparent' : undefined,
                      }}
                    >
                      <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: 600 }}>
                        {formatBrandItemLine(item)}
                        {item.isSimilar ? (
                          <span className="text-[12px] ml-1.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                            · 相近選項
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[13px] mt-1 tabular-nums" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
                        約 {item.calories} kcal
                        {item.protein != null ? ` · 蛋白質 ${item.protein}g` : ''}
                      </p>
                      <p className="text-[12px] mt-1" style={{ color: TODAY.mocha, fontWeight: 500 }}>
                        {brandSourceLabel(item)}
                        {item.displayNote && !item.isSimilar ? ` · ${item.displayNote}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {flatBrands.length > BRAND_PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setBrandsExpanded(v => !v)}
              className="flex items-center gap-1 text-[13px] px-1 py-1"
              style={{ color: TODAY.mocha, fontWeight: 500 }}
            >
              {brandsExpanded ? (
                <>
                  收合品牌 <ChevronUp className="h-4 w-4" strokeWidth={TODAY.iconStroke} />
                </>
              ) : (
                <>
                  查看更多品牌 <ChevronDown className="h-4 w-4" strokeWidth={TODAY.iconStroke} />
                </>
              )}
            </button>
          )}
        </div>
      ) : activeVariant ? (
        <div className="rounded-2xl px-4 py-3 space-y-1" style={{ backgroundColor: TODAY.surface }}>
          <p className="text-[13px] leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            目前還沒有這個吃法的品牌資料。你仍可以先用「{activeVariant.name}」的常見估算記錄。
          </p>
        </div>
      ) : (
        <p className="text-[12px] px-0.5 leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          暫無對應品牌資料，先以這種吃法的餐點估算為主。實際熱量會因店家、份量、醬汁而不同。
        </p>
      )}

      {dish.dataNote && (
        <p className="text-[12px] px-0.5 leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
          {dish.dataNote}
        </p>
      )}
    </div>
  )
}

function VariantChip({
  variant,
  active,
  deprioritized,
  onSelect,
}: {
  variant: DishVariant
  active: boolean
  deprioritized: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left rounded-2xl px-4 py-3 w-full"
      style={{
        backgroundColor: active ? 'rgba(196, 120, 74, 0.12)' : TODAY.card,
        border: active ? '1.5px solid rgba(196, 120, 74, 0.35)' : '1.5px solid transparent',
      }}
    >
      <p className="text-[14px]" style={{ color: TODAY.text, fontWeight: active ? 600 : 500 }}>
        {variant.name}
        {deprioritized ? (
          <span className="text-[12px] ml-1.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            · 今天熱量低才建議
          </span>
        ) : variant.variantHint ? (
          <span className="text-[12px] ml-1.5" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            · {variant.variantHint}
          </span>
        ) : null}
      </p>
      <p className="text-[12px] mt-1 tabular-nums" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
        約 {variant.typicalCalories.min}–{variant.typicalCalories.max} kcal
        {variant.typicalFat ? ` · 脂肪約 ${variant.typicalFat.min}–${variant.typicalFat.max}g` : ''}
      </p>
    </button>
  )
}
