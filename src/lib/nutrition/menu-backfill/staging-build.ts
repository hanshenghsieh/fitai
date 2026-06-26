import fs from 'fs'
import path from 'path'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import {
  compileNutritionTraceFromSources,
  detectNutritionConflicts,
  itemVerificationOk,
  restaurantVerificationOk,
} from './verification'
import type {
  StagingRestaurant,
  VerifiedMenuItem,
  VerificationSource,
} from './types'
import { buildNutritionTraceFromStaging } from '../nutrition-source-trace'
import {
  buildOfficialMenuIndex,
  loadAllOfficialReferences,
} from '../official-reference/loader'

const ROOT = process.cwd()
const FINAL_MENU = path.join(ROOT, 'scripts', 'final-menu.json')
const RESTAURANT_EXPANDED = path.join(ROOT, 'scripts', 'restaurant-expanded.json')

const PLACEHOLDER = /估計營養|placeholder|待交叉驗證|模板資料|骰子變體/i
const OFFICIAL_DESC = /官方營養|咖啡連鎖官方|連鎖官方參考|官網營養/i

export interface StagingBuildBrand {
  canonical_name: string
  store_aliases: string[]
  restaurant_sources: Array<
    Pick<VerificationSource, 'priority' | 'source_type' | 'source_url' | 'source_name'>
  >
  nutrition_source_url: string | null
  target_items: number
}

export interface StagingBuildOptions {
  brands: StagingBuildBrand[]
  verifiedAt: string
  verifiedBy: string
  itemIdPrefix: string
  sprintLabel: string
  rankBasis?: string
}

interface OnrRefRow {
  calories: number
  protein: number
  carbs: number
  fat: number
  source_url: string
  sugar?: number | null
  fiber?: number | null
  sodium?: number | null
}

type NutritionSourceTraceWithConflict = ReturnType<typeof buildNutritionTraceFromStaging> & {
  nutrition_conflict_status?: string
}

function loadJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T
}

function normName(name: string): string {
  return name.replace(/\s+/g, '').replace(/（.*?）/g, '').toLowerCase()
}

function normStore(store: string): string {
  return store.replace(/\s+/g, '').toLowerCase()
}

