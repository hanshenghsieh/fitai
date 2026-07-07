import type { MealType } from '@/lib/checkin-utils'

import type { TodayMealState } from '@/lib/engines/next-meal-engine'

import {

  getDishTemplateById,

  getDishTemplates,

  getVariantsForTemplate,

} from './catalog'

import { enrichBrandItemsForTemplate } from './brand-enrichment'

import { buildDishRecommendationReasons, dishDataNote } from './reason-copy'

import { pickBestVariantForDay, scoreDishTemplateForUserDay, sortBrandItemsByTrust } from './score'

import type { DishRecommendationResult, DishTemplate } from './types'

import { getBrandItemsForTemplate as getSeedBrandItemsForTemplate } from './catalog'
import { templateRequiresSpecificVariant } from './display'



export const USE_DISH_FIRST_RECOMMENDATION = true



export interface DishRecommendationQueueState {

  recentlyShownTemplateIds: string[]

  cursor: number

}



const TOP_POOL_SIZE = 12



function mealTimeBoost(template: DishTemplate, mealType: MealType): number {

  const breakfast = ['早餐', '蛋餅', '飯糰', '吐司', '豆漿', '拿鐵']

  const light = ['沙拉', '雞胸', '茶葉蛋', '地瓜']

  const name = template.name + template.category + template.tags.join('')

  if (mealType === 'breakfast') {

    if (breakfast.some(k => name.includes(k))) return 18

    if (template.foodType === 'drink' || template.foodType === 'staple') return 10

    return -8

  }

  if (mealType === 'lunch' || mealType === 'dinner') {

    if (light.some(k => name.includes(k)) && template.typicalCalories.mid <= 450) return 4

    if (template.foodType === 'meal') return 8

    if (template.tags.includes('高蛋白')) return 6

  }

  return 0

}



function pickTemplateFromPool(

  ranked: Array<{ template: DishTemplate; score: number }>,

  recentlyShown: string[],

  seed: number

): { template: DishTemplate; nextRecently: string[] } | null {

  if (!ranked.length) return null



  let pool = ranked

  const recentSet = new Set(recentlyShown)

  let candidates = pool.filter(entry => !recentSet.has(entry.template.id))



  if (candidates.length === 0) {

    candidates = pool

    recentlyShown = []

  }



  const topPool = candidates.slice(0, TOP_POOL_SIZE)

  const idx = Math.abs(seed) % topPool.length

  const picked = topPool[idx]

  if (!picked) return null



  const nextRecently = [...new Set([...recentlyShown, picked.template.id])].slice(-16)

  return { template: picked.template, nextRecently }

}



export function rollDishFirstRecommendation(params: {

  meal_type: MealType

  day_state: TodayMealState

  exclude_template_ids?: string[]

  seed?: number

  queue_state?: DishRecommendationQueueState | null

}): {

  result: DishRecommendationResult | null

  queue_state: DishRecommendationQueueState

  pool_exhausted: boolean

} {

  const emptyQueue = params.queue_state ?? { recentlyShownTemplateIds: [], cursor: 0 }



  if (!params.day_state.allowDiceAndSuggest) {

    return { result: null, queue_state: emptyQueue, pool_exhausted: true }

  }



  const exclude = new Set(params.exclude_template_ids ?? [])

  const recently = [...(params.queue_state?.recentlyShownTemplateIds ?? [])]

  const templates = getDishTemplates().filter(t => !exclude.has(t.id))



  const ranked = templates

    .map(template => ({

      template,

      score:

        scoreDishTemplateForUserDay(template, params.day_state).total +

        mealTimeBoost(template, params.meal_type),

    }))

    .sort((a, b) => b.score - a.score)



  const seed = params.seed ?? Date.now()

  const picked = pickTemplateFromPool(ranked, recently, seed + (params.queue_state?.cursor ?? 0))

  if (!picked) {

    return { result: null, queue_state: emptyQueue, pool_exhausted: true }

  }



  const template = picked.template

  const variants = getVariantsForTemplate(template.id)

  let variant = pickBestVariantForDay(variants, template, params.day_state)
  if (templateRequiresSpecificVariant(template) && variants.length > 0 && !variant) {
    variant = variants[0]!
  }

  const score = scoreDishTemplateForUserDay(template, params.day_state, variant)

  const seedBrands = getSeedBrandItemsForTemplate(template.id)

  const brandItems = sortBrandItemsByTrust(enrichBrandItemsForTemplate(template, seedBrands))

  const copy = buildDishRecommendationReasons({ template, variant, day: params.day_state })



  const result: DishRecommendationResult = {

    template,

    variant,

    brandItems,

    score,

    reasons: copy.reasons,

    benefitPoints: copy.benefitPoints,

    eatingTips: copy.eatingTips,

    dataNote: dishDataNote(template),

  }



  const nextCursor = (params.queue_state?.cursor ?? 0) + 1

  return {

    result,

    queue_state: {

      recentlyShownTemplateIds: picked.nextRecently,

      cursor: nextCursor,

    },

    pool_exhausted: ranked.length <= 1,

  }

}



export function getBrandItemsForTemplateResolved(templateId: string): ReturnType<typeof enrichBrandItemsForTemplate> {

  const template = getDishTemplateById(templateId)

  if (!template) return []

  return sortBrandItemsByTrust(

    enrichBrandItemsForTemplate(template, getSeedBrandItemsForTemplate(templateId))

  )

}


