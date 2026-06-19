import type { ZaiJianLine } from '@/lib/copy/zaijian'
import type { InferredEvent } from '@/lib/engines/event-engine'
import type { UserBanks } from '@/lib/banks/types'

export interface CorrectionInput {
  banks: UserBanks
  inferredEvents?: InferredEvent[]
  /** @deprecated use inferredEvents */
  lifeEvent?: string | null
  lastLogDeltaKcal?: number
}

export function getCorrectionMessage(input: CorrectionInput): ZaiJianLine {
  const { banks, inferredEvents = [], lastLogDeltaKcal = 0 } = input

  if (inferredEvents.includes('overeat_today')) {
    return {
      text: '吃得很開心也很好。',
      expression: 'normal',
      subtext: '接下來幾天照常過就好。我幫你調。',
    }
  }
  if (inferredEvents.includes('plateau')) {
    return {
      text: '體重暫時沒動，正常。',
      expression: 'normal',
      subtext: '脂肪還在掉。繼續照常過。',
    }
  }
  if (inferredEvents.includes('missing_days') || inferredEvents.includes('stress_week')) {
    return {
      text: '這週不用完美。',
      expression: 'tired',
      subtext: '照你能做到的就好。剩下交給我。',
    }
  }
  if (inferredEvents.includes('night_shift')) {
    return {
      text: '夜班辛苦了。',
      expression: 'tired',
      subtext: '能吃多少記多少就好。',
    }
  }
  if (inferredEvents.includes('sick_signal')) {
    return {
      text: '先休息。',
      expression: 'tired',
      subtext: '吃好消化的。運動先擺一邊。',
    }
  }
  if (inferredEvents.includes('travel_pattern')) {
    return {
      text: '出門方便最重要。',
      expression: 'normal',
      subtext: '回來再說。',
    }
  }

  const delta = lastLogDeltaKcal
  if (delta >= 2000) {
    return {
      text: '吃得很開心也很好。',
      expression: 'normal',
      subtext: '不用急著補。慢慢回來就好。',
    }
  }
  if (delta >= 500) {
    return {
      text: '不用急著補。',
      expression: 'normal',
      subtext: '慢慢回來就好。我幫你處理。',
    }
  }
  if (delta >= 100) {
    return {
      text: '最近吃得比較開心。',
      expression: 'normal',
      subtext: '今天正常就好。我幫你處理。',
    }
  }

  if (banks.protein.gapG >= 25) {
    return {
      text: '好 choice。',
      expression: 'normal',
      subtext: '睡前喝個豆漿就差不多了。',
    }
  }

  if (banks.exercise.remainingSessions > 0 && banks.exercise.remainingSessions <= 2) {
    return {
      text: '好 choice。',
      expression: 'normal',
      subtext: `這週還有 ${banks.exercise.remainingSessions} 次。找一天補就好。`,
    }
  }

  return {
    text: '好 choice。',
    expression: 'normal',
    subtext: '今天照常過。剩下交給我。',
  }
}

export function getOsGreeting(): ZaiJianLine {
  return {
    text: '今天吃了什麼？',
    expression: 'normal',
    subtext: '跟我說就好。我來幫你處理。',
  }
}