export function matchStagingBrand(
  store: string,
  brands: StagingBuildBrand[]
): StagingBuildBrand | null {
  const n = normStore(store)
  return (
    brands.find(
      b =>
        b.canonical_name === store ||
        b.store_aliases.includes(store) ||
        b.store_aliases.some(a => normStore(a) === n) ||
        normStore(b.canonical_name) === n
    ) ?? null
  )
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

function buildItemSources(
  brand: StagingBuildBrand,
  opts: StagingBuildOptions,
  itemSourceUrl?: string
): VerificationSource[] {
  const primary = brand.restaurant_sources[0]!
  const secondary = brand.restaurant_sources[1]!
  const nutritionUrl = itemSourceUrl ?? brand.nutrition_source_url ?? primary.source_url
  return [
    {
      priority: primary.priority,
      source_type: primary.source_type,
      source_url: nutritionUrl,
      source_name: primary.source_name,
      observed_at: opts.verifiedAt,
    },
    {
      priority: secondary.priority,
      source_type: secondary.source_type,
      source_url: secondary.source_url,
      source_name: secondary.source_name,
      observed_at: opts.verifiedAt,
    },
  ]
}

function toVerifiedItem(
  raw: Partial<ConvenienceItem> & Pick<ConvenienceItem, 'id' | 'name' | 'store'>,
  brand: StagingBuildBrand,
  opts: StagingBuildOptions,
  itemOpts: {
    source_name: string
    item_source_url?: string
    confidence: 'A' | 'B' | 'C' | 'D'
    conflict_status: 'none' | 'pending_review' | 'resolved'
    verification_sources?: VerificationSource[]
  }
): VerifiedMenuItem {
  const sources =
    itemOpts.verification_sources ??
    buildItemSources(brand, opts, itemOpts.item_source_url).map(s => ({
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
  let nutrition_conflict_status: 'none' | 'pending_review' | 'resolved' = itemOpts.conflict_status
  if (conflicts.some(c => c.threshold_exceeded) && itemOpts.conflict_status !== 'resolved') {
    nutrition_conflict_status = 'pending_review'
  }

  let confidence = itemOpts.confidence
  if (nutrition_conflict_status === 'pending_review') confidence = 'C'

  const nutrition_trace = compileNutritionTraceFromSources({
    sources,
    source_name: itemOpts.source_name,
    confidence,
    verified_by: opts.verifiedBy,
    last_reviewed: opts.verifiedAt,
  })

  const sourceUrl = itemOpts.item_source_url ?? brand.nutrition_source_url ?? sources[0]?.source_url ?? ''

  return {
    id: `${opts.itemIdPrefix}${raw.id}`,
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
    description: `${itemOpts.source_name} · ${raw.name} · ${opts.sprintLabel} verified`,
    fiber_g: raw.fiber_g,
    sugar_g: raw.sugar_g,
    sodium_mg: raw.sodium_mg,
    nutrition_trace: {
      ...nutrition_trace,
      nutrition_conflict_status,
    } as NutritionSourceTraceWithConflict,
    verification: {
      sources,
      source: itemOpts.source_name,
      source_url: sourceUrl,
      verified_at: opts.verifiedAt,
      verified_by: opts.verifiedBy,
      verification_count: sources.length,
      confidence,
      conflict_status: nutrition_conflict_status,
    },
  }
}

function collectCandidates(
  brands: StagingBuildBrand[],
  opts: StagingBuildOptions
): Map<string, VerifiedMenuItem[]> {
  const byBrand = new Map<string, VerifiedMenuItem[]>()
  const eligibleBrands = brands.filter(b => b.nutrition_source_url?.trim())
  const onrRefs = loadAllOfficialReferences()
  const onrIndex = buildOfficialMenuIndex()

  const seen = new Set<string>()

  function addItem(brand: StagingBuildBrand, item: VerifiedMenuItem) {
    const key = `${brand.canonical_name}::${normName(item.name)}`
    if (seen.has(key)) return
    seen.add(key)
    if (!byBrand.has(brand.canonical_name)) byBrand.set(brand.canonical_name, [])
    byBrand.get(brand.canonical_name)!.push(item)
  }

  // ONR — Official Nutrition Reference (highest priority)
  for (const ref of onrRefs) {
    const brand = matchStagingBrand(ref.metadata.canonical_name, eligibleBrands)
    if (!brand) continue
    for (const item of ref.menu) {
      const onrHit = onrIndex.get(`${ref.metadata.canonical_name}::${normName(item.name)}`)
      if (!onrHit) continue
      addItem(
        brand,
        toVerifiedItem(
          {
            id: `${brand.canonical_name}-${item.name}`.replace(/\s+/g, '-'),
            name: item.name,
            store: brand.canonical_name,
            calories: item.calories,
            protein_g: item.protein,
            carbs_g: item.carbs,
            fat_g: item.fat,
            sugar_g: item.sugar ?? undefined,
            fiber_g: item.fiber ?? undefined,
            sodium_mg: item.sodium ?? undefined,
            source: 'chain',
            category: 'lunch',
          },
          brand,
          opts,
          {
            source_name: `ONR ${ref.metadata.canonical_name}`,
            item_source_url: item.source_url,
            confidence: item.confidence,
            conflict_status: 'none',
          }
        )
      )
    }
  }

  const convenienceSources: ConvenienceItem[] = []
  if (fs.existsSync(FINAL_MENU)) {
    convenienceSources.push(...loadJson<ConvenienceItem[]>(FINAL_MENU))
  }
  for (const raw of eatOutMenu) {
    if (raw.source !== 'convenience') continue
    if (!matchStagingBrand(raw.store, eligibleBrands)) continue
    convenienceSources.push(raw)
  }
  const convSeen = new Set<string>()
  for (const raw of convenienceSources) {
    const brand = matchStagingBrand(raw.store, eligibleBrands)
    if (!brand) continue
    const dedupe = `${brand.canonical_name}::${normName(raw.name)}`
    if (convSeen.has(dedupe)) continue
    convSeen.add(dedupe)
    if (!hasCompleteMacros(raw)) continue
    if (!isEligibleDescription(raw.description ?? '')) continue
    const ref = onrIndex.get(`${brand.canonical_name}::${normName(raw.name)}`)
    const nutrition = ref
      ? {
          calories: ref.calories,
          protein_g: ref.protein ?? raw.protein_g,
          carbs_g: ref.carbs ?? raw.carbs_g,
          fat_g: ref.fat ?? raw.fat_g,
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
          source_name: 'onr',
          observed_at: opts.verifiedAt,
          nutrition: {
            calories: ref.calories,
            protein_g: ref.protein,
            carbs_g: ref.carbs,
            fat_g: ref.fat,
          },
        },
        {
          priority: 'B',
          source_type: 'legacy_import',
          source_url: brand.nutrition_source_url!,
          source_name: 'final-menu',
          observed_at: opts.verifiedAt,
          nutrition,
        },
      ])
      if (conflicts.some(c => c.threshold_exceeded)) conflict_status = 'pending_review'
    }
    addItem(
      brand,
      toVerifiedItem(
        { ...raw, ...nutrition, id: raw.id },
        brand,
        opts,
        {
          source_name: `${brand.canonical_name} 鮮食官網`,
          item_source_url: raw.photo_url?.includes('7-11.com.tw')
            ? raw.photo_url
            : brand.nutrition_source_url!,
          confidence: conflict_status === 'pending_review' ? 'C' : 'B',
          conflict_status,
        }
      )
    )
  }

  if (fs.existsSync(RESTAURANT_EXPANDED)) {
    const expanded = loadJson<ConvenienceItem[]>(RESTAURANT_EXPANDED)
    for (const raw of expanded) {
      const brand = matchStagingBrand(raw.store, eligibleBrands)
      if (!brand) continue
      if (!hasCompleteMacros(raw)) continue
      if (!isEligibleDescription(raw.description ?? '')) continue
      const ref = onrIndex.get(`${brand.canonical_name}::${normName(raw.name)}`)
      const nutrition = ref
        ? {
            calories: ref.calories,
            protein_g: ref.protein ?? raw.protein_g,
            carbs_g: ref.carbs ?? raw.carbs_g,
            fat_g: ref.fat ?? raw.fat_g,
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
            source_name: 'onr',
            observed_at: opts.verifiedAt,
            nutrition: {
              calories: ref.calories,
              protein_g: ref.protein,
              carbs_g: ref.carbs,
              fat_g: ref.fat,
            },
          },
          {
            priority: 'B',
            source_type: 'legacy_import',
            source_url: brand.nutrition_source_url!,
            source_name: 'restaurant-expanded',
            observed_at: opts.verifiedAt,
            nutrition,
          },
        ])
        if (conflicts.some(c => c.threshold_exceeded)) conflict_status = 'pending_review'
      }
      addItem(
        brand,
        toVerifiedItem(
          { ...raw, ...nutrition, id: raw.id },
          brand,
          opts,
          {
            source_name: `${brand.canonical_name} 官方營養參考`,
            item_source_url: ref?.source_url ?? brand.nutrition_source_url!,
            confidence: ref ? (conflict_status === 'pending_review' ? 'C' : 'A') : 'B',
            conflict_status,
          }
        )
      )
    }
  }

  for (const brand of eligibleBrands) {
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

export function runStagingRestaurantQa(restaurants: StagingRestaurant[], verifiedAt: string): void {
  for (const r of restaurants) {
    const qaNotes: string[] = []
    const rv = restaurantVerificationOk(r)
    if (!rv.ok) qaNotes.push(...rv.reasons)

    const failing = r.items.filter(item => !stagingItemPasses(item).ok)
    for (const item of failing) {
      qaNotes.push(...stagingItemPasses(item).reasons.map(x => `${item.name}: ${x}`))
    }

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
      r.qa_passed_at = verifiedAt
      r.items = abItems
    } else if (r.items.length === 0) {
      r.status = 'draft'
    } else {
      r.status = 'qa_pending'
    }
  }
}

