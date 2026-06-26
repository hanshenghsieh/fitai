#!/usr/bin/env npx tsx
/**
 * Seed Official Nutrition Reference (ONR) brand files from traceable sources only.
 * Sources: legacy official-ref.json, restaurant-expanded (官方營養參考), final-menu (7-11/全家 蛋白質+kcal).
 * Does NOT use delivery platforms, Google Maps, or AI estimates.
 */
import fs from 'fs'
import path from 'path'
import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import type { OfficialBrandReference, OfficialMenuItem, OfficialReferenceIndex } from '@/lib/nutrition/official-reference'
import { inferPriorityKind, priorityForKind } from '@/lib/nutrition/official-reference/priority'
import { normOnrName } from '@/lib/nutrition/official-reference/loader'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'data', 'food-kb', 'official-reference')
const LEGACY_REF = path.join(ROOT, 'scripts', 'food-kb', 'sources', 'official-ref.json')
const RESTAURANT_EXPANDED = path.join(ROOT, 'scripts', 'restaurant-expanded.json')
const FINAL_MENU = path.join(ROOT, 'scripts', 'final-menu.json')
const SPRINT1_BRANDS = path.join(ROOT, 'data', 'food-kb', 'staging', 'sprint-1', 'brands.json')

const VERIFIED_AT = '2026-06-25T12:00:00.000Z'
const VERIFIED_BY = 'onr-seed-sprint'

interface BrandSeedConfig {
  brand_id: string
  canonical_name: string
  store_aliases: string[]
  nutrition_source_url: string
  menu_target?: number
}

interface LegacyRow {
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
    fiber_g?: number
    sugar_g?: number
    sodium_mg?: number
  }
}

const OFFICIAL_DESC = /官方營養|咖啡連鎖官方|官網營養|連鎖官方參考/i
const CONV_DESC = /：\d+g 蛋白質，\d+ kcal/

function loadJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T
}

function loadBrandConfigs(): BrandSeedConfig[] {
  const sprint1 = loadJson<{ brands: Array<{ canonical_name: string; store_aliases: string[]; nutrition_source_url: string; target_items?: number }> }>(SPRINT1_BRANDS)
  const slugMap: Record<string, string> = {
    麥當勞: 'mcdonald',
    肯德基: 'kfc',
    摩斯漢堡: 'mos',
    Subway: 'subway',
    '7-11': '7eleven',
    全家: 'familymart',
    星巴克: 'starbucks',
    路易莎: 'louisa',
    'cama café': 'cama',
    Sukiya: 'sukiya',
    吉野家: 'yoshinoya',
    丸龜製麵: 'marugame',
    三商巧福: 'sunright',
    鬍鬚張: 'huzhang',
  }
  const extra: BrandSeedConfig[] = [
    {
      brand_id: 'dandan',
      canonical_name: '丹丹漢堡',
      store_aliases: ['丹丹漢堡'],
      nutrition_source_url: 'https://www.ddburger.com.tw/',
    },
    {
      brand_id: '85c',
      canonical_name: '85度C',
      store_aliases: ['85度C'],
      nutrition_source_url: 'https://www.85cafe.com/',
    },
    {
      brand_id: 'mrbrown',
      canonical_name: '伯朗咖啡',
      store_aliases: ['伯朗咖啡', '伯朗'],
      nutrition_source_url: 'https://www.mr-brown.com/',
    },
  ]

  const fromSprint = sprint1.brands
    .filter(b => slugMap[b.canonical_name])
    .map(b => ({
      brand_id: slugMap[b.canonical_name]!,
      canonical_name: b.canonical_name,
      store_aliases: b.store_aliases,
      nutrition_source_url: b.nutrition_source_url,
      menu_target: b.target_items,
    }))

  return [...fromSprint, ...extra]
}

function matchBrand(store: string, configs: BrandSeedConfig[]): BrandSeedConfig | null {
  return (
    configs.find(
      c => c.canonical_name === store || c.store_aliases.includes(store)
    ) ?? null
  )
}

function rowToMenuItem(
  input: {
    name: string
    aliases?: string[]
    calories: number
    protein: number
    fat: number
    carbs: number
    fiber?: number | null
    sugar?: number | null
    sodium?: number | null
    source_url: string
  }
): OfficialMenuItem {
  return {
    name: input.name,
    aliases: input.aliases,
    calories: input.calories,
    protein: input.protein,
    fat: input.fat,
    carbs: input.carbs,
    fiber: input.fiber ?? null,
    sugar: input.sugar ?? null,
    sodium: input.sodium ?? null,
    serving_size: null,
    source_url: input.source_url,
    verified_at: VERIFIED_AT,
    verified_by: VERIFIED_BY,
    verification_count: 1,
    confidence: 'A',
  }
}

