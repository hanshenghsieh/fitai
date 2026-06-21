import type { Competitor, Human, HumanResult, Outcome, ProductAssumptions, SimAggregate } from './types'

const COMPLAINTS_POOL = [
  '為什麼又是便利商店？',
  '我自己煮，為什麼一直推外食',
  '夜班打開看到早餐整個不信',
  '試用七天太短，還沒瘦就要錢',
  '500太貴，ChatGPT免費',
  '不知道這餐為什麼選給我',
  '跟減重診所比感覺不專業',
  '體重沒變以為app壞了',
  '不知道平台期是正常',
  '再骰還是同一幾家店',
  '加班後只想躺不想打卡',
  '過年完全用不了',
  '懷孕不敢用',
  '設定太工程師',
  'onboarding太長',
  '週回饋填了沒感覺',
  '不能掃條碼',
  '不能連Apple Health',
  '老公說智商稅',
  '小紅書食譜比較好看',
  '跟免費ChatGPT差不多',
  '退款流程不清楚',
  '499跟500價格不一致',
  '沒有解釋為什麼沒瘦',
  '公司附近買不到推薦的店',
  '食物圖跟實際差很多',
  '沒進度感',
  '不懂為什麼沒瘦',
  '數字看不懂',
]

const DELIGHTS_POOL = [
  '不用再想今天吃什麼',
  '熱量目標清楚',
  '蛋白質有顧到',
  '再健不兇',
  '介面舒服',
  '換一個同熱量很實用',
  '比營養師便宜',
  '不會一直推銷',
  '試用沒綁卡',
  '完成打卡有成就感',
  '外食組合比我想的健康',
  '適合我這種懶人',
  '繁體中文舒服',
  '台灣便利商店情境對',
  '有解釋為什麼這餐',
  '平台期有安慰到',
  '夜班用第一餐標籤合理',
  '自己煮模式終於有了',
  '14天試用比較公平',
  'D3就知道有在幫我',
  '知道還差多少公斤',
  '目標時間看得懂',
]

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function fitScore(h: Human, p: ProductAssumptions): number {
  let s = 0.35
  if (h.segment === 'engineer' || h.segment === 'office_worker') s += 0.18
  if (h.discipline >= 7) s += 0.12
  if (h.mental_model === '相信科學') s += 0.08
  if (h.food_prefs.includes('外食') || h.food_prefs.includes('便利')) s += 0.1
  if (h.income_monthly_ntd >= 50000) s += 0.06
  if (h.segment === 'night_nurse') s += p.has_night_shift_fix ? 0.08 : -0.22
  if (h.food_prefs.includes('開伙') || h.food_prefs.includes('自煮')) s += p.has_home_cook_mode ? 0.05 : -0.15
  if (h.segment === 'student' && h.income_monthly_ntd < 20000) s -= 0.12
  if (h.goal === '稍微瘦' || h.goal === '不知道但想變好') s -= 0.1
  if (h.segment === 'mother') s -= 0.05
  if (p.has_meal_trust) s += 0.06
  if (p.has_plateau_story) s += 0.05
  if (p.has_d3_mini_win) s += 0.04
  if (p.dice_diversity > 0.6) s += 0.04
  if (p.has_goal_visibility) s += 0.05
  if (p.has_plausible_meals) s += 0.04
  if (p.has_food_photo_accuracy) s += 0.03
  if (p.has_luxury_today_ui) s += 0.04
  if (p.has_photo_food_capture) s += 0.05
  if (h.goal === '婚禮前' || h.goal === '健康檢查過關' || h.goal === '減脂') s += p.has_goal_visibility ? 0.04 : -0.03
  s += (p.trial_days - 7) * 0.008
  s -= p.onboarding_friction * 0.1
  return Math.max(0.05, Math.min(0.92, s))
}

