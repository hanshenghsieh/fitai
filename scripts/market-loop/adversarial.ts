import type { ExpertReview, LoopAggregate } from './types'

export function adversarialReview(agg: LoopAggregate): ExpertReview[] {
  const subRate = agg.results.filter(r => r.outcome === 'subscribed' || r.outcome === 'churned_sub').length / agg.results.length
  const d30 = agg.results.filter(r => r.milestones.d30).length / agg.results.length

  return [
    { role: 'Apple HIG designer', verdict: 'fail', attack: '資訊層級仍偏工程師；試用與付費狀態不夠安靜。' },
    { role: 'Noom PM', verdict: 'partial', attack: 'Adherence engine 是行為迴圈雛形，但缺可見進度糖與每週反思。' },
    { role: 'Behavior psychologist', verdict: 'partial', attack: `d30 僅 ~${pct(d30)}；present bias 在 D3 仍靠文案不是感受。` },
    { role: 'Nutrition scientist', verdict: 'pass-niche', attack: '外食 KB 可辯護；家庭共餐與自己煮仍是 TAM 黑洞。' },
    { role: 'Exercise scientist', verdict: 'partial', attack: '運動 bank 有概念但 wearable 未接，夜班運動建議仍弱。' },
    { role: 'Retention expert', verdict: subRate < 0.12 ? 'fail' : 'partial', attack: `訂閱率 ${pct(subRate)}；平台期與試用 cliff 仍是最大漏桶。` },
    { role: 'Consumer psychologist', verdict: 'partial', attack: '500 錨定在「又一個訂閱」不是「少煩一個決定」。' },
    { role: 'Luxury brand designer', verdict: 'fail', attack: '再健可愛但高收入專業族要 neutral/clinical 選項。' },
    { role: 'YC partner', verdict: 'partial', attack: 'LTV 靠窄眾；缺 annual / B2B 前 mass market 不成立。' },
    { role: 'Busy office woman', verdict: 'partial', attack: '骰子有幫助但 onboarding 仍像考試。' },
    { role: 'Night shift nurse', verdict: agg.product.has_night_shift_timeline ? 'partial' : 'fail', attack: '時間軸有改善但運動與睡眠數據未接。' },
    { role: 'Mother with children', verdict: 'fail', attack: '個人便當邏輯；家庭一餐不是 app 語言。' },
    { role: 'Low-discipline user', verdict: 'partial', attack: 'Adherence 不罵人是對的；但仍要開 app 才會被接住。' },
    { role: 'Former MyFitnessPal user', verdict: 'fail', attack: '缺條碼與快速記錄；搜尋+log 比骰子慢。' },
    { role: 'Former Noom user', verdict: 'partial', attack: '沒有 lesson 結構；平台期只靠一句話不夠。' },
    { role: 'User who hates tracking', verdict: 'partial', attack: '「照著做」仍要記食物；全自動 Health 未啟用是硬傷。' },
  ]
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

export function topPatterns(map: Map<string, number>, n: number) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
}

export function thresholdVerdict(count: number, text: string): string {
  if (count >= 200) return `🔴 REDESIGN — ${text} (${count})`
  if (count >= 100) return `🟠 REDESIGN — ${text} (${count})`
  if (count >= 50) return `🟡 INVESTIGATE — ${text} (${count})`
  if (count >= 5) return `⚪ RECORD — ${text} (${count})`
  return `— ${text} (${count})`
}
