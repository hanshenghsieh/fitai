import type { BigFive, CharacterCard, City, Competitor, Gender, Segment } from './types'

const FIRST = ['陳','林','黃','張','李','王','吳','劉','蔡','楊','許','鄭','謝','郭','洪','曾','邱','廖','賴','周','葉','蘇','莊','江','何','蕭','羅','高','簡','彭','游','詹','胡','施','沈','徐','呂','盧','梁','趙','顏','柯','翁','魏','孫','戴','范','方','宋','杜','韓','曹','馬','石','唐','馮','程','童','白','游','紀']
const M = ['冠宇','柏翰','宗翰','家豪','承翰','哲維','冠廷','彥廷','宇軒','俊宏','建宏','志偉','文傑','冠霖','柏均','昱廷','家銘','彥儒','信宏','育成','俊傑','韋辰','子晴爸','國樑','世昌']
const F = ['怡君','雅婷','欣怡','淑芬','佳穎','宜庭','詩涵','品妍','宥蓁','婉婷','佩珊','思妤','郁婷','姿君','曉雯','佳慧','宜萱','心怡','宥萱','芷晴','雨潔','欣妤','語彤','佳琪','孟潔','書涵','宜柔','凱婷','筑恩']

const CITIES: City[] = ['台北','新北','桃園','新竹','台中','台南','高雄','基隆','嘉義','彰化','屏東','宜蘭','苗栗','南投']
const QUOTES = [
  '我又下載一個減肥app，希望這次不是智商稅。',
  '我沒時間記每一口，只想有人告訴我今晚吃什麼。',
  '老公說少吃就好，問題是我不知道少多少。',
  '夜班回家只想躺，看到早餐兩個字會生氣。',
  '小紅書說這樣吃會瘦，我信一半。',
  '試用到期前如果沒瘦我就刪。',
  '再健臉很欠揍，但至少沒罵我。',
  '我寧願付教練課也不想付訂閱，教練會兇我。',
  '便當店比便利商店離我比較近。',
  '產後胖是命，但我還是想試試。',
  'ChatGPT 免費欸，為什麼要500。',
  '我討厭打卡，但我也討厭自己沒自律。',
  '過年後再說啦…現在先把這週撐過去。',
  '體重沒動不代表我沒努力吧？',
  '如果還是推7-11我會 unfriend 這 app。',
]

const SEGMENTS: { seg: Segment; weight: number; occ: string[]; constraints: string[] }[] = [
  { seg: 'office_woman', weight: 88, occ: ['行銷','人資','行政','PM','設計助理'], constraints: ['久坐','常外食','偶爾聚餐'] },
  { seg: 'office_man', weight: 62, occ: ['業務','專案','採購','法務'], constraints: ['應酬','加班','午餐外食'] },
  { seg: 'engineer', weight: 58, occ: ['軟體工程師','RD','DevOps','資料工程'], constraints: ['久坐','宵夜','高壓release'] },
  { seg: 'sales', weight: 52, occ: ['業務','房仲','保險','汽車業務'], constraints: ['應酬喝酒','不規律','常在路上'] },
  { seg: 'mother', weight: 72, occ: ['全職媽媽','育兒中','兼職'], constraints: ['時間碎片','家裡開伙','小孩生病'] },
  { seg: 'night_nurse', weight: 28, occ: ['護理師','急診','ICU'], constraints: ['大夜','睡眠債','情緒吃'] },
  { seg: 'teacher', weight: 38, occ: ['國中老師','高中老師','補教'], constraints: ['放學後累','便當為主'] },
  { seg: 'student', weight: 55, occ: ['大學生','研究生','實習生'], constraints: ['預算低','手搖','考試週'] },
  { seg: 'freelancer', weight: 42, occ: ['接案','設計','攝影','YouTuber'], constraints: ['收入不穩','作息亂'] },
  { seg: 'factory_worker', weight: 35, occ: ['作業員','品管','倉管'], constraints: ['輪班','體力勞動','便當'] },
  { seg: 'business_traveler', weight: 22, occ: ['業務主管','顧問','外派'], constraints: ['出差','飯店早餐','時差'] },
  { seg: 'postpartum', weight: 26, occ: ['產後媽媽','育嬰假'], constraints: ['哺乳','睡眠不足','不敢節食'] },
  { seg: 'emotional_eater', weight: 40, occ: ['客服','社工','店長'], constraints: ['壓力大','情緒吃','夜班偶發'] },
  { seg: 'data_lover', weight: 18, occ: ['分析師','量化','健身狂'], constraints: ['要數據','要Wearable','挑剔'] },
  { seg: 'tracking_hater', weight: 45, occ: ['司機','外送','自由業'], constraints: ['討厭記錄','討厭訂閱','要結果'] },
  { seg: 'high_income_pro', weight: 30, occ: ['醫師','律師','金融'], constraints: ['時間貴','要效率','願付費但挑剔'] },
  { seg: 'low_income_worker', weight: 38, occ: ['工讀','派遣','服務業'], constraints: ['預算緊','500很痛','常忘記'] },
]

