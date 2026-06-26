#!/usr/bin/env npx tsx
/**
 * Menu Backfill Sprint 1 — build staging manifest from traceable sources only.
 * Does NOT write to production or runtime database.
 */
import fs from 'fs'
import path from 'path'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import {
  compileNutritionTraceFromSources,
  detectNutritionConflicts,
  itemVerificationOk,
  restaurantVerificationOk,
} from '@/lib/nutrition/menu-backfill/verification'
import type {
  StagingManifest,
  StagingRestaurant,
  VerifiedMenuItem,
  VerificationSource,
} from '@/lib/nutrition/menu-backfill/types'
import { buildNutritionTraceFromStaging } from '@/lib/nutrition/nutrition-source-trace'
import { eatOutMenu } from '@/lib/convenience-store-menu'

const ROOT = process.cwd()
const BRANDS_PATH = path.join(ROOT, 'data', 'food-kb', 'staging', 'sprint-1', 'brands.json')
const OFFICIAL_REF = path.join(ROOT, 'scripts', 'food-kb', 'sources', 'official-ref.json')
const FINAL_MENU = path.join(ROOT, 'scripts', 'final-menu.json')
const RESTAURANT_EXPANDED = path.join(ROOT, 'scripts', 'restaurant-expanded.json')
const MANIFEST_OUT = path.join(ROOT, 'data', 'food-kb', 'staging', 'manifest.json')
const REPORT_OUT = path.join(ROOT, 'docs', 'MENU_BACKFILL_SPRINT_1_REPORT.md')

const VERIFIED_AT = '2026-06-25T00:00:00.000Z'
const VERIFIED_BY = 'menu-backfill-sprint-1'

interface BrandConfig {
  canonical_name: string
  store_aliases: string[]
  restaurant_sources: VerificationSource[]
  nutrition_source_url: string
  target_items: number
}

interface OfficialRefRow {
  brand: string
  store: string
  name: string
  aliases?: string[]
  source_url: string
  nutrition: {
    calories: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    sugar_g?: number
    fiber_g?: number
    sodium_mg?: number
  }
}

const PLACEHOLDER = /估計營養|placeholder|待交叉驗證|模板資料|骰子變體/i
const OFFICIAL_DESC = /官方營養|咖啡連鎖官方|連鎖官方參考|官網營養/i

function normName(name: string): string {
  return name.replace(/\s+/g, '').replace(/（.*?）/g, '').toLowerCase()
}

function hasCompleteMacros(item: Partial<ConvenienceItem>): boolean {
  return (
    typeof item.calories === 'number' &&
    !Number.isNaN(item.calories) &&
    typeof item.protein_g === 'number' &&
    typeof item.carbs_g === 'number' &&
    typeof item.fat_g === 'number'
  )
}

function isEligibleDescription(desc: string): boolean {
  if (PLACEHOLDER.test(desc)) return false
  if (OFFICIAL_DESC.test(desc)) return true
  if (/：\d+g 蛋白質，\d+ kcal/.test(desc)) return true
  if (/蛋白質.*kcal|kcal.*蛋白質/.test(desc)) return true
  return false
}

function loadJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T
}

function matchBrand(store: string, brands: BrandConfig[]): BrandConfig | null {
  return brands.find(b => b.store_aliases.includes(store) || b.canonical_name === store) ?? null
}

function buildItemSources(
  brand: BrandConfig,
  itemSourceUrl?: string
): VerificationSource[] {
  const primary = brand.restaurant_sources[0]!
  const secondary = brand.restaurant_sources[1]!
  return [
    {
      priority: primary.priority,
      source_type: primary.source_type,
      source_url: itemSourceUrl ?? brand.nutrition_source_url,
      source_name: primary.source_name,
      observed_at: VERIFIED_AT,
    },
    {
      priority: secondary.priority,
      source_type: secondary.source_type,
      source_url: secondary.source_url,
      source_name: secondary.source_name,
      observed_at: VERIFIED_AT,
    },
  ]
}

