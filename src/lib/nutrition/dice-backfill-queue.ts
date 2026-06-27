import type { AllowlistFile } from '@/lib/nutrition/restaurant-menu-audit'
import type { DiceBrandMenuAuditResult, DiceBrandMenuRow } from '@/lib/nutrition/dice-brand-menu-audit'

export const DICE_BACKFILL_BATCH_SIZE = 50
export const DICE_BACKFILL_START_SPRINT = 6

export type DiceBackfillPhaseId =
  | 'p0_partial'
  | 'p0_missing'
  | 'p1_partial'
  | 'p1_missing'

export interface DiceBackfillQueueBrand {
  rank: number
  canonical_name: string
  seed_priority: string
  status: DiceBrandMenuRow['status']
  item_count: number
  dice_recommendable_main_count: number
  issues: string[]
}

export interface DiceBackfillQueueBatch {
  sprint: number
  batch_id: string
  phase: DiceBackfillPhaseId
  theme: string
  brands: DiceBackfillQueueBrand[]
}

export interface DiceBackfillQueue {
  generated_at: string
  batch_size: number
  summary: {
    p0_partial: number
    p0_missing: number
    p1_partial: number
    p1_missing: number
    total_incomplete: number
    sprint_batches: number
  }
  phases: Array<{
    id: DiceBackfillPhaseId
    label: string
    count: number
    batches: DiceBackfillQueueBatch[]
  }>
  /** Flat list for tooling — same order as sprint execution. */
  all_batches: DiceBackfillQueueBatch[]
}

const PHASE_ORDER: Array<{
  id: DiceBackfillPhaseId
  label: string
  match: (row: DiceBrandMenuRow) => boolean
  theme: string
}> = [
  {
    id: 'p0_partial',
    label: 'P0 partial — 升級 verified 主餐（placeholder → A/B）',
    match: r => r.seed_priority === 'P0' && (r.status === 'partial' || r.status === 'sparse'),
    theme: 'P0 partial upgrade',
  },
  {
    id: 'p0_missing',
    label: 'P0 missing — 從零建菜單',
    match: r => r.seed_priority === 'P0' && r.status === 'missing',
    theme: 'P0 missing backfill',
  },
  {
    id: 'p1_partial',
    label: 'P1 partial — 升級 verified 主餐',
    match: r => r.seed_priority === 'P1' && (r.status === 'partial' || r.status === 'sparse'),
    theme: 'P1 partial upgrade',
  },
  {
    id: 'p1_missing',
    label: 'P1 missing — 從零建菜單',
    match: r => r.seed_priority === 'P1' && r.status === 'missing',
    theme: 'P1 missing backfill',
  },
]

/** Known official / nutrition landing pages from prior sprint scaffolds. */
export const BRAND_NUTRITION_URLS: Record<string, string> = {
  萊爾富: 'https://www.hilife.com.tw/',
  OK超商: 'https://www.okmart.com.tw/',
  'OK mart': 'https://www.okmart.com.tw/',
  全聯: 'https://www.pxmart.com.tw/',
  家樂福: 'https://www.carrefour.com.tw/',
  Costco: 'https://www.costco.com.tw/',
  愛買: 'https://www.a-mart.com.tw/',
  大潤發: 'https://www.rt-mart.com.tw/',
  漢堡王: 'https://www.burgerking.com.tw/menu',
  頂呱呱: 'https://www.tkkinc.com.tw/',
  拿坡里: 'https://www.napoli.com.tw/',
  必勝客: 'https://www.pizzahut.com.tw/menu',
  達美樂: 'https://www.dominos.com.tw/',
  四海遊龍: 'https://www.seafooddragon.com.tw/',
  YAYOI彌生軒: 'https://www.yayoik.com.tw/',
  丸龜製麵: 'https://www.marugame-seimen.com.tw/',
  藏壽司: 'https://www.kurasushi.com.tw/',
  壽司郎: 'https://www.sushiro.com.tw/',
  乾杯: 'https://www.kanpai.com.tw/',
  老乾杯: 'https://www.wowprime.com/',
  築間: 'https://www.zhujian.com.tw/',
  '12MINI': 'https://www.12mini.com.tw/',
  肉多多: 'https://www.rododo.com.tw/',
  夏慕尼: 'https://www.chamonix.com.tw/',
  聚北海道鍋物: 'https://www.jpot.com.tw/',
  非常泰: 'https://www.wangroup.com.tw/',
  饗泰多: 'https://www.wangroup.com.tw/',
  大心: 'https://www.wangroup.com.tw/',
  'TGI Fridays': 'https://www.tgifridays.com.tw/',
  "Chili's": 'https://www.chilis.com.tw/',
  丹堤咖啡: 'https://www.dante.com.tw/',
  五十嵐: 'https://www.50lan.com/',
  清心福全: 'https://www.chingshin.com.tw/',
  CoCo都可: 'https://www.coco-tea.com.tw/',
  CoCo: 'https://www.coco-tea.com.tw/',
  迷客夏: 'https://www.milkshop.com.tw/',
  龜記: 'https://www.guiche.com.tw/',
  麻古茶坊: 'https://www.macu.com.tw/',
  COMEBUY: 'https://www.combuy.com.tw/',
  得正: 'https://www.dejheng.com/',
  大苑子: 'https://www.yuancha.com.tw/',
  老賴茶棧: 'https://www.lai-cha.com.tw/',
  烏弄: 'https://www.unocha.com.tw/',
  鼎泰豐: 'https://www.dintaifung.com.tw/',
  欣葉: 'https://www.shinyeh.com.tw/',
  美而美: 'https://www.meiermei.com.tw/',
  'Q Burger': 'https://www.qburger.com.tw/',
  晨間廚房: 'https://www.morningkitchen.com.tw/',
  福隆便當: 'https://www.fulong.com.tw/',
  台鐵便當: 'https://www.railway.gov.tw/',
  池上木片便當: 'https://www.chishang.com.tw/',
  金仙滷肉飯: 'https://www.jinshan.com.tw/',
  點點心: 'https://www.timhowan.com/',
  福勝亭: 'https://www.tontonton.com.tw/',
  樂麵屋: 'https://www.ramen-nagi.com.tw/',
  屯京拉麵: 'https://www.tonchin.com.tw/',
  花月嵐: 'https://www.kagetsu-arashi.com/',
  山頭火: 'https://www.santouka.com.tw/',
  麵屋武藏: 'https://www.musashino.com.tw/',
  韓姜熙: 'https://www.kanghee.com.tw/',
  涓豆腐: 'https://www.dubu.com.tw/',
  豆腐村: 'https://www.dofu.com.tw/',
  韓虎嘯: 'https://www.hanho.com.tw/',
  IKEA: 'https://www.ikea.com.tw/',
  CoCo壹番屋: 'https://www.ichibanya.com.tw/',
  老先覺: 'https://www.laosense.com.tw/',
  錢都: 'https://www.chiando.com.tw/',
  小蒙牛: 'https://www.mongolia.com.tw/',
  涮乃葉: 'https://www.shabuyo.com.tw/',
  饗食天堂: 'https://www.eatogether.com.tw/',
  漢來海港: 'https://www.hilai.com.tw/',
  千葉火鍋: 'https://www.chiba.com.tw/',
  美廉社: 'https://www.simplemart.com.tw/',
  合點壽司: 'https://www.goten.com.tw/',
  金子半之助: 'https://www.kanekohannosuke.com/',
  王品牛排: 'https://www.wangsteak.com.tw/',
  瓦城: 'https://www.wangroup.com.tw/',
  八方雲集: 'https://www.8way.com.tw/',
  '50嵐': 'https://www.50lan.com/',
}

