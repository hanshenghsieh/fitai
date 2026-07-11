import type { NotificationCategory, NotificationCopyEntry } from './notification-types'

const BANNED_PATTERNS = [
  /胖/,
  /懶/,
  /失敗/,
  /你又/,
  /沒救/,
  /廢物/,
  /丟臉/,
  /笨蛋/,
  /白痴/,
  /去死/,
  /恨/,
  /罪惡/,
  /完蛋/,
  /毀了/,
  /自暴自棄/,
]

export function passesCopySafetyCheck(text: string): boolean {
  return !BANNED_PATTERNS.some(p => p.test(text))
}

function entry(
  category: NotificationCategory,
  id: string,
  title: string,
  body: string,
  cooldown_days = 90,
  min_interval_hours = 4
): NotificationCopyEntry | null {
  if (!passesCopySafetyCheck(title) || !passesCopySafetyCheck(body)) return null
  return { id, category, title, body, cooldown_days, min_interval_hours }
}

function combineFragments(
  category: NotificationCategory,
  prefix: string,
  titles: string[],
  bodies: string[],
  idStart: number
): NotificationCopyEntry[] {
  const out: NotificationCopyEntry[] = []
  let idx = idStart
  for (const title of titles) {
    for (const body of bodies) {
      const fullTitle = title.includes('{p}') ? title.replace('{p}', prefix) : `${prefix}${title}`
      const e = entry(category, `${category}_${idx++}`, fullTitle, body)
      if (e) out.push(e)
    }
  }
  return out
}

const BREAKFAST_TITLES = [
  '早安，先顧好第一餐',
  '早餐時間到了',
  '今天從早餐開始',
  '醒來先補能量',
  '第一餐很重要',
  '早餐別跳過',
  '給身體一個好的開始',
  '先吃再忙',
  '早餐幫你穩住節奏',
  '今天的第一口',
  '早餐先記起來',
  '起床後的小步驟',
  '先吃早餐',
  '早餐可以簡單',
  '早上先暖身一下',
  '今天也從早餐開始',
  '早餐是今天的底',
]

const BREAKFAST_BODIES = [
  '記一餐就好，不用完美。',
  '簡單吃也能讓下午穩很多。',
  '蛋、吐司、優格都可以。',
  '先記錄，之後再微調。',
  '今天不用完美，先記一餐就很好。',
]

const LUNCH_TITLES = [
  '午餐時間',
  '中午了，吃點東西',
  '午餐先補能量',
  '中午這一餐',
  '午餐別拖太久',
  '先吃午餐再繼續忙',
  '午餐可以穩住下午',
  '中午補一點力',
  '午餐先記起來',
  '中午好好吃一餐',
  '午餐是下午的地基',
  '午餐時間到了',
  '先顧午餐',
  '中午這口很重要',
  '午餐別用零食代替',
  '午餐先簡單吃',
  '中午補上營養',
]

const LUNCH_BODIES = [
  '午餐先補蛋白質，下午會穩很多。',
  '便當、湯麵、定食都可以。',
  '記一餐，晚上比較好抓。',
  '不用吃很滿，夠用就好。',
  '先記錄，教練幫你算。',
]

const DINNER_TITLES = [
  '晚餐時間',
  '晚上這一餐',
  '晚餐可以簡單一點',
  '傍晚先吃晚餐',
  '晚餐別太晚',
  '晚上好好收尾',
  '晚餐先記起來',
  '今天最後一餐',
  '晚餐輕一點也好',
  '傍晚補一餐',
  '晚餐時間到了',
  '晚上這口算進去',
  '晚餐別跳過',
  '先吃晚餐再休息',
  '晚餐幫你收尾',
  '晚上簡單吃',
  '晚餐可以少一點澱粉',
]

const DINNER_BODIES = [
  '晚餐可以簡單一點，明天身體會謝謝你。',
  '蔬菜多一點，腸胃比較舒服。',
  '不用大餐，夠飽就好。',
  '記一餐，今天就算有交代。',
  '清淡一點，睡眠也會比較穩。',
]

const WATER_TITLES = [
  '喝口水',
  '補充水分',
  '水分提醒',
  '喝一點水',
  '身體需要水',
  '先喝水',
  '水分小提醒',
  '喝杯水吧',
  '補水時間',
  '慢慢喝一口',
]