export function buildStagingRestaurants(opts: StagingBuildOptions): StagingRestaurant[] {
  const byBrand = collectCandidates(opts.brands, opts)
  const rankBasis =
    opts.rankBasis ??
    'official-ref > final-menu > restaurant-expanded (official description only)'

  return opts.brands.map(b => ({
    canonical_name: b.canonical_name,
    restaurant_sources: b.restaurant_sources.map(s => ({
      ...s,
      observed_at: opts.verifiedAt,
    })),
    items: byBrand.get(b.canonical_name) ?? [],
    status: 'draft' as const,
    top20_rank_basis: rankBasis,
  }))
}

export function collectStagingConflicts(
  restaurants: StagingRestaurant[]
): Array<{ store: string; name: string; issues: string[] }> {
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
  return conflicts
}

export interface SprintReportStats {
  confidence: Record<'A' | 'B' | 'C' | 'D', number>
  pending: number
  missingUrl: number
  production: string[]
  withItems: number
  totalItems: number
  prodCount: number
}

export function computeSprintReportStats(
  brands: StagingBuildBrand[],
  restaurants: StagingRestaurant[]
): SprintReportStats {
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

  return {
    confidence,
    pending,
    missingUrl,
    production,
    withItems: restaurants.filter(r => r.items.length > 0).length,
    totalItems: restaurants.reduce((n, r) => n + r.items.length, 0),
    prodCount: restaurants.filter(r => r.status === 'production_candidate').length,
  }
}

