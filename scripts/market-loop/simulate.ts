import type { CharacterCard, Competitor, Outcome, ProductModel, SimMetrics, SimResult } from './types'
import { activationEase, productFitScore } from './product-model'

const LIFE_EVENTS = [
  '加班','火鍋','珍奶','炸雞','蛋糕','喝酒','出差','旅行','大夜',
  '生病','生理期','產後疲勞','小孩生病','家庭聚餐','過年','分手','壓力爆吃',
  '平台期','漏記','一週沒運動','睡眠債',
]

const COMPLAINTS = [
  '試用到期還沒瘦','500太貴ChatGPT免費','onboarding太長','不知道為什麼這餐',
  '還是便利商店','自己煮沒顧到','夜班時間仍怪','體重沒動以為壞掉',
  '進度要付費才看得到','不能連Apple Health','拍照不準','骰子還是重複',
  '週回饋填了沒感覺','像智商稅','沒有真人','設定太工程師',
  '老公反對付費','小紅書比較好看','MFP習慣改不了','診所更專業',
  '漏記後不知道怎麼辦','取消訂閱找不到','再健有時煩','生活太忙',
]

const FRICTIONS = [
  'onboarding步驟多','第一次就要填體脂','科學數字嚇到','不知道先點哪',
  '搜尋找不到常吃','骰子載入慢','試用banner像推銷','付費牆太早',
  '週計畫資訊過多','沒有條碼','沒有外送整合','設定找不到輪班',
]

const TRUST_ISSUES = [
  'AI生成不可信','非醫療卻像醫療','熱量估算懷疑','便當買不到',
  '499/500價格','小眾app會倒','隱私擔心','模板感',
]

const CONVERSION_BLOCKERS = [
  '試用內沒瘦','500 vs 手搖一個月','伴侶反對','已付健身房',
  'ChatGPT夠用','年輕人沒預算','訂閱疲勞','退款故事',
]

const RETENTION_BLOCKERS = [
  '平台期','過年破功','出差失效','漏記放棄',
  '生活太忙','重複感','沒進度感','情緒低點',
]

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function fit(c: CharacterCard, p: ProductModel): number {
  let s = productFitScore(p)
  if (c.segment === 'engineer' || c.segment === 'office_man' || c.segment === 'data_lover') s += 0.1
  if (c.diet_habit.includes('外食')) s += 0.06
  if (c.self_discipline >= 7) s += 0.08
  if (c.payment_willingness >= 7 && c.income_monthly_ntd >= 50000) s += 0.05
  if (c.segment === 'night_nurse') s += p.has_night_shift_timeline ? 0.05 : -0.18
  if (c.segment === 'mother' && c.diet_habit.includes('開伙')) s += p.has_family_meal ? 0.08 : -0.1
  if (c.segment === 'tracking_hater') s -= p.has_quick_log ? 0.05 : 0.12
  if (c.segment === 'student' && c.income_monthly_ntd < 25000) s -= 0.1
  if (c.app_fatigue >= 7) s -= 0.08
  if (c.competitor_preference === 'chatgpt') s -= p.has_value_framing ? 0.03 : 0.06
  if (p.has_dice_variants) s += 0.04 * p.dice_diversity
  if (p.has_adherence_engine) s += 0.05
  if (p.paywall_blocks_progress && c.trust_level < 6) s -= 0.06
  return Math.max(0.05, Math.min(0.92, s))
}

function pickCompetitor(c: CharacterCard, r: () => number): Competitor {
  if (r() < 0.35) return c.competitor_preference
  const pool: Competitor[] = ['chatgpt','xiaohongshu','myfitnesspal','nothing','clinic','ozempic']
  return pool[Math.floor(r() * pool.length)]!
}

function onboardingIsLong(p: ProductModel): boolean {
  return p.onboarding_steps > 3 || p.onboarding_friction > 0.28
}

function filteredComplaintPool(p: ProductModel, r: () => number): string[] {
  return COMPLAINTS.filter(c => {
    if (c === 'onboarding太長' && !onboardingIsLong(p)) return false
    if (c === '進度要付費才看得到' && !p.paywall_blocks_progress) return false
    if (c === '不能連Apple Health' && p.has_health_sync) return false
    if ((c === '試用到期還沒瘦' || c.startsWith('試用')) && p.has_early_win && r() > 0.45) return false
    if (c === '500太貴ChatGPT免費' && p.has_value_framing && r() > 0.55) return false
    if (c === '自己煮沒顧到' && p.has_family_meal && r() > 0.5) return false
    if (c === 'MFP習慣改不了' && p.has_quick_log && r() > 0.5) return false
    if (c === '不知道先點哪' && (p.has_first_run_guide || p.has_premium_today_ui) && r() > 0.35) return false
    if (c === '週回饋填了沒感覺' && p.has_premium_week_ui && r() > 0.4) return false
    if (c === '體重沒動以為壞掉' && p.has_premium_progress_ui && p.has_plateau_story && r() > 0.45) return false
    if (c === '進度要付費才看得到' && !p.paywall_blocks_progress && p.has_premium_progress_ui && r() > 0.5) return false
    if (c === '設定太工程師' && p.has_premium_settings_ui && r() > 0.5) return false
    if (c === '取消訂閱找不到' && p.has_premium_settings_ui && r() > 0.45) return false
    if (c === '500太貴ChatGPT免費' && p.has_value_framing && p.has_premium_invitation_ui && r() > 0.6) return false
    if (c === '老公反對付費' && p.has_premium_invitation_ui && r() > 0.35) return false
    return true
  })
}