const WATER_BODIES = [
  '口渴前就先補，精神會比較穩。',
  '一杯水，腦袋會清醒一點。',
  '今天如果喝不多，現在補一口。',
  '水分夠，代謝也比較順。',
  '不用一次喝很多，分次就好。',
]

const PROTEIN_TITLES = [
  '蛋白質小提醒',
  '補一點蛋白質',
  '今天蛋白質還差一點',
  '蛋白質可以補一下',
  '加點蛋白質',
  '蛋白質幫你撐住',
  '今天多一點蛋白質',
  '蛋白質缺口',
  '補蛋白質的好時機',
  '蛋白質先補',
]

const PROTEIN_BODIES = [
  '今天還差一點蛋白質，茶葉蛋或雞胸都可以。',
  '豆漿、優格、鮪魚罐頭都方便。',
  '蛋白質夠，比較不容易晚上亂吃。',
  '下一餐加一份蛋白，會差很多。',
  '小份蛋白質也好，不用一次吃很多。',
]

const WORKOUT_TITLES = [
  '動一下身體',
  '運動小提醒',
  '今天可以動 15 分鐘',
  '身體想動一下',
  '散步也算數',
  '輕運動時間',
  '活動一下',
  '今天動一動',
  '運動不用很久',
  '走走路也好',
]

const WORKOUT_BODIES = [
  '15 分鐘快走就很有幫助。',
  '爬樓梯、拉筋、散步都可以。',
  '動完會比較好睡。',
  '不用重訓，輕活動就夠。',
  '今天動一點，明天精神會更好。',
]

const ENCOURAGEMENT_TITLES = [
  '今天也在路上',
  '一步一步來',
  '你做得不錯',
  '持續比完美重要',
  '小進步也算',
  '今天辛苦了',
  '慢慢來就好',
  '有記錄就很棒',
  '教練在旁邊',
  '今天也加油',
  '不用跟別人比',
  '照自己的節奏',
]

const ENCOURAGEMENT_BODIES = [
  '今天不用完美，先記一餐就很好。',
  '有記錄，我們就能幫你調整。',
  '你已經比昨天多前進一點。',
  '穩穩做，比衝一波有用。',
  '身體會記得你的努力。',
  '今天做到這裡，已經很好。',
]

const OVER_TARGET_TITLES = [
  '今天吃夠了',
  '先休息一下吧',
  '超了一點沒關係',
  '今天不用再補',
  '放過自己一下',
  '明天再拉回來',
  '今天先到這裡',
  '不用補救餐',
]

const OVER_TARGET_BODIES = [
  '超了一點沒關係，下一餐拉回來就好。',
  '喝點水，好好休息。',
  '不要自責，明天身體還會配合你。',
  '今天不用再找高熱量補救。',
  '今晚簡單收尾就好。',
]

const TARGET_HIT_TITLES = [
  '今天達標了',
  '今日目標達成',
  '今天做得很穩',
  '今日平衡不錯',
  '今天有到位',
  '目標達成',
]

const TARGET_HIT_BODIES = [
  '今天節奏不錯，可以安心休息。',
  '維持這樣就很棒。',
  '有達標的日子，身體會記得。',
  '今天做得剛好，不用再多補。',
  '穩穩收尾，明天繼續。',
]

const AI_INSIGHT_TITLES = [
  '教練小洞察',
  '本週觀察',
  '今天的小建議',
  '數據幫你看了一眼',
  '教練筆記',
  '本週重點',
]

const AI_INSIGHT_BODIES = [
  '本週蛋白質偏低時，午餐先補一份蛋白會差很多。',
  '晚餐熱量偏高時，下一餐可以清淡一點。',
  '喝水不足的日子，下午容易想吃零食。',
  '體重緩降時，維持蛋白質比節食更重要。',
  '運動少的日子，散步 15 分鐘也很有幫助。',
  '記錄越穩，建議會越準。',
]

