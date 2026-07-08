import type { FoodLogEntry } from '@/lib/banks/types'
import { homeCookedDraftFromLog } from '@/lib/nutrition/home-cooked/draft-from-log'
import { isCompositeMealLabel, parseMealLabelToDraft, withSuggestedDefaults } from '@/lib/nutrition/home-cooked/parse-meal-label'
import type { HomeCookedMealDraft } from '@/lib/nutrition/home-cooked/types'
import { defaultFoodRecordDraft } from './calculate'
import { foodRecordDraftFromLog } from './draft-from-log'
import { cleanLabelForP0Resolve, resolveP0FoodByLabel } from './resolve-p0-food'
import type { CommonFoodItem, FoodRecordDraft } from './types'

export type PortionContext =
  | { kind: 'p0'; item: CommonFoodItem; draft: FoodRecordDraft; label: string }
  | { kind: 'home_cooked'; draft: HomeCookedMealDraft; label: string }
  | { kind: 'unresolved'; label: string }

export function resolvePortionContextFromLabel(label: string): PortionContext {
  const cleaned = cleanLabelForP0Resolve(label)
  if (!cleaned) return { kind: 'unresolved', label }

  if (!isCompositeMealLabel(cleaned)) {
    const p0 = resolveP0FoodByLabel(cleaned)
    if (p0) {
      return {
        kind: 'p0',
        item: p0,
        draft: defaultFoodRecordDraft(p0),
        label: cleaned,
      }
    }
  }

  const homeDraft = withSuggestedDefaults(parseMealLabelToDraft(cleaned))
  const matched = homeDraft.ingredients.filter(i => i.food_id != null).length
  if (matched > 0) {
    return { kind: 'home_cooked', draft: homeDraft, label: cleaned }
  }

  return { kind: 'unresolved', label: cleaned }
}

export function resolvePortionContextFromLog(log: FoodLogEntry): PortionContext {
  const label = log.display_label ?? log.name
  const draftFromMeta = foodRecordDraftFromLog(log)
  if (!isCompositeMealLabel(label)) {
    const p0 = resolveP0FoodByLabel(label)
    if (p0) {
      return {
        kind: 'p0',
        item: p0,
        draft: draftFromMeta ?? defaultFoodRecordDraft(p0),
        label,
      }
    }
  }

  if (log.home_cooked_meta) {
    const draft = homeCookedDraftFromLog(log)
    const matched = draft.ingredients.filter(i => i.food_id != null).length
    if (matched > 0) {
      return { kind: 'home_cooked', draft, label }
    }
  }

  const homeDraft = withSuggestedDefaults(parseMealLabelToDraft(label))
  const matched = homeDraft.ingredients.filter(i => i.food_id != null).length
  if (matched > 0) {
    return { kind: 'home_cooked', draft: homeDraft, label }
  }

  return { kind: 'unresolved', label }
}

export function hasPortionFlow(label: string): boolean {
  const ctx = resolvePortionContextFromLabel(label)
  return ctx.kind !== 'unresolved'
}