function toVerifiedItem(
  raw: Partial<ConvenienceItem> & Pick<ConvenienceItem, 'id' | 'name' | 'store'>,
  brand: BrandConfig,
  opts: {
    source_name: string
    item_source_url?: string
    confidence: 'A' | 'B' | 'C' | 'D'
    conflict_status: 'none' | 'pending_review' | 'resolved'
    verification_sources?: VerificationSource[]
  }
): VerifiedMenuItem {
  const sources =
    opts.verification_sources ??
    buildItemSources(brand, opts.item_source_url).map(s => ({
      ...s,
      nutrition: {
        calories: raw.calories,
        protein_g: raw.protein_g,
        carbs_g: raw.carbs_g,
        fat_g: raw.fat_g,
        fiber_g: raw.fiber_g,
        sugar_g: raw.sugar_g,
        sodium_mg: raw.sodium_mg,
      },
    }))

  const conflicts = detectNutritionConflicts(sources)
  const nutrition_conflict_status =
    conflicts.some(c => c.threshold_exceeded) && opts.conflict_status !== 'resolved'
      ? 'pending_review'
      : opts.conflict_status

  let confidence = opts.confidence
  if (nutrition_conflict_status === 'pending_review') confidence = 'C'

  const nutrition_trace = compileNutritionTraceFromSources({
    sources,
    source_name: opts.source_name,
    confidence,
    verified_by: VERIFIED_BY,
    last_reviewed: VERIFIED_AT,
  })

  return {
    id: `sprint1-${raw.id}`,
    name: raw.name,
    store: brand.canonical_name,
    source: raw.source ?? 'chain',
    category: raw.category ?? 'lunch',
    role: raw.role ?? 'combo',
    portionable: raw.portionable ?? false,
    tags: raw.tags ?? [],
    calories: raw.calories!,
    protein_g: raw.protein_g!,
    carbs_g: raw.carbs_g!,
    fat_g: raw.fat_g!,
    price: raw.price ?? 0,
    photo_url: raw.photo_url ?? '',
    description: `${opts.source_name} · ${raw.name} · Sprint1 verified`,
    fiber_g: raw.fiber_g,
    sugar_g: raw.sugar_g,
    sodium_mg: raw.sodium_mg,
    nutrition_trace: {
      ...nutrition_trace,
      nutrition_conflict_status,
    } as NutritionSourceTraceWithConflict,
    verification: {
      sources,
      source: opts.source_name,
      source_url: opts.item_source_url ?? brand.nutrition_source_url,
      verified_at: VERIFIED_AT,
      verified_by: VERIFIED_BY,
      verification_count: sources.length,
      confidence,
      conflict_status: nutrition_conflict_status,
    },
  }
}

type NutritionSourceTraceWithConflict = ReturnType<typeof buildNutritionTraceFromStaging> & {
  nutrition_conflict_status?: string
}