function priceResistance(h: Human, p: ProductAssumptions): number {
  const priceRatio = p.price_ntd / Math.max(h.income_monthly_ntd, 1)
  let resist = priceRatio * 8
  if (h.financial === '月底常緊') resist += 0.35
  if (h.diet_history.includes('ChatGPT') || h.mental_model === '半信半疑') resist += 0.15
  return resist
}

function simulateHuman(h: Human, p: ProductAssumptions, seed: number): HumanResult {
  const r = rng(seed + h.id * 997)
  const fit = fitScore(h, p)
  const complaints: string[] = []
  const delights: string[] = []
  const diary: string[] = []

  let trust = 4 + fit * 4 + (h.tech_ability > 6 ? 0.5 : -0.3)
  let active = true
  let subscribed = false
  let quit_day: number | null = null
  let sub_day: number | null = null
  let refund_day: number | null = null
  let return_day: number | null = null
  let outcome: Outcome = 'active'
  let competitor: Competitor | null = null
  let dropout = ''

  const milestones = { d1: false, d3: false, d7: false, d14: false, d30: false, d60: false, d90: false, d180: false }
  let opens = 0
  let ghost_streak = 0

  diary.push(`D1：${h.name}，${h.age}歲，${h.city}${h.occupation}。${h.motivation}。打開app。`)

  if (r() > 0.82 - fit * 0.3) {
    active = false
    outcome = 'never_activated'
    quit_day = 1
    dropout = 'onboarding太長或不懂要幹嘛'
    complaints.push('onboarding太長')
    diary.push('D1：填到一半關掉。')
  }

  for (let day = 1; day <= 180 && active; day++) {
    const lifeRoll = r()
    const lifeEvent = lifeRoll < 0.08 ? h.life_events_pool[Math.floor(r() * h.life_events_pool.length)] : null

    if (lifeEvent) {
      trust -= lifeEvent === '過年' || lifeEvent === '婚禮' ? 0.4 : 0.15
      if (!p.has_life_event_recovery) ghost_streak += 2
      diary.push(`D${day}：${lifeEvent}。${p.has_life_event_recovery ? '用了生活事件模式。' : '沒開app。'}`)
    }

    const openProb = fit * 0.55 + h.discipline * 0.04 - h.stress * 0.02 - ghost_streak * 0.05
    if (r() < openProb) {
      opens++
      ghost_streak = 0
      if (day === 1) milestones.d1 = true
      if (day <= 3) milestones.d3 = true
      if (day <= 7) milestones.d7 = true
      if (day <= 14) milestones.d14 = true
      if (day <= 30) milestones.d30 = true
      if (day <= 60) milestones.d60 = true
      if (day <= 90) milestones.d90 = true
      milestones.d180 = true

      if (day === 3 && p.has_d3_mini_win) {
        trust += 0.5
        delights.push('D3就知道有在幫我')
      }
      if (day >= 7 && day <= 21 && opens > 1 && p.has_goal_visibility && r() < 0.38) {
        trust += 0.25
        delights.push(h.goal.includes('婚禮') ? '知道還差多少公斤' : '目標時間看得懂')
        if (r() < 0.2) delights.push('熱量目標清楚')
      }
      if (day >= 21 && day <= 35 && r() < 0.35) {
        if (p.has_plateau_story) {
          trust += 0.3
          delights.push('平台期有安慰到')
        } else if (!p.has_goal_visibility) {
          trust -= 0.6
          complaints.push('體重沒變以為app壞了')
          complaints.push('不知道平台期是正常')
        } else if (r() < 0.22) {
          trust -= 0.25
          complaints.push('體重沒變以為app壞了')
        }
      }
      if (day >= 14 && day <= 28 && !p.has_goal_visibility && opens > 2 && r() < 0.28) {
        complaints.push('沒進度感')
        if (r() < 0.35) complaints.push('不懂為什麼沒瘦')
      }
      if (day === p.trial_days - 2 && !p.has_goal_visibility && h.discipline >= 5 && r() < 0.25) {
        complaints.push('沒有解釋為什麼沒瘦')
      }
    } else {
      ghost_streak++
    }

    if (h.work_schedule === 'shift' && day <= 5 && opens > 0 && !p.has_night_shift_fix) {
      trust -= 0.8
      complaints.push('夜班打開看到早餐整個不信')
    }
    if (h.food_prefs.includes('開伙') && opens > 2 && !p.has_home_cook_mode && r() < 0.25) {
      complaints.push('我自己煮，為什麼一直推外食')
    }
    if (opens > 3 && !p.has_meal_trust && r() < 0.3) complaints.push('不知道這餐為什麼選給我')
    if (opens > 2 && !p.has_plausible_meals && r() < 0.28) {
      complaints.push('公司附近買不到推薦的店')
      trust -= 0.35
    }
    if (opens > 2 && !p.has_food_photo_accuracy && r() < 0.22) {
      complaints.push('食物圖跟實際差很多')
      trust -= 0.3
    }
    if (opens > 2 && !p.has_photo_food_capture && r() < 0.26) {
      complaints.push('記錄食物要像填表')
      trust -= 0.28
    }
    if (opens > 3 && !p.has_photo_food_capture && r() < 0.18) {
      complaints.push('找不到食物很挫折')
    }
    if (opens > 5 && p.dice_diversity < 0.5 && r() < 0.35) complaints.push('再骰還是同一幾家店')
    if (p.price_ntd === 499 && r() < 0.15) complaints.push('499跟500價格不一致')

    if (day === p.trial_days && !subscribed) {
      const resist = priceResistance(h, p)
      const subProb = fit * 0.35 + h.discipline * 0.03 - resist + (p.trial_days >= 14 ? 0.08 : 0)
      if (r() < subProb) {
        subscribed = true
        sub_day = day
        outcome = 'subscribed'
        delights.push('比營養師便宜')
      } else if (r() < 0.55) {
        active = false
        quit_day = day
        outcome = 'quit'
        dropout = day <= 10 ? '試用到期覺得不值' : '試用到期沒瘦'
        complaints.push(`試用${p.trial_days}天太短，還沒瘦就要錢`)
        if (h.income_monthly_ntd < 40000) complaints.push('500太貴，ChatGPT免費')
        competitor = r() < 0.5 ? 'chatgpt' : 'xiaohongshu'
      }
    }

    if (subscribed && day < sub_day! + 14 && r() < 0.08 - fit * 0.05) {
      refund_day = day
      outcome = 'refunded'
      active = false
      quit_day = day
      dropout = '跟免費ChatGPT差不多'
      complaints.push('跟免費ChatGPT差不多')
    }

    if (!subscribed && day > p.trial_days + 14 && opens < 3 && r() < 0.4) {
      active = false
      quit_day = day
      outcome = 'ghost'
      dropout = '忘了這app存在'
    }

    if (trust < 2.5 && day > 7 && r() < 0.35) {
      active = false
      quit_day = day
      outcome = 'quit'
      dropout = complaints[complaints.length - 1] ?? '不信任'
      competitor = pickCompetitor(h, r)
    }
  }

  if (active && subscribed) outcome = 'subscribed'
  else if (active && !subscribed && milestones.d30) outcome = 'ghost'
  else if (active && !subscribed) outcome = 'ghost'

  if (!milestones.d180 && outcome !== 'never_activated') {
    if (outcome === 'subscribed' && r() < 0.15) {
      outcome = 'churned_sub'
      quit_day = 120 + Math.floor(r() * 50)
      dropout = '訂閱疲勞'
    }
  }

  if (outcome === 'quit' && r() < 0.12 * fit) {
    return_day = (quit_day ?? 30) + 20 + Math.floor(r() * 40)
    outcome = 'returned'
    diary.push(`D${return_day}：又裝回來試試。`)
  }

  if (fit > 0.55 && opens > 8) delights.push('不用再想今天吃什麼')
  if (p.has_meal_trust && opens > 4) delights.push('有解釋為什麼這餐')
  if (p.has_luxury_today_ui && opens > 1 && r() < 0.35) delights.push('介面舒服')
  if (p.has_food_photo_accuracy && opens > 3 && r() < 0.25) delights.push('外食組合比我想的健康')
  if (p.has_photo_food_capture && opens > 2 && r() < 0.32) delights.push('拍照記錄不用算熱量')
  if (p.has_night_shift_fix && h.work_schedule === 'shift') delights.push('夜班用第一餐標籤合理')

  const uniqueComplaints = [...new Set(complaints)].slice(0, 6)
  const uniqueDelights = [...new Set(delights)].slice(0, 5)

  const would_recommend = fit > 0.55 && trust > 5 && (subscribed || milestones.d30)
  const would_pay_again = subscribed && outcome !== 'refunded' && trust > 5

  return {
    human: h,
    outcome,
    quit_day,
    subscribed_day: sub_day,
    refund_day,
    return_day,
    d1: milestones.d1,
    d3: milestones.d3,
    d7: milestones.d7,
    d14: milestones.d14,
    d30: milestones.d30,
    d60: milestones.d60,
    d90: milestones.d90,
    d180: milestones.d180,
    trust_d180: Math.round(trust * 10) / 10,
    would_recommend,
    would_pay_again,
    dropout_reason: dropout || (subscribed ? '仍留存' : '自然流失'),
    competitor_switch: competitor,
    diary: diary.slice(0, 8),
    complaints: uniqueComplaints,
    delights: uniqueDelights,
    spouse_said: h.children > 0 ? (subscribed ? '好喔至少比亂吃便宜' : '又在花錢') : '',
    coworker_said: h.segment === 'office_worker' ? (would_recommend ? '欸這個可以欸' : '還好而已') : '',
    threads_post: complaints[0] ? `#減肥app ${complaints[0]} 有人用過再健一點嗎` : '',
    xhs_post: delights[0] ? `再健一點使用心得：${delights[0]}` : '',
    self_talk: subscribed ? '先撐一個月看看' : quit_day ? '算了不適合我' : '改天再說',
  }
}