function filteredFrictions(p: ProductModel): string[] {
  return FRICTIONS.filter(f => {
    if (f === '試用banner像推銷' && p.has_premium_today_ui) return false
    if (f === '不知道先點哪' && (p.has_first_run_guide || p.has_premium_today_ui)) return false
    if (f === '週計畫資訊過多' && p.has_premium_week_ui) return false
    if (f === '設定找不到輪班' && p.has_premium_settings_ui) return false
    return true
  })
}

export function simulateCharacter(c: CharacterCard, p: ProductModel, seed: number): SimResult {
  const r = rng(seed + c.id * 997)
  const f = fit(c, p)
  const milestones = { d1: false, d3: false, d7: false, d14: false, d30: false, d60: false, d90: false, d180: false }
  const life_events: string[] = []
  const complaints: string[] = []
  const delights: string[] = []
  const user_quotes: string[] = [c.unique_quote]

  let trust = c.trust_level
  let confusion = p.onboarding_friction * 8
  let friction = p.onboarding_friction * 7
  if (p.has_premium_today_ui) {
    confusion *= 0.72
    friction *= 0.78
  }
  if (p.has_premium_week_ui) {
    confusion *= 0.96
    friction *= 0.92
  }
  if (p.has_premium_progress_ui) {
    confusion *= 0.95
    friction *= 0.9
  }
  if (p.has_premium_settings_ui) {
    confusion *= 0.97
    friction *= 0.94
  }
  let active = true
  let outcome: Outcome = 'active'
  let quit_day: number | null = null
  let sub_day: number | null = null
  let refund_day: number | null = null
  let return_day: number | null = null
  let competitor: Competitor | null = null
  let opens = 0
  let logs = 0
  let diceUses = 0
  let photoUses = 0
  let searchUses = 0
  let ghost = 0

  const activateThreshold = Math.min(0.82, 0.84 - f * 0.28 + activationEase(p) * 0.22)
  if (r() > activateThreshold) {
    outcome = 'never_activated'
    quit_day = 1
    if (onboardingIsLong(p)) complaints.push('onboarding太長')
    else if (!p.has_first_run_guide && !p.has_premium_today_ui && r() < 0.6) complaints.push('不知道先點哪')
    else if (c.self_discipline <= 3 && c.stress_level >= 8) complaints.push('生活太忙')
    user_quotes.push('打開一次就關了。')
    return buildResult(c, outcome, milestones, { trust, confusion, friction, opens, logs, diceUses, photoUses, searchUses, f, r }, life_events, complaints, delights, user_quotes, quit_day, sub_day, refund_day, return_day, competitor)
  }

  for (let day = 1; day <= 180 && active; day++) {
    if (r() < 0.09) {
      const ev = LIFE_EVENTS[Math.floor(r() * LIFE_EVENTS.length)]!
      life_events.push(`D${day}:${ev}`)
      if (p.has_adherence_engine && ['火鍋','出差','過年','壓力爆吃'].includes(ev)) {
        trust += 0.15
        delights.push('亂吃後再健沒罵')
      } else if (!p.has_adherence_engine) ghost += 2
    }

    const openProb = f * 0.5 + c.self_discipline * 0.04 - c.stress_level * 0.02 - ghost * 0.04
    if (r() < openProb) {
      opens++
      ghost = 0
      markMilestone(milestones, day)
      if (day <= 3) confusion = Math.max(0, confusion - 0.5)
      if (day === 1 && p.has_early_win) { trust += 0.2; delights.push('首頁就有餐點建議') }
      if (day === 1 && p.has_premium_today_ui && r() < 0.55) { trust += 0.1; delights.push('一鍵吃了很順') }
      if (day === 5 && p.has_premium_week_ui && r() < 0.35) { trust += 0.08; delights.push('本週頁像日記') }
      if (day === 12 && p.has_premium_progress_ui && r() < 0.32) { trust += 0.1; delights.push('進度頁讓人安心') }
      if (day === 8 && p.has_premium_settings_ui && r() < 0.28) { trust += 0.06; delights.push('設定很安心') }
      if (day === 13 && p.has_premium_invitation_ui && r() < 0.3) { trust += 0.08; delights.push('會員像邀請') }
      if (day === 3 && p.has_adherence_engine) trust += 0.3
      if (day === 7 && p.has_early_win) { trust += 0.15; delights.push('一週少煩好幾次') }
      if (r() < 0.55) { logs++; if (r() < 0.15) searchUses++ }
      if (r() < 0.12 && p.has_photo_log) photoUses++
      if (r() < 0.28) diceUses++
    } else ghost++

    if (day >= 21 && day <= 40 && r() < 0.28) {
      if (p.has_plateau_story) { trust += 0.25; delights.push('平台期有解釋') }
      else if (!p.has_premium_progress_ui) { trust -= 0.5; complaints.push('體重沒動以為壞掉') }
      else if (r() < 0.15) { trust -= 0.2; complaints.push('體重沒動以為壞掉') }
    }

    if (p.dice_diversity < 0.7 && diceUses > 2 && r() < 0.25) complaints.push('骰子還是重複')
    if (!p.has_health_sync && c.segment === 'data_lover' && day === 10) complaints.push('不能連Apple Health')
    if (p.paywall_blocks_progress && day > 10 && c.trust_level < 7 && r() < 0.2) complaints.push('進度要付費才看得到')

    if (day === p.trial_days && !sub_day) {
      const resist = (p.price_ntd / Math.max(c.income_monthly_ntd, 1)) * 9 + (10 - c.payment_willingness) * 0.08
      const earlyBoost = p.has_early_win ? 0.06 : 0
      const valueBoost = p.has_value_framing ? 0.04 : 0
      const subProb = f * 0.38 + c.payment_willingness * 0.025 - resist + earlyBoost + valueBoost
      const quitProb = 0.58 - earlyBoost * 2 - (p.has_early_win ? 0.08 : 0)

      if (r() < subProb) {
        sub_day = day
        outcome = 'subscribed'
        delights.push('比營養師便宜')
        user_quotes.push('先付一個月看看。')
      } else if (r() < quitProb) {
        active = false
        quit_day = day
        outcome = 'quit'
        if (!p.has_early_win || r() < 0.35) complaints.push(`試用${p.trial_days}天還沒瘦`)
        if (c.income_monthly_ntd < 45000 && (!p.has_value_framing || r() < 0.4)) {
          complaints.push('500太貴ChatGPT免費')
        }
        competitor = pickCompetitor(c, r)
        user_quotes.push('試用結束刪了。')
      }
    }

    if (sub_day && day < sub_day + 14 && r() < 0.07 - f * 0.04) {
      refund_day = day
      outcome = 'refunded'
      active = false
      quit_day = day
      complaints.push('跟ChatGPT差不多')
    }

    if (trust < 2.8 && day > 7 && r() < 0.32) {
      active = false
      quit_day = day
      outcome = 'quit'
      competitor = pickCompetitor(c, r)
    }

    if (!sub_day && day > p.trial_days + 10 && opens < 3 && r() < 0.35) {
      active = false
      outcome = 'ghost'
      quit_day = day
    }
  }

  if (outcome === 'quit' && r() < 0.14 * f) {
    return_day = (quit_day ?? 20) + 15 + Math.floor(r() * 30)
    outcome = 'returned'
    user_quotes.push('又裝回來試試。')
  }

  if (complaints.length < 2 && r() < 0.22) {
    const pool = filteredComplaintPool(p, r)
    if (pool.length) complaints.push(pool[Math.floor(r() * pool.length)]!)
  }
  if (delights.length < 1 && logs > 5) delights.push('不用再想吃什麼')

  return buildResult(c, outcome, milestones, { trust, confusion, friction, opens, logs, diceUses, photoUses, searchUses, f, r }, life_events, complaints, delights, user_quotes, quit_day, sub_day, refund_day, return_day, competitor)
}