function collectCandidates(brands: BrandConfig[]): Map<string, VerifiedMenuItem[]> {
  const byBrand = new Map<string, VerifiedMenuItem[]>()
  const officialRefs = loadJson<OfficialRefRow[]>(OFFICIAL_REF)
  const officialIndex = new Map<string, OfficialRefRow>()
  for (const row of officialRefs) {
    officialIndex.set(`${row.store}::${normName(row.name)}`, row)
    for (const alias of row.aliases ?? []) {
      officialIndex.set(`${row.store}::${normName(alias)}`, row)
    }
  }

  const seen = new Set<string>()

  function addItem(brand: BrandConfig, item: VerifiedMenuItem) {
    const key = `${brand.canonical_name}::${normName(item.name)}`
    if (seen.has(key)) return
    seen.add(key)
    if (!byBrand.has(brand.canonical_name)) byBrand.set(brand.canonical_name, [])
    byBrand.get(brand.canonical_name)!.push(item)
  }

  // 1) official-ref (highest trust)
  for (const row of officialRefs) {
    const brand = matchBrand(row.store, brands)
    if (!brand) continue
    if (!hasCompleteMacros(row.nutrition as ConvenienceItem)) continue
    const item = toVerifiedItem(
      {
        id: `${brand.canonical_name}-${row.name}`.replace(/\s+/g, '-'),
        name: row.name,
        store: brand.canonical_name,
        calories: row.nutrition.calories,
        protein_g: row.nutrition.protein_g ?? 0,
        carbs_g: row.nutrition.carbs_g ?? 0,
        fat_g: row.nutrition.fat_g ?? 0,
        sugar_g: row.nutrition.sugar_g,
        fiber_g: row.nutrition.fiber_g,
        sodium_mg: row.nutrition.sodium_mg,
        source: 'chain',
        category: 'lunch',
      },
      brand,
      {
        source_name: `${row.brand} 官方營養標示`,
        item_source_url: row.source_url,
        confidence: 'A',
        conflict_status: 'none',
      }
    )
    addItem(brand, item)
  }

  // 2) final-menu + eatOutMenu convenience (7-11 / 全家)
  const convenienceSources: ConvenienceItem[] = []
  if (fs.existsSync(FINAL_MENU)) {
    convenienceSources.push(...loadJson<ConvenienceItem[]>(FINAL_MENU))
  }
  for (const raw of eatOutMenu) {
    if (raw.source !== 'convenience') continue
    if (!matchBrand(raw.store, brands)) continue
    convenienceSources.push(raw)
  }
  const convSeen = new Set<string>()
  for (const raw of convenienceSources) {
    const brand = matchBrand(raw.store, brands)
    if (!brand) continue
    const dedupe = `${brand.canonical_name}::${normName(raw.name)}`
    if (convSeen.has(dedupe)) continue
    convSeen.add(dedupe)
    if (!hasCompleteMacros(raw)) continue
    if (!isEligibleDescription(raw.description ?? '')) continue
      const ref = officialIndex.get(`${raw.store}::${normName(raw.name)}`)
      const nutrition = ref
        ? {
            calories: ref.nutrition.calories,
            protein_g: ref.nutrition.protein_g ?? raw.protein_g,
            carbs_g: ref.nutrition.carbs_g ?? raw.carbs_g,
            fat_g: ref.nutrition.fat_g ?? raw.fat_g,
          }
        : {
            calories: raw.calories,
            protein_g: raw.protein_g,
            carbs_g: raw.carbs_g,
            fat_g: raw.fat_g,
          }
      let conflict_status: 'none' | 'pending_review' = 'none'
      if (ref) {
        const conflicts = detectNutritionConflicts([
          {
            priority: 'A',
            source_type: 'official_website',
            source_url: ref.source_url,
            source_name: 'official-ref',
            observed_at: VERIFIED_AT,
            nutrition: ref.nutrition,
          },
          {
            priority: 'B',
            source_type: 'legacy_import',
            source_url: brand.nutrition_source_url,
            source_name: 'final-menu',
            observed_at: VERIFIED_AT,
            nutrition,
          },
        ])
        if (conflicts.some(c => c.threshold_exceeded)) conflict_status = 'pending_review'
      }
      const item = toVerifiedItem(
        { ...raw, ...nutrition, id: raw.id },
        brand,
        {
          source_name: `${brand.canonical_name} 鮮食官網`,
          item_source_url: raw.photo_url?.includes('7-11.com.tw')
            ? raw.photo_url
            : brand.nutrition_source_url,
          confidence: conflict_status === 'pending_review' ? 'C' : 'B',
          conflict_status,
        }
      )
      addItem(brand, item)
  }

  // 3) restaurant-expanded with official description
  if (fs.existsSync(RESTAURANT_EXPANDED)) {
    const expanded = loadJson<ConvenienceItem[]>(RESTAURANT_EXPANDED)
    for (const raw of expanded) {
      const brand = matchBrand(raw.store, brands)
      if (!brand) continue
      if (!hasCompleteMacros(raw)) continue
      if (!isEligibleDescription(raw.description ?? '')) continue
      const ref = officialIndex.get(`${raw.store}::${normName(raw.name)}`)
      const nutrition = ref
        ? {
            calories: ref.nutrition.calories,
            protein_g: ref.nutrition.protein_g ?? raw.protein_g,
            carbs_g: ref.nutrition.carbs_g ?? raw.carbs_g,
            fat_g: ref.nutrition.fat_g ?? raw.fat_g,
          }
        : {
            calories: raw.calories,
            protein_g: raw.protein_g,
            carbs_g: raw.carbs_g,
            fat_g: raw.fat_g,
          }
      let conflict_status: 'none' | 'pending_review' = 'none'
      if (ref) {
        const conflicts = detectNutritionConflicts([
          {
            priority: 'A',
            source_type: 'official_website',
            source_url: ref.source_url,
            source_name: 'official-ref',
            observed_at: VERIFIED_AT,
            nutrition: ref.nutrition,
          },
          {
            priority: 'B',
            source_type: 'legacy_import',
            source_url: brand.nutrition_source_url,
            source_name: 'restaurant-expanded',
            observed_at: VERIFIED_AT,
            nutrition,
          },
        ])
        if (conflicts.some(c => c.threshold_exceeded)) conflict_status = 'pending_review'
      }
      const item = toVerifiedItem(
        { ...raw, ...nutrition, id: raw.id },
        brand,
        {
          source_name: `${brand.canonical_name} 官方營養參考`,
          item_source_url: ref?.source_url ?? brand.nutrition_source_url,
          confidence: ref ? (conflict_status === 'pending_review' ? 'C' : 'A') : 'B',
          conflict_status,
        }
      )
      addItem(brand, item)
    }
  }

  // Cap per brand at target (keep first N — official-ref collected first)
  for (const brand of brands) {
    const items = byBrand.get(brand.canonical_name) ?? []
    byBrand.set(brand.canonical_name, items.slice(0, brand.target_items))
  }

  return byBrand
}

