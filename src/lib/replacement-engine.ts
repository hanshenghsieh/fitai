import { eatOutMenu, type ConvenienceItem } from './convenience-store-menu'
import { applyPortion, canAddItem, calcComboTotals, type PortionId, type SelectedEatOutItem } from './eat-out-builder'
import { getFilteredMenu } from './eat-out-filters'
import type { MealType } from './checkin-utils'
import type { UserProfile } from '@/types'
import type { MealTargets } from './meal-engine-types'
import { mealTargetsFromDaily } from './meal-engine-types'

export interface ReplacementOption {
  item: ConvenienceItem
  portion: PortionId
  displayName: string
  delta_calories: number
  delta_protein: number
  reason: string
}

const REPLACEMENT_RULES: Record<string, string[]> = {
  protein: ['茶葉蛋', '滷蛋', '蒸蛋', '煎蛋', '雞胸', '鮭魚', '豆腐', '鯛魚'],
  carb: ['地瓜', '糙米', '白飯', '飯糰', '燒餅'],
  side: ['燙青菜', '沙拉', '滷豆腐', '炒時蔬'],
  drink: ['無糖', '豆漿', '茶'],
}

function inferRole(item: ConvenienceItem): string {
  if (item.role && item.role !== 'combo') return item.role
  if (item.name.includes('飯') || item.tags?.includes('rice')) return 'carb'
  if (item.name.includes('蛋') || item.protein_g >= 15) return 'protein'
  if (item.name.includes('茶') || item.name.includes('飲')) return 'drink'
  if (item.name.includes('菜') || item.name.includes('沙拉')) return 'side'
  return 'protein'
}

function passesAfterReplace(
  selected: SelectedEatOutItem[],
  targets: MealTargets
): boolean {
  const totals = calcComboTotals(selected)
  return (
    totals.calories >= targets.calories * 0.9 &&
    totals.calories <= targets.calories * 1.1 &&
    totals.protein_g >= targets.protein_g * 0.85
  )
}

export function getReplacementOptions(
  mealType: MealType,
  dailyTargets: MealTargets,
  selected: SelectedEatOutItem[],
  replaceIndex: number,
  profile?: UserProfile | null
): ReplacementOption[] {
  const from = selected[replaceIndex]
  if (!from) return []

  const targets = mealTargetsFromDaily(dailyTargets, mealType)
  const role = inferRole(from.item)
  const keywords = REPLACEMENT_RULES[role] ?? REPLACEMENT_RULES.protein!
  const menu = getFilteredMenu(mealType, profile)

  const options: ReplacementOption[] = []

  for (const candidate of menu) {
    if (candidate.id === from.item.id) continue
    if (!keywords.some(k => candidate.name.includes(k))) continue

    for (const portion of ['full', 'half'] as PortionId[]) {
      const trial = selected.map((s, i) =>
        i === replaceIndex ? { item: candidate, portion } : s
      )
      if (!canAddItem(trial.filter((_, i) => i !== replaceIndex), candidate).ok && trial.length > 1) {
        continue
      }
      if (!passesAfterReplace(trial, targets)) continue

      const oldP = applyPortion(from.item, from.portion)
      const newP = applyPortion(candidate, portion)
      options.push({
        item: candidate,
        portion,
        displayName: newP.name,
        delta_calories: newP.calories - oldP.calories,
        delta_protein: Math.round((newP.protein_g - oldP.protein_g) * 10) / 10,
        reason: '仍符合這餐的營養目標',
      })
    }
  }

  return options
    .sort((a, b) => Math.abs(a.delta_calories) - Math.abs(b.delta_calories))
    .slice(0, 8)
}