function pickCompetitor(h: Human, r: () => number): Competitor {
  const opts: Competitor[] = ['chatgpt', 'xiaohongshu', 'myfitnesspal', 'nothing', 'friends', 'clinic']
  if (h.segment === 'student') return r() < 0.6 ? 'xiaohongshu' : 'chatgpt'
  if (h.diet_history.includes('MFP')) return 'myfitnesspal'
  if (h.segment === 'medical_anxiety') return r() < 0.5 ? 'clinic' : 'ozempic'
  return opts[Math.floor(r() * opts.length)]!
}

export function simulateAll(humans: Human[], p: ProductAssumptions): SimAggregate {
  const results = humans.map(h => simulateHuman(h, p, 20260618 + p.iteration * 1000))
  const agg: SimAggregate = {
    n: humans.length,
    d1: 0, d3: 0, d7: 0, d14: 0, d30: 0, d60: 0, d90: 0, d180: 0,
    subscribed: 0, refunded: 0, would_recommend: 0, would_pay_again: 0,
    complaint_counts: new Map(),
    delight_counts: new Map(),
    dropout_counts: new Map(),
    competitor_counts: new Map(),
    results,
  }

  for (const res of results) {
    if (res.d1) agg.d1++
    if (res.d3) agg.d3++
    if (res.d7) agg.d7++
    if (res.d14) agg.d14++
    if (res.d30) agg.d30++
    if (res.d60) agg.d60++
    if (res.d90) agg.d90++
    if (res.d180) agg.d180++
    if (res.outcome === 'subscribed' || res.outcome === 'churned_sub') agg.subscribed++
    if (res.outcome === 'refunded') agg.refunded++
    if (res.would_recommend) agg.would_recommend++
    if (res.would_pay_again) agg.would_pay_again++
    for (const c of res.complaints) agg.complaint_counts.set(c, (agg.complaint_counts.get(c) ?? 0) + 1)
    for (const d of res.delights) agg.delight_counts.set(d, (agg.delight_counts.get(d) ?? 0) + 1)
    if (res.dropout_reason) agg.dropout_counts.set(res.dropout_reason, (agg.dropout_counts.get(res.dropout_reason) ?? 0) + 1)
    if (res.competitor_switch) agg.competitor_counts.set(res.competitor_switch, (agg.competitor_counts.get(res.competitor_switch) ?? 0) + 1)
  }
  return agg
}

