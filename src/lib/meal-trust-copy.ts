/** 為什麼這餐？— 白話建立信任，不講 TDEE */

import type { MealType } from '@/lib/checkin-utils'
import type { LifeEventMode, WorkSchedule } from '@/lib/human-mode'
import { getMealLabel } from '@/lib/human-mode'
import type { HighlightKey, MealSuggestion } from '@/lib/meal-engine-types'
import { HIGHLIGHT_COPY } from '@/lib/meal-engine-types'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'

export interface MealTrustContext {
  mealType: MealType
  schedule?: WorkSchedule
  lifeEvent?: LifeEventMode | null
  isConvenience?: boolean
  isCook?: boolean
  storeNames?: string[]
}

export function buildMealTrustCopy(ctx: MealTrustContext): { title: string; body: string } {
  const meal = getMealLabel(ctx.schedule ?? 'standard', ctx.mealType)

  if (ctx.lifeEvent === 'cheat') {
    return {
      title: '今天不用跟計畫一樣。',
      body: '吃好了就回來。我不會罵你，也不會幫你自責。',
    }
  }
  if (ctx.lifeEvent === 'travel') {
    return {
      title: '出門在外，方便最重要。',
      body: '這餐幫你抓個能買得到、吃得下去的組合。不用完美。',
    }
  }
  if (ctx.lifeEvent === 'family' || ctx.lifeEvent === 'cny') {
    return {
      title: '聚餐日，不用跟別人比。',
      body: '有計畫在，其他餐幫你拉住就好。今天放自己一馬。',
    }
  }
  if (ctx.lifeEvent === 'sick') {
    return {
      title: '生病先休息。',
      body: '這餐選好消化的。好起來再說，不急。',
    }
  }
  if (ctx.lifeEvent === 'stress' || ctx.lifeEvent === 'bad_week') {
    return {
      title: '這週很爛，我懂。',
      body: '不用多想。照這個吃，少一個決定就少一點壓力。',
    }
  }

  if (ctx.isCook) {
    return {
      title: '在家煮，幫你配好了。',
      body: '食材不難找，份量照著做。不想煮再換外食組合。',
    }
  }

  const storeHint =
    ctx.storeNames?.length && ctx.storeNames.length <= 2
      ? `附近${ctx.storeNames.join('、')}買得到。`
      : '便利商店買得到。'

  return {
    title: '今天比較忙。',
    body: `幫你選${storeHint}蛋白質夠、吃得飽、也符合今天目標。你不用自己想。`,
  }
}

const HIGHLIGHT_TITLES: Record<HighlightKey, (store: string) => string> = {
  high_protein: s => `${s}，蛋白質夠`,
  budget_friendly: s => `${s}，預算剛好`,
  calorie_fit: s => `${s}，熱量對今天`,
  light_meal: s => `${s}，比較清爽`,
  preferred_store: s => `你常去的${s}`,
  nearby: s => `${s}，離你近`,
  balanced: s => `${s}這組`,
}

/** 依這一組餐的 highlight + 品項，產生不同的「為什麼這餐」 */
export function buildTrustFromSuggestion(
  highlightKey: HighlightKey,
  items: ConvenienceItem[],
  ctx: MealTrustContext,
  priceMeta?: MealSuggestion['highlight_price_meta']
): { title: string; body: string } {
  const store = items[0]?.store ?? '這間'
  const titleFn = HIGHLIGHT_TITLES[highlightKey] ?? HIGHLIGHT_TITLES.balanced
  const title = titleFn(store)

  const itemHint =
    items.length >= 2
      ? `${items
          .slice(0, 2)
          .map(i => i.name.split(/[·・]/)[0]?.trim())
          .join('、')}，一組剛好。`
      : ''

  let body: string
  if (highlightKey === 'budget_friendly' && priceMeta && priceMeta.saved_vs_median > 0) {
    body = `這組約 ${priceMeta.total_price} 元，比今天同熱量選項平均省約 ${priceMeta.saved_vs_median} 元（平均約 ${priceMeta.pool_median_price} 元），也在 ${priceMeta.budget_max} 元預算內。`
  } else if (highlightKey === 'budget_friendly') {
    const total = items.reduce((s, i) => s + (i.price ?? 0), 0)
    body = total > 0 ? `這組約 ${Math.round(total)} 元，在預算內。` : HIGHLIGHT_COPY.budget_friendly
  } else {
    body = HIGHLIGHT_COPY[highlightKey] ?? HIGHLIGHT_COPY.balanced
  }

  if (itemHint && highlightKey !== 'budget_friendly') body = `${body} ${itemHint}`

  const meal = getMealLabel(ctx.schedule ?? 'standard', ctx.mealType)
  if (ctx.lifeEvent === 'stress' || ctx.lifeEvent === 'bad_week') {
    body = `${body} ${meal}少想一個決定就好。`
  } else if (ctx.lifeEvent === 'travel') {
    body = `${body} 出門也能照著吃。`
  }

  return { title, body }
}

/** 替換掉工程師味的 reasoning */
export function humanizeMealReasoning(
  raw: string | undefined,
  ctx: MealTrustContext
): { title: string; body: string } {
  if (raw && !raw.startsWith('依每日目標') && !raw.startsWith('依自己煮')) {
    return { title: '為什麼這餐？', body: raw }
  }
  return buildMealTrustCopy(ctx)
}