function markMilestone(m: SimResult['milestones'], day: number) {
  if (day <= 1) m.d1 = true
  if (day <= 3) m.d3 = true
  if (day <= 7) m.d7 = true
  if (day <= 14) m.d14 = true
  if (day <= 30) m.d30 = true
  if (day <= 60) m.d60 = true
  if (day <= 90) m.d90 = true
  m.d180 = true
}

function buildResult(
  c: CharacterCard,
  outcome: Outcome,
  milestones: SimResult['milestones'],
  ctx: { trust: number; confusion: number; friction: number; opens: number; logs: number; diceUses: number; photoUses: number; searchUses: number; f: number; r: () => number },
  life_events: string[],
  complaints: string[],
  delights: string[],
  user_quotes: string[],
  quit_day: number | null,
  sub_day: number | null,
  refund_day: number | null,
  return_day: number | null,
  competitor: Competitor | null
): SimResult {
  const adherence = Math.min(1, ctx.logs / Math.max(1, ctx.opens * 1.2))
  const metrics: SimMetrics = {
    first_impression: Math.round((10 - ctx.confusion) * 10) / 10,
    confusion: Math.round(ctx.confusion * 10) / 10,
    trust: Math.round(ctx.trust * 10) / 10,
    friction: Math.round(ctx.friction * 10) / 10,
    emotional_response: c.emotional_eating >= 7 ? 4.2 : 6.5,
    food_input_rate: ctx.opens ? ctx.logs / ctx.opens : 0,
    photo_usage: ctx.photoUses,
    search_usage: ctx.searchUses,
    frequent_usage: Math.floor(ctx.logs * (ctx.r() < 0.5 ? 0.45 : 0.3)),
    dice_usage: ctx.diceUses,
    adherence,
    dropout_risk: outcome === 'quit' || outcome === 'ghost' ? 0.85 : 0.2,
    subscription_willingness: c.payment_willingness * ctx.f,
    refund_risk: outcome === 'refunded' ? 0.9 : 0.1,
  }

  return {
    character: c,
    outcome,
    milestones,
    metrics,
    quit_day,
    subscribed_day: sub_day,
    refund_day,
    return_day,
    competitor_switch: competitor,
    life_events: life_events.slice(0, 8),
    complaints: [...new Set(complaints)].slice(0, 6),
    delights: [...new Set(delights)].slice(0, 4),
    user_quotes: user_quotes.slice(0, 5),
    dropout_reason: quit_day ? complaints[0] ?? '自然流失' : sub_day ? '留存' : '—',
    would_recommend: ctx.f > 0.55 && ctx.trust > 5 && (sub_day != null || milestones.d30),
    would_pay_again: sub_day != null && outcome !== 'refunded' && ctx.trust > 5,
  }
}

