/** Emotional copy — Layer 0 (user-facing execution language) */

export const copy = {
  tagline: '今天不用想太多，照著做就好。',
  decideTitle: '不知道吃什麼？',
  decideButton: '幫我決定',
  decideRolling: '為你配餐中…',
  nearbyGps: '附近 3 公里內',
  nearbyWork: (label: string) => label,
  nearbyFallback: '全台菜單推薦',
  mealOk: '這餐 OK',
  todayMission: '今日任務',
  rollsRemaining: (n: number) => (n > 0 ? `還能換 ${n} 次` : ''),
  rollsExhausted: '照著目前這組吃就好',
  completeToday: '今天做得很好',
  overeat: '沒關係，明天再健一點。',
  restDay: '今天好好休息',
  weekSteady: '本週穩定前進',
  goalDistance: (kg: number) => `距離目標還差 ${kg.toFixed(1)} kg`,
  goalWeek: (n: number) => `減脂第 ${n} 週`,
  greeting: (name: string | null | undefined, time: 'morning' | 'afternoon' | 'evening') => {
    const g = time === 'morning' ? '早安' : time === 'afternoon' ? '午安' : '晚安'
    return name ? `${name}，${g}` : g
  },
} as const

export function summarizeCoachNote(note: string, maxLen = 48): string {
  const first = note.split(/[。！？\n]/)[0]?.trim() ?? note
  if (first.length <= maxLen) return first
  return `${first.slice(0, maxLen)}…`
}

export function greetingTime(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