function buildCategoryLibrary(): NotificationCopyEntry[] {
  const chunks: NotificationCopyEntry[] = []

  chunks.push(...combineFragments('breakfast_reminder', '', BREAKFAST_TITLES, BREAKFAST_BODIES, 1))
  chunks.push(...combineFragments('lunch_reminder', '', LUNCH_TITLES, LUNCH_BODIES, 1))
  chunks.push(...combineFragments('dinner_reminder', '', DINNER_TITLES, DINNER_BODIES, 1))
  chunks.push(...combineFragments('water_reminder', '', WATER_TITLES, WATER_BODIES, 1))
  chunks.push(...combineFragments('protein_reminder', '', PROTEIN_TITLES, PROTEIN_BODIES, 1))
  chunks.push(...combineFragments('workout_reminder', '', WORKOUT_TITLES, WORKOUT_BODIES, 1))
  chunks.push(...combineFragments('encouragement', '', ENCOURAGEMENT_TITLES, ENCOURAGEMENT_BODIES, 1))
  chunks.push(...combineFragments('over_target_comfort', '', OVER_TARGET_TITLES, OVER_TARGET_BODIES, 1))
  chunks.push(...combineFragments('target_hit', '', TARGET_HIT_TITLES, TARGET_HIT_BODIES, 1))
  chunks.push(...combineFragments('ai_coach_insight', '', AI_INSIGHT_TITLES, AI_INSIGHT_BODIES, 1))

  const extraBreakfast = expandRotating(
    'breakfast_reminder',
    ['早安', '早上好', '起床了', '新的一天', '今天開始'],
    [
      '先記早餐，節奏會穩很多。',
      '第一餐不用豐盛，有吃就好。',
      '燕麥、蛋餅、飯糰都可以記。',
      '出門前先記一餐。',
      '早餐跳過，下午容易亂吃。',
      '簡單早餐也能幫你撐住上午。',
      '先顧好第一餐，其他交給我。',
      '記錄早餐，今天就算開局了。',
    ],
    500
  )
  chunks.push(...extraBreakfast)

  const extraLunch = expandRotating(
    'lunch_reminder',
    ['午餐', '中午', '正午', '午間', '中午這餐'],
    [
      '便當、麵食、定食都好，記下來就好。',
      '蛋白質多一點，下午比較不昏。',
      '別用零食撐過中午。',
      '吃七分飽，晚上比較好調。',
      '午餐記了，今天才好抓平衡。',
      '外食也能記，不用完美。',
      '先吃再回訊息，身體會謝謝你。',
      '中午這餐，幫你撐住下午。',
    ],
    600
  )
  chunks.push(...extraLunch)

  const extraDinner = expandRotating(
    'dinner_reminder',
    ['晚餐', '傍晚', '晚上', '今晚', '夜間'],
    [
      '清淡一點，睡眠品質會更好。',
      '蔬菜多一口，腸胃比較舒服。',
      '不用大餐，夠飽就好。',
      '晚餐別太晚，明天比較輕鬆。',
      '今天最後一餐，簡單收尾。',
      '湯品配主食，也是不錯選擇。',
      '記晚餐，今天才算完整。',
      '少一點油炸，身體比較輕鬆。',
    ],
    700
  )
  chunks.push(...extraDinner)

  const extraWater = expandRotating(
    'water_reminder',
    ['喝水', '補水', '水分', '一口水', '水杯'],
    [
      '分次喝，比一次灌完好。',
      '溫水也OK，重點是補上。',
      '喝水後深呼吸一下，節奏會穩。',
      '如果頭昏昏的，先喝一口。',
      '今天水量還不夠，現在補一點。',
      '喝水不算麻煩，是基本保養。',
      '手邊有水就喝，不用等口渴。',
      '補水後再決定要不要吃零食。',
    ],
    800
  )
  chunks.push(...extraWater)

  const extraProtein = expandRotating(
    'protein_reminder',
    ['蛋白質', '補蛋白', '高蛋白', '蛋白質缺口', '蛋白質提醒'],
    [
      '茶葉蛋兩顆就很有感。',
      '雞胸、豆腐、鮪魚都方便。',
      '蛋白質夠，比較不容易晚上嘴饞。',
      '下一餐加一份蛋白，差距很大。',
      '豆漿無糖也好，記得算進去。',
      '小份蛋白質也好，不用一次吃很多。',
      '本週蛋白偏低時，這餐先補。',
      '蛋白質是今天最值得補的一項。',
    ],
    900
  )
  chunks.push(...extraProtein)

  const extraWorkout = expandRotating(
    'workout_reminder',
    ['運動', '活動', '動一動', '散步', '伸展'],
    [
      '10 分鐘也算，重點是開始。',
      '爬樓梯、快走、拉筋都可以。',
      '運動後喝口水，慢慢降溫。',
      '今天不想重訓，散步就好。',
      '活動一下，睡眠會比較深。',
      '身體需要動，不是懲罰，是保養。',
      '傍晚動一下，心情也會鬆一點。',
      '本週運動少，今天走 15 分鐘。',
    ],
    1000
  )
  chunks.push(...extraWorkout)

  const extraEncourage = expandRotating(
    'encouragement',
    ['教練說', '提醒', '今天', '小聲說', '給你'],
    [
      '有記錄的一天，就是好的一天。',
      '你不用跟任何人比速度。',
      '今天做到這裡，已經值得肯定。',
      '穩定比激烈更重要。',
      '身體需要時間，我們一起調。',
      '每一次記錄，都在幫未來的自己。',
      '今天不完美也沒關係。',
      '你願意打開，就是進步。',
    ],
    1100
  )
  chunks.push(...extraEncourage)

  const extraOver = expandRotating(
    'over_target_comfort',
    ['今天', '沒關係', '放輕鬆', '教練說', '先停一下'],
    [
      '今天熱量夠了，不用再找補救餐。',
      '超一點是正常波動，不是退步。',
      '喝點水，早點休息。',
      '明天我們再拉回平衡。',
      '不要自責，身體還在配合你。',
      '今晚不要再找高熱量點心。',
      '今天先到這裡，已經足夠。',
      '休息也是計畫的一部分。',
    ],
    1200
  )
  chunks.push(...extraOver)

  const extraTarget = expandRotating(
    'target_hit',
    ['達標', '今天穩了', '平衡', '剛剛好', '到位'],
    [
      '今天節奏抓得不錯，可以安心收尾。',
      '維持這樣，比極端節食有用。',
      '有達標的日子，要記得肯定自己。',
      '今天不用再多補，休息就好。',
      '穩穩的一天，明天繼續。',
      '你今天的選擇很平衡。',
      '這樣的節奏，身體會適應。',
      '今天表現穩定，值得開心一下。',
    ],
    1300
  )
  chunks.push(...extraTarget)

  const extraAi = expandRotating(
    'ai_coach_insight',
    ['洞察', '觀察', '本週', '數據', '教練筆記'],
    [
      '晚餐佔比高時，隔天早餐多蛋白質。',
      '本週水少時，下午特別想喝含糖飲。',
      '體重緩降時，蛋白質不能跟著降。',
      '運動不足的週，先從散步開始。',
      '記錄天數越多，建議越貼近你。',
      '午餐蛋白質夠，晚上比較不亂吃。',
      '連續外食時，選湯多料少的組合。',
      '睡眠差的日子，別再節食過頭。',
    ],
    1400
  )
  chunks.push(...extraAi)

  return dedupeByTitleBody(chunks)
}