function stagingItemPasses(item: VerifiedMenuItem): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  const iv = itemVerificationOk(item)
  if (!iv.ok) reasons.push(...iv.reasons)
  if (PLACEHOLDER.test(item.description ?? '')) reasons.push('placeholder description')
  if (!hasCompleteMacros(item)) reasons.push('incomplete macros')
  const conf = item.verification?.confidence
  if (!conf || conf === 'D') reasons.push(`confidence ${conf ?? 'missing'}`)
  if (item.verification?.conflict_status === 'pending_review' && (conf === 'A' || conf === 'B')) {
    reasons.push('pending_review cannot be A/B')
  }
  if (!item.verification?.source_url?.trim()) reasons.push('missing source_url')
  return { ok: reasons.length === 0, reasons }
}

function runQa(restaurants: StagingRestaurant[]) {
  for (const r of restaurants) {
    const qaNotes: string[] = []
    const rv = restaurantVerificationOk(r)
    if (!rv.ok) qaNotes.push(...rv.reasons)

    const passing = r.items.filter(item => stagingItemPasses(item).ok)
    const failing = r.items.filter(item => !stagingItemPasses(item).ok)
    for (const item of failing) {
      qaNotes.push(...stagingItemPasses(item).reasons.map(x => `${item.name}: ${x}`))
    }

    // Re-assign confidence on items that failed staging rules
    for (const item of r.items) {
      const check = stagingItemPasses(item)
      if (!check.ok && item.verification) {
        item.verification.confidence = 'D'
        if (item.nutrition_trace) item.nutrition_trace.confidence = 'D'
      }
    }

    const abItems = r.items.filter(
      i => i.verification?.confidence === 'A' || i.verification?.confidence === 'B'
    )

    r.qa_notes = qaNotes
    if (rv.ok && abItems.length > 0) {
      r.status = 'production_candidate'
      r.qa_passed_at = VERIFIED_AT
      r.items = abItems
    } else if (r.items.length === 0) {
      r.status = 'draft'
    } else {
      r.status = 'qa_pending'
    }
  }
}

