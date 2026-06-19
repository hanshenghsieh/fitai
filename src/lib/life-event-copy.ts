/** 生活事件模式 — 不懲罰，教回軌 */

import type { LifeEventMode } from '@/lib/human-mode'
import type { ZaiJianLine } from '@/lib/copy/zaijian'

export function getLifeEventWelcome(mode: LifeEventMode): ZaiJianLine {
  const map: Record<LifeEventMode, ZaiJianLine> = {
    cheat: {
      text: '亂吃一餐沒什麼。',
      expression: 'normal',
      subtext: '下一餐照著做就好。不用補償，不用餓肚子。',
    },
    travel: {
      text: '出差模式。',
      expression: 'normal',
      subtext: '能買到、吃得下就好。回來再說。',
    },
    family: {
      text: '聚餐日。',
      expression: 'normal',
      subtext: '開心吃。其他餐我幫你拉住。',
    },
    cny: {
      text: '過年嘛。',
      expression: 'eye-roll',
      subtext: '吃。開心。初三回來再說。',
    },
    sick: {
      text: '先休息。',
      expression: 'tired',
      subtext: '吃好消化的。運動先擺一邊。',
    },
    stress: {
      text: '壓力大時別為難自己。',
      expression: 'tired',
      subtext: '照著吃，少一個決定。其他先不管。',
    },
    bad_week: {
      text: '這週很糟，我懂。',
      expression: 'tired',
      subtext: '不用追回度。今天從這一餐重新開始。',
    },
  }
  return map[mode]
}

export function getLifeEventClearLine(): ZaiJianLine {
  return {
    text: '好，回到平常模式。',
    expression: 'normal',
    subtext: '今天照常過。想吃什麼就記。',
  }
}
