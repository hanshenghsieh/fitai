import type { ZaiJianLine } from '@/lib/copy/zaijian'
import type { FrequentFood } from '@/lib/food-memory'

/** 預測，不聊天 — 從常吃模式 + 星期節奏 */
export function getFoodPrediction(
  frequent: FrequentFood[],
  dayOfWeek: number
): ZaiJianLine | null {
  const top = frequent.filter(f => f.count > 0).sort((a, b) => b.count - a.count)[0]
  const name = top?.name

  if (dayOfWeek === 4) {
    return {
      text: '今天聚餐機率比較高。',
      expression: 'normal',
      subtext: '午餐正常就好。剩下交給我。',
    }
  }

  if (dayOfWeek === 6) {
    return {
      text: '最近週日下午比較容易嘴饞。',
      expression: 'normal',
      subtext: '我幫你留了一些空間。',
    }
  }

  if (name && (name.includes('蔥油餅') || name.includes('下午茶') || name.includes('奶茶'))) {
    return {
      text: `最近幾週下午都會吃${name}。`,
      expression: 'normal',
      subtext: '我幫你留了一點空間。',
    }
  }

  if (dayOfWeek === 1 && top) {
    return {
      text: '週一照常過。',
      expression: 'normal',
      subtext: `你常吃${top.name}，一鍵就能記。`,
    }
  }

  return null
}

export function getFoodMemoryGreeting(): ZaiJianLine {
  return {
    text: '今天吃了什麼？',
    expression: 'normal',
    subtext: '跟我說就好。我來幫你處理。',
  }
}