export function formatSprintBackfillReport(input: {
  sprintNumber: number
  sprintTarget: number
  brands: StagingBuildBrand[]
  restaurants: StagingRestaurant[]
  conflicts: Array<{ store: string; name: string; issues: string[] }>
  nextSprintSuggestions: string[]
  preservedFromPriorSprint?: number
}): string {
  const stats = computeSprintReportStats(input.brands, input.restaurants)
  const empty = input.brands.filter(
    b => !(input.restaurants.find(r => r.canonical_name === b.canonical_name)?.items.length)
  )

  const lines = [
    `# Menu Backfill Sprint ${input.sprintNumber} Report`,
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '> Staging only — NOT production. Zero hallucination policy.',
    '',
    '## 1. 本次處理餐廳數',
    '',
    `- Sprint 目標: **${input.sprintTarget}**`,
    ...(input.preservedFromPriorSprint
      ? [`- 沿用前 Sprint 餐廳: **${input.preservedFromPriorSprint}**`]
      : []),
    `- 本 Sprint 有寫入 staging 品項: **${stats.withItems}**`,
    `- production_candidate: **${stats.prodCount}**`,
    '',
    '## 2. 每家新增品項數',
    '',
    '| 餐廳 | 品項數 | 狀態 | 未滿額度原因 |',
    '|------|-------:|------|-------------|',
  ]

  for (const b of input.brands) {
    const r = input.restaurants.find(x => x.canonical_name === b.canonical_name)
    const n = r?.items.length ?? 0
    const reason =
      n === 0
        ? b.nutrition_source_url
          ? '無可追溯官方營養品項 — 未硬補'
          : '營養來源待人工確認 — 未 build'
        : n < b.target_items
          ? `額度 ${b.target_items}，目前可追溯 ${n} 道（官方資料不足，未硬補）`
          : '—'
    lines.push(`| ${b.canonical_name} | ${n} | ${r?.status ?? 'draft'} | ${reason} |`)
  }

  lines.push(
    '',
    '## 3. A/B/C/D 分布',
    '',
    '| Grade | Count |',
    '|-------|------:|',
    `| A | ${stats.confidence.A} |`,
    `| B | ${stats.confidence.B} |`,
    `| C | ${stats.confidence.C} |`,
    `| D | ${stats.confidence.D} |`,
    '',
    '## 4. pending_review 數量',
    '',
    `**${stats.pending}**`,
    '',
    '## 5. 沒有補滿額度的原因',
    '',
    '僅納入 official-ref、final-menu（超商鮮食）、restaurant-expanded（官方營養參考）且通過 QA 的品項。無來源不補。',
    '',
    '## 6. source_url 缺失數',
    '',
    `**${stats.missingUrl}**`,
    '',
    '## 7. nutrition conflict 清單',
    ''
  )

  if (!input.conflicts.length) lines.push('_無營養衝突_')
  else for (const c of input.conflicts.slice(0, 50)) {
    lines.push(`- ${c.store} · ${c.name}: ${c.issues.join('; ')}`)
  }

  lines.push('', '## 8. production_candidate 清單', '')
  if (!stats.production.length) lines.push('_尚無_')
  else for (const p of stats.production) lines.push(`- ${p}`)

  lines.push('', '## 9. 仍缺資料的餐廳', '')
  for (const b of empty) lines.push(`- ${b.canonical_name}`)

  lines.push('', '## 10. 下個 Sprint 建議', '')
  for (const s of input.nextSprintSuggestions) lines.push(`- ${s}`)
  lines.push('', '---', '', '**Awaiting Founder Review before promote to runtime.**')

  return lines.join('\n')
}