function toQueueBrand(row: DiceBrandMenuRow): DiceBackfillQueueBrand {
  return {
    rank: row.rank,
    canonical_name: row.canonical_name,
    seed_priority: row.seed_priority,
    status: row.status,
    item_count: row.item_count,
    dice_recommendable_main_count: row.dice_recommendable_main_count,
    issues: row.issues,
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

export function buildDiceBackfillQueue(
  audit: DiceBrandMenuAuditResult,
  options?: { batchSize?: number; startSprint?: number }
): DiceBackfillQueue {
  const batchSize = options?.batchSize ?? DICE_BACKFILL_BATCH_SIZE
  const startSprint = options?.startSprint ?? DICE_BACKFILL_START_SPRINT

  let sprint = startSprint
  const all_batches: DiceBackfillQueueBatch[] = []
  const phases: DiceBackfillQueue['phases'] = []

  const counts = { p0_partial: 0, p0_missing: 0, p1_partial: 0, p1_missing: 0 }

  for (const phase of PHASE_ORDER) {
    const rows = audit.brands.filter(phase.match).sort((a, b) => a.rank - b.rank)
    if (phase.id === 'p0_partial') counts.p0_partial = rows.length
    if (phase.id === 'p0_missing') counts.p0_missing = rows.length
    if (phase.id === 'p1_partial') counts.p1_partial = rows.length
    if (phase.id === 'p1_missing') counts.p1_missing = rows.length

    const batches: DiceBackfillQueueBatch[] = chunk(rows, batchSize).map(brands => {
      const batch: DiceBackfillQueueBatch = {
        sprint,
        batch_id: `sprint-${sprint}`,
        phase: phase.id,
        theme: phase.theme,
        brands: brands.map(toQueueBrand),
      }
      sprint++
      all_batches.push(batch)
      return batch
    })

    phases.push({
      id: phase.id,
      label: phase.label,
      count: rows.length,
      batches,
    })
  }

  return {
    generated_at: new Date().toISOString(),
    batch_size: batchSize,
    summary: {
      ...counts,
      total_incomplete: counts.p0_partial + counts.p0_missing + counts.p1_partial + counts.p1_missing,
      sprint_batches: all_batches.length,
    },
    phases,
    all_batches,
  }
}

export function getDiceBackfillBatch(
  queue: DiceBackfillQueue,
  batchId: string
): DiceBackfillQueueBatch | null {
  return queue.all_batches.find(b => b.batch_id === batchId) ?? null
}

export function resolveBrandNutritionUrl(canonicalName: string): string {
  const known = BRAND_NUTRITION_URLS[canonicalName.trim()]
  if (known) return known
  return `https://www.google.com/search?q=${encodeURIComponent(`${canonicalName} 台灣 官網 營養`)}`
}

export function allowlistAliasesForBrand(
  allowlist: AllowlistFile,
  canonicalName: string
): string[] {
  const entry = allowlist.entries.find(e => e.canonical_name.trim() === canonicalName.trim())
  if (!entry) return [canonicalName]
  const aliases = new Set<string>([entry.canonical_name, ...(entry.search_aliases ?? [])])
  return [...aliases]
}