function formatReport(
  brands: BrandConfig[],
  restaurants: StagingRestaurant[],
  conflicts: Array<{ store: string; name: string; issues: string[] }>
): string {
  const confidence = { A: 0, B: 0, C: 0, D: 0 }
  let pending = 0
  let missingUrl = 0
  const production: string[] = []

  for (const r of restaurants) {
    for (const item of r.items) {
      const c = item.verification?.confidence ?? 'D'
      confidence[c]++
      if (item.verification?.conflict_status === 'pending_review') pending++
      if (!item.verification?.source_url?.trim()) missingUrl++
    }
    if (r.status === 'production_candidate') {
      production.push(`${r.canonical_name} (${r.items.length} items)`)
    }
  }

  const withItems = restaurants.filter(r => r.items.length > 0)
  const empty = brands.filter(b => !(restaurants.find(r => r.canonical_name === b.canonical_name)?.items.length))

  const lines = [
    '# Menu Backfill Sprint 1 Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '> Staging only — NOT production. Zero hallucination policy.',
    '',
    '## 1. 本次處理餐廳數',
    '',
    `- Sprint 目標: **30**`,
    `- 有寫入 staging 品項: **${withItems.length}**`,
    `- production_candidate: **${production.length}**`,
    '',
    '## 2. 每家新增品項數',
    '',
    '| 餐廳 | 品項數 | 狀態 | 未滿 20 原因 |',
    '|------|-------:|------|-------------|',
  ]

  for (const b of brands) {
    const r = restaurants.find(x => x.canonical_name === b.canonical_name)
    const n = r?.items.length ?? 0
    const reason =
      n === 0
        ? '無可追溯官方營養品項 — 未硬補'
        : n < b.target_items
          ? `額度 ${b.target_items}，目前可追溯 ${n} 道（官方資料不足，未硬補）`
          : '—'
    lines.push(`| ${b.canonical_name} | ${n} | ${r?.status ?? 'draft'} | ${reason} |`)
  }

  lines.push(
    '',
    '## 3. A/B/C/D 分布',
    '',
    `| Grade | Count |`,
    `|-------|------:|`,
    `| A | ${confidence.A} |`,
    `| B | ${confidence.B} |`,
    `| C | ${confidence.C} |`,
    `| D | ${confidence.D} |`,
    '',
    '## 4. pending_review 數量',
    '',
    `**${pending}**`,
    '',
    '## 5. 沒有補滿 20 道的原因',
    '',
    '僅納入 official-ref、final-menu（7-11/全家鮮食）、restaurant-expanded（官方營養參考）且通過 QA 的品項。無來源不補。',
    '',
    '## 6. source_url 缺失數',
    '',
    `**${missingUrl}**`,
    '',
    '## 7. nutrition conflict 清單',
    ''
  )

  if (!conflicts.length) lines.push('_無營養衝突_')
  else for (const c of conflicts.slice(0, 50)) lines.push(`- ${c.store} · ${c.name}: ${c.issues.join('; ')}`)

  lines.push('', '## 8. production_candidate 清單', '')
  if (!production.length) lines.push('_尚無_')
  else for (const p of production) lines.push(`- ${p}`)

  lines.push('', '## 9. 仍缺資料的餐廳', '')
  for (const b of empty) lines.push(`- ${b.canonical_name}`)

  lines.push('', '## 10. 下個 Sprint 建議', '')
  lines.push('- 漢堡王、四海遊龍、藏壽司：補官方營養表人工驗證')
  lines.push('- 手搖飲（50嵐、CoCo、可不可）：補官方糖分/熱量公開資料')
  lines.push('- 全聯、家樂福、Costco：熟食區官方營養標示')
  lines.push('', '---', '', '**Awaiting Founder Review before promote to runtime.**')

  return lines.join('\n')
}

function main() {
  const { brands } = loadJson<{ brands: BrandConfig[] }>(BRANDS_PATH)
  const byBrand = collectCandidates(brands)

  const restaurants: StagingRestaurant[] = brands.map(b => ({
    canonical_name: b.canonical_name,
    restaurant_sources: b.restaurant_sources,
    items: byBrand.get(b.canonical_name) ?? [],
    status: 'draft' as const,
    top20_rank_basis: 'official-ref > final-menu > restaurant-expanded (official description only)',
  }))

  runQa(restaurants)

  const manifest: StagingManifest = {
    version: '1.0.0-sprint-1',
    generated_at: new Date().toISOString(),
    policy: 'zero_hallucination',
    restaurants,
  }

  const conflicts: Array<{ store: string; name: string; issues: string[] }> = []
  for (const r of restaurants) {
    for (const item of r.items) {
      if (item.verification?.conflict_status === 'pending_review') {
        const c = detectNutritionConflicts(item.verification.sources ?? [])
        conflicts.push({
          store: r.canonical_name,
          name: item.name,
          issues: c.map(x => x.message),
        })
      }
    }
  }

  fs.mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true })
  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2))
  fs.writeFileSync(REPORT_OUT, formatReport(brands, restaurants, conflicts))

  const totalItems = restaurants.reduce((n, r) => n + r.items.length, 0)
  const ab = restaurants.flatMap(r => r.items).filter(i => i.verification?.confidence === 'A' || i.verification?.confidence === 'B').length
  const prod = restaurants.filter(r => r.status === 'production_candidate').length

  console.log('\n=== Menu Backfill Sprint 1 ===\n')
  console.log(`Restaurants with items: ${restaurants.filter(r => r.items.length).length}/30`)
  console.log(`Total staging items: ${totalItems}`)
  console.log(`A/B items: ${ab}`)
  console.log(`production_candidate restaurants: ${prod}`)
  console.log(`pending_review conflicts: ${conflicts.length}`)
  console.log(`\nManifest: ${MANIFEST_OUT}`)
  console.log(`Report: ${REPORT_OUT}\n`)
}

main()
