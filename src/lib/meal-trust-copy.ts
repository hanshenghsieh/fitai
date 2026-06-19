/** 為什麼這餐？— 白話建立信任，不講 TDEE */

import type { MealType } from '@/lib/checkin-utils'
import type { LifeEventMode, WorkSchedule } from '@/lib/human-mode'
import { getMealLabel } from '@/lib/human-mode'

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
