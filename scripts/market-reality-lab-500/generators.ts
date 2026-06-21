import type { City, Gender, Human, Segment } from './types'

const FIRST = ['陳','林','黃','張','李','王','吳','劉','蔡','楊','許','鄭','謝','郭','洪','曾','邱','廖','賴','周','葉','蘇','莊','江','何','蕭','羅','高','簡','彭','游','詹','胡','施','沈','徐','呂','盧','梁','趙','顏','柯','翁','魏','孫','戴','范','方','宋','杜']
const SECOND_M = ['志明','冠宇','柏翰','宗翰','家豪','承翰','哲維','冠廷','彥廷','宇軒','俊宏','建宏','志偉','文傑','冠霖','柏均','昱廷','家銘','冠穎','彥儒']
const SECOND_F = ['怡君','雅婷','欣怡','淑芬','佳穎','宜庭','詩涵','品妍','宥蓁','婉婷','佩珊','思妤','郁婷','姿君','曉雯','佳慧','宜萱','心怡','宥萱','芷晴']

const CITIES: City[] = ['台北','新北','桃園','新竹','台中','台南','高雄','基隆','嘉義','彰化','屏東','宜蘭','花蓮','台東','苗栗','南投','雲林','澎湖','金門']
const SEGMENTS: { seg: Segment; weight: number; occ: string[] }[] = [
  { seg: 'office_worker', weight: 95, occ: ['行銷專員','行政助理','人資','會計','專案經理','產品企劃'] },
  { seg: 'engineer', weight: 55, occ: ['軟體工程師','硬體工程師','測試工程師','DevOps','資料工程師'] },
  { seg: 'mother', weight: 70, occ: ['全職媽媽','育兒中','兼職媽媽','家管'] },
  { seg: 'student', weight: 65, occ: ['大學生','研究生','補習班學生','實習生'] },
  { seg: 'night_nurse', weight: 22, occ: ['護理師','急診護理','ICU護理','助產士'] },
  { seg: 'entrepreneur', weight: 28, occ: ['創業者','小店老闆','電商賣家','工作室主'] },
  { seg: 'factory_worker', weight: 35, occ: ['作業員','品管','倉管','生產線領班'] },
  { seg: 'sales', weight: 40, occ: ['業務','房仲','保險業務','汽車業務'] },
  { seg: 'teacher', weight: 30, occ: ['國中老師','高中老師','補教老師','幼教老師'] },
  { seg: 'driver', weight: 25, occ: ['計程車司機','外送員','物流司機','巴士司機'] },
  { seg: 'freelancer', weight: 32, occ: ['設計師','攝影師','接案工程師','文案'] },
  { seg: 'unemployed', weight: 18, occ: ['待業中','轉職中','剛畢業','育嬰假結束求職'] },
  { seg: 'retired', weight: 12, occ: ['退休','半退休','志工'] },
  { seg: 'food_service', weight: 28, occ: ['餐飲店長','廚師','吧台','夜市攤商'] },
  { seg: 'medical_anxiety', weight: 20, occ: ['糖尿病前期','高血壓','健檢紅字','藥局常客'] },
]

const GOALS = ['減脂','減重','維持','產後恢復','增肌減脂','健康檢查過關','婚禮前','稍微瘦','不知道但想變好']
const PERSONALITY = ['急躁','內向','樂觀','焦慮','務實','完美主義','隨性','控制狂','敏感','幽默','悲觀','競爭心強']
const WEAKNESSES = ['健忘','情緒吃','熬夜','喝酒應酬','愛手搖','愛炸物','週末爆吃','拖延','三分鐘熱度','比較心','自我批判','怕麻煩']
const LIFE_EVENTS = ['加班','出差','分手','小孩生病','爸媽住院','婚禮','同學會','過年','出國','颱風假','懷孕','生理期','失眠','被裁員','升遷壓力','搬家','考試週']

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

function weightedPick<T extends { weight: number }>(r: () => number, arr: T[]): T {
  const total = arr.reduce((s, a) => s + a.weight, 0)
  let x = r() * total
  for (const a of arr) {
    x -= a.weight
    if (x <= 0) return a
  }
  return arr[arr.length - 1]!
}

function incomeFor(age: number, seg: Segment, r: () => number): number {
  const base: Record<Segment, [number, number]> = {
    office_worker: [38000, 85000],
    engineer: [55000, 150000],
    mother: [0, 45000],
    student: [5000, 18000],
    night_nurse: [42000, 78000],
    entrepreneur: [25000, 120000],
    factory_worker: [28000, 52000],
    sales: [32000, 90000],
    teacher: [45000, 75000],
    driver: [30000, 55000],
    freelancer: [22000, 80000],
    unemployed: [0, 15000],
    retired: [25000, 50000],
    food_service: [28000, 65000],
    medical_anxiety: [35000, 70000],
  }
  const [lo, hi] = base[seg]
  const ageBoost = age > 35 ? 1.15 : age < 25 ? 0.85 : 1
  return Math.round((lo + r() * (hi - lo)) * ageBoost)
}