const COMPETITORS: Competitor[] = ['chatgpt','myfitnesspal','noom','apple_health','google','xiaohongshu','threads','instagram','youtube','dietician','gym_coach','ozempic','clinic','nothing']

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)]!
}

function weighted<T extends { weight: number }>(r: () => number, arr: T[]): T {
  const t = arr.reduce((s, a) => s + a.weight, 0)
  let x = r() * t
  for (const a of arr) {
    x -= a.weight
    if (x <= 0) return a
  }
  return arr[arr.length - 1]!
}

function ageForSegment(seg: Segment, r: () => number): number {
  if (seg === 'student') return 19 + Math.floor(r() * 5)
  if (seg === 'postpartum') return 28 + Math.floor(r() * 8)
  if (seg === 'high_income_pro') return 32 + Math.floor(r() * 14)
  if (seg === 'night_nurse') return 25 + Math.floor(r() * 16)
  const base = 25 + Math.floor(r() * 21)
  return base
}

function income(seg: Segment, age: number, r: () => number): number {
  const table: Record<Segment, [number, number]> = {
    office_woman: [38000, 72000],
    office_man: [42000, 85000],
    engineer: [55000, 150000],
    sales: [35000, 120000],
    mother: [0, 42000],
    night_nurse: [42000, 78000],
    teacher: [45000, 75000],
    student: [8000, 20000],
    freelancer: [22000, 90000],
    factory_worker: [28000, 52000],
    business_traveler: [65000, 140000],
    postpartum: [0, 55000],
    emotional_eater: [30000, 65000],
    data_lover: [48000, 110000],
    tracking_hater: [28000, 58000],
    high_income_pro: [90000, 220000],
    low_income_worker: [24000, 32000],
  }
  const [lo, hi] = table[seg]
  return Math.round(lo + r() * (hi - lo) * (age > 35 ? 1.1 : 1))
}

function bigFive(r: () => number, seg: Segment): BigFive {
  const boostC = seg === 'engineer' || seg === 'data_lover' ? 1.4 : 0
  const boostN = seg === 'emotional_eater' || seg === 'postpartum' ? 1.6 : 0
  return {
    openness: Math.round(3 + r() * 6),
    conscientiousness: Math.round(3 + r() * 5 + boostC),
    extraversion: Math.round(2 + r() * 7),
    agreeableness: Math.round(3 + r() * 6),
    neuroticism: Math.round(2 + r() * 6 + boostN),
  }
}