function expandRotating(
  category: NotificationCategory,
  prefixes: string[],
  bodies: string[],
  idStart: number
): NotificationCopyEntry[] {
  const out: NotificationCopyEntry[] = []
  let idx = idStart
  for (let p = 0; p < prefixes.length; p++) {
    for (let b = 0; b < bodies.length; b++) {
      const title = `${prefixes[p]}提醒`
      const body = bodies[b]
      const e = entry(category, `${category}_${idx++}`, title, body)
      if (e) out.push(e)
    }
  }
  return out
}

function dedupeByTitleBody(entries: NotificationCopyEntry[]): NotificationCopyEntry[] {
  const seen = new Set<string>()
  const out: NotificationCopyEntry[] = []
  for (const e of entries) {
    const key = `${e.title}||${e.body}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

export const NOTIFICATION_COPY_LIBRARY: NotificationCopyEntry[] = buildCategoryLibrary()

export function copyByCategory(category: NotificationCategory): NotificationCopyEntry[] {
  return NOTIFICATION_COPY_LIBRARY.filter(c => c.category === category)
}

export function countCopyByCategory(): Record<NotificationCategory, number> {
  const counts = {} as Record<NotificationCategory, number>
  for (const copy of NOTIFICATION_COPY_LIBRARY) {
    counts[copy.category] = (counts[copy.category] ?? 0) + 1
  }
  return counts
}

export function totalCopyCount(): number {
  return NOTIFICATION_COPY_LIBRARY.length
}

export function allCopyPassesSafetyAudit(): boolean {
  return NOTIFICATION_COPY_LIBRARY.every(
    c => passesCopySafetyCheck(c.title) && passesCopySafetyCheck(c.body)
  )
}

export function buildAiInsightCopyFromLine(line: string, index: number): NotificationCopyEntry | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  const title = trimmed.length > 18 ? `${trimmed.slice(0, 16)}…` : trimmed
  return entry('ai_coach_insight', `ai_dynamic_${index}`, '教練洞察', trimmed, 30, 12)
}