function parseConvenienceDescription(desc: string): { protein: number; calories: number } | null {
  const m = desc.match(/：(\d+)g 蛋白質，(\d+) kcal/)
  if (!m) return null
  return { protein: Number(m[1]), calories: Number(m[2]) }
}

function main() {
  const configs = loadBrandConfigs()
  const menuByBrand = new Map<string, Map<string, OfficialMenuItem>>()

  for (const c of configs) {
    menuByBrand.set(c.brand_id, new Map())
  }

  function addItem(brandId: string, item: OfficialMenuItem) {
    const map = menuByBrand.get(brandId)
    if (!map) return
    const key = normOnrName(item.name)
    if (!map.has(key)) map.set(key, item)
  }

  if (fs.existsSync(LEGACY_REF)) {
    const legacy = loadJson<LegacyRow[]>(LEGACY_REF)
    for (const row of legacy) {
      const brand = matchBrand(row.store, configs)
      if (!brand) continue
      addItem(
        brand.brand_id,
        rowToMenuItem({
          name: row.name,
          aliases: row.aliases,
          calories: row.nutrition.calories,
          protein: row.nutrition.protein_g ?? 0,
          fat: row.nutrition.fat_g ?? 0,
          carbs: row.nutrition.carbs_g ?? 0,
          fiber: row.nutrition.fiber_g ?? null,
          sugar: row.nutrition.sugar_g ?? null,
          sodium: row.nutrition.sodium_mg ?? null,
          source_url: row.source_url,
        })
      )
    }
  }

  if (fs.existsSync(RESTAURANT_EXPANDED)) {
    const expanded = loadJson<ConvenienceItem[]>(RESTAURANT_EXPANDED)
    for (const raw of expanded) {
      if (!OFFICIAL_DESC.test(raw.description ?? '')) continue
      const brand = matchBrand(raw.store, configs)
      if (!brand) continue
      if (typeof raw.calories !== 'number') continue
      addItem(
        brand.brand_id,
        rowToMenuItem({
          name: raw.name,
          calories: raw.calories,
          protein: raw.protein_g ?? 0,
          fat: raw.fat_g ?? 0,
          carbs: raw.carbs_g ?? 0,
          fiber: raw.fiber_g ?? null,
          sugar: raw.sugar_g ?? null,
          sodium: raw.sodium_mg ?? null,
          source_url: brand.nutrition_source_url,
        })
      )
    }
  }

  if (fs.existsSync(FINAL_MENU)) {
    const finalMenu = loadJson<ConvenienceItem[]>(FINAL_MENU)
    for (const raw of finalMenu) {
      const brand = matchBrand(raw.store, configs)
      if (!brand) continue
      if (brand.brand_id !== '7eleven' && brand.brand_id !== 'familymart') continue
      const parsed = parseConvenienceDescription(raw.description ?? '')
      if (!parsed) continue
      addItem(
        brand.brand_id,
        rowToMenuItem({
          name: raw.name,
          calories: parsed.calories,
          protein: parsed.protein,
          fat: raw.fat_g ?? 0,
          carbs: raw.carbs_g ?? 0,
          source_url: brand.nutrition_source_url,
        })
      )
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const indexBrands: OfficialReferenceIndex['brands'] = []

  for (const config of configs) {
    const items = [...(menuByBrand.get(config.brand_id)?.values() ?? [])]
    const kind = inferPriorityKind(config.nutrition_source_url)
    const ref: OfficialBrandReference = {
      metadata: {
        brand_id: config.brand_id,
        canonical_name: config.canonical_name,
        store_aliases: config.store_aliases,
        nutrition_source_url: config.nutrition_source_url,
        last_verified: VERIFIED_AT,
        official_version: '1.0.0',
        country: 'TW',
        source_priority: priorityForKind(kind),
        source_priority_kind: kind,
      },
      menu: items,
    }
    const file = `${config.brand_id}.json`
    fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(ref, null, 2))
    indexBrands.push({
      brand_id: config.brand_id,
      canonical_name: config.canonical_name,
      file,
      menu_count: items.length,
    })
  }

  const index: OfficialReferenceIndex = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    policy: 'official_nutrition_reference',
    brand_count: indexBrands.length,
    brands: indexBrands,
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2))

  const totalMenu = indexBrands.reduce((n, b) => n + b.menu_count, 0)
  console.log('\n=== Official Nutrition Reference Seed ===\n')
  console.log(`Brands: ${indexBrands.length}`)
  console.log(`Menu items: ${totalMenu}`)
  for (const b of indexBrands) {
    console.log(`  ${b.canonical_name}: ${b.menu_count}`)
  }
  console.log(`\nOutput: ${OUT_DIR}\n`)
}

main()