export const PRODUCT_ITERATIONS: ProductAssumptions[] = [
  {
    iteration: 0,
    trial_days: 7,
    price_ntd: 500,
    has_meal_trust: false,
    has_plateau_story: false,
    has_night_shift_fix: false,
    has_home_cook_mode: false,
    has_life_event_recovery: false,
    has_d3_mini_win: false,
    dice_diversity: 0.2,
    onboarding_friction: 0.7,
  },
  {
    iteration: 1,
    trial_days: 7,
    price_ntd: 500,
    has_meal_trust: true,
    has_plateau_story: false,
    has_night_shift_fix: true,
    has_home_cook_mode: false,
    has_life_event_recovery: true,
    has_d3_mini_win: true,
    dice_diversity: 0.5,
    onboarding_friction: 0.6,
  },
  {
    iteration: 2,
    trial_days: 14,
    price_ntd: 500,
    has_meal_trust: true,
    has_plateau_story: true,
    has_night_shift_fix: true,
    has_home_cook_mode: true,
    has_life_event_recovery: true,
    has_d3_mini_win: true,
    dice_diversity: 0.75,
    onboarding_friction: 0.45,
  },
  {
    iteration: 3,
    trial_days: 14,
    price_ntd: 500,
    has_meal_trust: true,
    has_plateau_story: true,
    has_night_shift_fix: true,
    has_home_cook_mode: true,
    has_life_event_recovery: true,
    has_d3_mini_win: true,
    dice_diversity: 0.9,
    onboarding_friction: 0.35,
  },
  {
    iteration: 4,
    trial_days: 14,
    price_ntd: 500,
    has_meal_trust: true,
    has_plateau_story: true,
    has_night_shift_fix: true,
    has_home_cook_mode: true,
    has_life_event_recovery: true,
    has_d3_mini_win: true,
    dice_diversity: 0.95,
    onboarding_friction: 0.32,
    has_goal_visibility: false,
  },
  {
    iteration: 5,
    trial_days: 14,
    price_ntd: 500,
    has_meal_trust: true,
    has_plateau_story: true,
    has_night_shift_fix: true,
    has_home_cook_mode: true,
    has_life_event_recovery: true,
    has_d3_mini_win: true,
    dice_diversity: 0.95,
    onboarding_friction: 0.32,
    has_goal_visibility: true,
  },
  {
    iteration: 6,
    trial_days: 14,
    price_ntd: 500,
    has_meal_trust: true,
    has_plateau_story: true,
    has_night_shift_fix: true,
    has_home_cook_mode: true,
    has_life_event_recovery: true,
    has_d3_mini_win: true,
    dice_diversity: 0.95,
    onboarding_friction: 0.32,
    has_goal_visibility: true,
    has_plausible_meals: true,
    has_food_photo_accuracy: true,
    has_luxury_today_ui: true,
  },
  {
    iteration: 7,
    trial_days: 14,
    price_ntd: 500,
    has_meal_trust: true,
    has_plateau_story: true,
    has_night_shift_fix: true,
    has_home_cook_mode: true,
    has_life_event_recovery: true,
    has_d3_mini_win: true,
    dice_diversity: 0.95,
    onboarding_friction: 0.32,
    has_goal_visibility: true,
    has_plausible_meals: true,
    has_food_photo_accuracy: true,
    has_luxury_today_ui: true,
    has_photo_food_capture: true,
  },
]