export function generateHumans(count: number, seed = 42): Human[] {
  const r = rng(seed)
  const humans: Human[] = []

  for (let id = 1; id <= count; id++) {
    const gender: Gender = r() < 0.48 ? 'male' : r() < 0.96 ? 'female' : 'other'
    const age = Math.floor(18 + r() * 47)
    const segRow = weightedPick(r, SEGMENTS)
    const segment = segRow.seg
    const name = gender === 'female'
      ? `${pick(r, FIRST)}${pick(r, SECOND_F)}`
      : `${pick(r, FIRST)}${pick(r, SECOND_M)}`

    const bmiBase = segment === 'student' ? 21 : segment === 'mother' ? 25.5 : 23.8
    const bmi = bmiBase + (r() - 0.5) * 6
    const height = gender === 'female' ? 158 + r() * 12 : 168 + r() * 12
    const weight_kg = Math.round(bmi * (height / 100) ** 2 * 10) / 10
    const body_fat_pct = Math.round((gender === 'female' ? 28 : 22) + (r() - 0.5) * 14)

    const children = segment === 'mother' ? (r() < 0.6 ? 2 : 1) : age > 30 && r() < 0.35 ? Math.floor(r() * 3) : 0
    const discipline = Math.max(1, Math.min(10, Math.round(3 + r() * 6 + (segment === 'engineer' ? 1.5 : 0) - (segment === 'student' ? 1 : 0))))
    const stress = Math.max(1, Math.min(10, Math.round(4 + r() * 5 + (segment === 'night_nurse' ? 1.5 : 0))))
    const schedule = segment === 'night_nurse' || (segment === 'driver' && r() < 0.4) ? 'shift' : r() < 0.12 ? 'irregular' : 'standard'

    const shuffledWeak = [...WEAKNESSES].sort(() => r() - 0.5).slice(0, 3)
    const shuffledPers = [...PERSONALITY].sort(() => r() - 0.5).slice(0, 3)

    humans.push({
      id,
      name,
      age,
      gender,
      income_monthly_ntd: incomeFor(age, segment, r),
      occupation: pick(r, segRow.occ),
      education: age < 24 ? '大學在學' : r() < 0.45 ? '大學' : r() < 0.75 ? '碩士' : '高中職',
      relationship: children > 0 ? '已婚' : age < 26 ? (r() < 0.7 ? '單身' : '交往中') : pick(r, ['已婚','單身','離婚','交往中','同居']),
      children,
      city: pick(r, CITIES),
      segment,
      weight_kg,
      body_fat_pct,
      goal: segment === 'mother' ? '產後恢復' : pick(r, GOALS),
      personality: shuffledPers,
      discipline,
      stress,
      sleep_quality: Math.max(1, Math.min(10, Math.round(10 - stress * 0.5 + (schedule === 'shift' ? -2 : 0) + r() * 2))),
      work_schedule: schedule,
      exercise_habits: discipline > 6 ? '一週2-3次健身房' : discipline > 4 ? '偶爾散步' : '幾乎不動',
      food_prefs: segment === 'mother' ? '家裡開伙為主' : segment === 'student' ? '外食+手搖' : r() < 0.55 ? '外食便利商店' : '混合外食與自煮',
      emotional_eating: stress > 6 ? '壓力大會爆吃甜食' : '還好',
      social_env: pick(r, ['同事愛團購','室友愛外送','家人煮飯','一個人住','伴侶也常外食']),
      tech_ability: Math.max(1, Math.min(10, Math.round(4 + r() * 5 + (segment === 'engineer' ? 2 : segment === 'retired' ? -2 : 0)))),
      diet_history: pick(r, ['沒認真減過','節食失敗三次','用過MFP','用過Noom三天','減重診所諮詢過','只靠小紅書菜單']),
      financial: incomeFor(age, segment, r) < 35000 ? '月底常緊' : r() < 0.3 ? '有存款但怕亂花' : '還可以',
      mental_model: pick(r, ['相信科學','相信感覺','相信朋友推薦','半信半疑','要看到瘦才信']),
      motivation: pick(r, ['體檢紅字','外表','伴侶提醒','衣服變緊','同學婚禮','沒有很清楚']),
      fear: pick(r, ['復胖','浪費錢','又被騙','傷身','沒時間','被笑']),
      weaknesses: shuffledWeak,
      daily_routine: schedule === 'shift' ? '大夜：凌晨下班吃宵夜睡覺' : '朝九晚六，通勤外食',
      life_events_pool: [...LIFE_EVENTS].sort(() => r() - 0.5).slice(0, 5),
      friends_influence: pick(r, ['會互相推app','愛喝手搖團購','健身咖','負能量抱怨','小紅書跟風']),
      family_influence: children > 0 ? '老公覺得智商稅' : pick(r, ['媽媽擔心','家人支持','沒人管']),
      social_media_influence: pick(r, ['小紅書','Threads','IG','YouTube','幾乎不用']),
    })
  }
  return humans
}