export function simulateAll(characters: CharacterCard[], product: ProductModel, seed = 0) {
  return characters.map(c => simulateCharacter(c, product, seed))
}

export function aggregateResults(runId: string, product: ProductModel, characters: CharacterCard[], results: SimResult[]) {
  const complaint_counts = new Map<string, number>()
  const delight_counts = new Map<string, number>()
  const friction_counts = new Map<string, number>()
  const trust_counts = new Map<string, number>()
  const conversion_blockers = new Map<string, number>()
  const retention_blockers = new Map<string, number>()
  const competitor_counts = new Map<Competitor, number>()

  for (const res of results) {
    for (const c of res.complaints) bump(complaint_counts, c)
    for (const d of res.delights) bump(delight_counts, d)
    const frictionPool = filteredFrictions(product)
    if (res.metrics.friction >= 5 && frictionPool.length) {
      bump(friction_counts, frictionPool[Math.floor(res.character.id % frictionPool.length)]!)
    }
    if (res.metrics.trust < 5) bump(trust_counts, TRUST_ISSUES[Math.floor(res.character.id % TRUST_ISSUES.length)]!)
    if (!res.subscribed_day && res.quit_day === product.trial_days) {
      if (!product.has_early_win || res.complaints.some(x => x.includes('還沒瘦'))) {
        bump(conversion_blockers, CONVERSION_BLOCKERS[0]!)
      }
    }
    if (res.outcome === 'ghost') bump(retention_blockers, RETENTION_BLOCKERS[3]!)
    if (res.competitor_switch) bump(competitor_counts, res.competitor_switch, 1)
  }

  return {
    run_id: runId,
    product,
    characters,
    results,
    complaint_counts,
    delight_counts,
    friction_counts,
    trust_counts,
    conversion_blockers,
    retention_blockers,
    competitor_counts,
  }
}

function bump(m: Map<string, number>, k: string, n = 1) {
  m.set(k, (m.get(k) ?? 0) + n)
}

export { COMPLAINTS, FRICTIONS, TRUST_ISSUES, CONVERSION_BLOCKERS, RETENTION_BLOCKERS }

export function majorIssues(complaint_counts: Map<string, number>, conversion_blockers: Map<string, number>) {
  const lifeNoise = new Set(['生活太忙'])
  const major: { text: string; count: number; level: 'redesign' | 'investigate' }[] = []
  for (const [text, count] of complaint_counts) {
    if (lifeNoise.has(text)) continue
    if (count >= 100) major.push({ text, count, level: 'redesign' })
    else if (count >= 50) major.push({ text, count, level: 'investigate' })
  }
  for (const [text, count] of conversion_blockers) {
    if (count >= 100) major.push({ text, count, level: 'redesign' })
    else if (count >= 50) major.push({ text, count, level: 'investigate' })
  }
  return major.sort((a, b) => b.count - a.count)
}