export function generateCharacterCards(count = 500, seed = 20260619): CharacterCard[] {
  const r = rng(seed)
  const cards: CharacterCard[] = []

  for (let id = 1; id <= count; id++) {
    const row = weighted(r, SEGMENTS)
    const gender: Gender = r() < 0.54 ? 'female' : r() < 0.98 ? 'male' : 'nonbinary'
    const age = ageForSegment(row.seg, r)
    const name = gender === 'female' ? `${pick(r, FIRST)}${pick(r, F)}` : `${pick(r, FIRST)}${pick(r, M)}`
    const height = gender === 'female' ? 155 + Math.floor(r() * 14) : 168 + Math.floor(r() * 12)
    const bmiBase = row.seg === 'postpartum' ? 25.5 : row.seg === 'student' ? 21.5 : 23.5
    const bmi = Math.round((bmiBase + (r() - 0.5) * 5) * 10) / 10
    const weight = Math.round(bmi * (height / 100) ** 2 * 10) / 10
    const bf = Math.round((gender === 'female' ? 28 : 22) + (r() - 0.5) * 12)
    const children = row.seg === 'mother' || row.seg === 'postpartum' ? (r() < 0.55 ? 2 : 1) : age > 32 && r() < 0.35 ? Math.floor(r() * 3) : 0
    const discipline = Math.max(1, Math.min(10, Math.round(3 + r() * 5 + (row.seg === 'engineer' ? 1.5 : 0) - (row.seg === 'tracking_hater' ? 1 : 0) - (row.seg === 'emotional_eater' ? 0.8 : 0))))
    const schedule = row.seg === 'night_nurse' ? 'shift' : row.seg === 'business_traveler' ? 'travel_heavy' : r() < 0.15 ? 'irregular' : 'standard'

    cards.push({
      id,
      name,
      age,
      gender,
      city: pick(r, CITIES),
      income_monthly_ntd: income(row.seg, age, r),
      occupation: pick(r, row.occ),
      education: age < 24 ? '大學在學' : r() < 0.5 ? '大學' : r() < 0.78 ? '碩士' : '高中職',
      relationship: children > 0 ? '已婚' : age < 27 ? (r() < 0.65 ? '單身' : '交往中') : pick(r, ['已婚','單身','離婚','同居','交往中']),
      children,
      height_cm: height,
      weight_kg: weight,
      body_fat_pct: bf,
      bmi,
      goal: row.seg === 'postpartum' ? '產後恢復' : pick(r, ['減脂','減重','維持','健康檢查過關','婚禮前','稍微瘦','增肌減脂']),
      timeline: pick(r, ['1個月','3個月','6個月','沒有deadline','過年前','夏天前']),
      work_schedule: schedule,
      sleep_pattern: schedule === 'shift' ? '大夜後白天睡4-5h' : r() < 0.35 ? '常熬夜1點後' : '23-24點睡7h',
      stress_level: Math.max(1, Math.min(10, Math.round(4 + r() * 5 + (row.seg === 'emotional_eater' ? 1.5 : 0)))),
      exercise_habit: discipline > 6 ? '一週2-3次' : discipline > 4 ? '散步偶爾' : '幾乎不動',
      diet_habit: row.seg === 'mother' ? '家裡開伙為主' : r() < 0.62 ? '外食便利商店' : '混合外食自煮',
      eating_weakness: pick(r, ['手搖','炸物','宵夜','應酬酒','甜點','泡麵','火鍋','情緒爆吃']),
      emotional_eating: Math.max(1, Math.min(10, Math.round(3 + r() * 5 + (row.seg === 'emotional_eater' ? 2 : 0)))),
      self_discipline: discipline,
      technology_literacy: Math.max(1, Math.min(10, Math.round(4 + r() * 5 + (row.seg === 'engineer' ? 2 : row.seg === 'low_income_worker' ? -1 : 0)))),
      previous_diet_failures: pick(r, ['節食復胖','MFP三天','Noom放棄','減重診所諮詢','小紅書菜單','沒認真減過','斷食崩潰']),
      app_fatigue: Math.max(1, Math.min(10, Math.round(3 + r() * 6 + (row.seg === 'tracking_hater' ? 2 : 0)))),
      payment_willingness: Math.max(1, Math.min(10, Math.round(2 + r() * 5 + (row.seg === 'high_income_pro' ? 2 : 0) - (row.seg === 'student' ? 2 : 0)))),
      trust_level: Math.max(1, Math.min(10, Math.round(3 + r() * 4 + (row.seg === 'data_lover' ? -1 : 0)))),
      personality: pick(r, ['急躁','內向','樂觀','焦慮','務實','完美主義','隨性','敏感','競爭','悲觀']),
      big_five: bigFive(r, row.seg),
      daily_routine: schedule === 'shift' ? '23:00上班→07:00下班→09:00睡' : '09:00通勤→19:00下班→22:00滑手機',
      social_influence: pick(r, ['同事團購','限動跟風','家人煮飯','伴侶反對app','健身咖','无人管']),
      competitor_preference: pick(r, COMPETITORS),
      life_constraints: pick(r, row.constraints),
      unique_quote: pick(r, QUOTES),
      segment: row.seg,
    })
  }
  return cards
}

export function formatCharacterCard(c: CharacterCard): string {
  return `### #${String(c.id).padStart(3, '0')} ${c.name} · ${c.age} · ${c.city} · ${c.occupation}
- ${c.gender} · ${c.relationship}${c.children ? ` · ${c.children}孩` : ''} · 收入 NT$${c.income_monthly_ntd}/月
- ${c.height_cm}cm · ${c.weight_kg}kg · BF ${c.body_fat_pct}% · BMI ${c.bmi} · 目標：${c.goal}（${c.timeline}）
- 作息：${c.work_schedule} · ${c.sleep_pattern} · 壓力 ${c.stress_level}/10 · 自律 ${c.self_discipline}/10
- 飲食：${c.diet_habit} · 弱點：${c.eating_weakness} · 情緒吃 ${c.emotional_eating}/10
- 科技 ${c.technology_literacy}/10 · 付費意願 ${c.payment_willingness}/10 · 信任 ${c.trust_level}/10 · app疲勞 ${c.app_fatigue}/10
- 過去：${c.previous_diet_failures} · 競品傾向：${c.competitor_preference}
- 人格：${c.personality} · O${c.big_five.openness} C${c.big_five.conscientiousness} E${c.big_five.extraversion} A${c.big_five.agreeableness} N${c.big_five.neuroticism}
- 限制：${c.life_constraints} · 社交：${c.social_influence}
- 「${c.unique_quote}」`
}
