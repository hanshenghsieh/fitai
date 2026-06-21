#!/usr/bin/env node
/**
 * 合併便利店 + 連鎖 + 外送 + 擴充菜單 → src/lib/convenience-store-menu.ts
 * 用法：npm run sync-menu
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 先產生擴充菜單
spawnSync(process.execPath, [path.join(__dirname, 'generate-expanded-menu.mjs')], { stdio: 'inherit' })

const convenience = JSON.parse(fs.readFileSync(path.join(__dirname, 'final-menu.json'), 'utf8'))
const chains = JSON.parse(fs.readFileSync(path.join(__dirname, 'restaurant-chains.json'), 'utf8'))
const expanded = JSON.parse(fs.readFileSync(path.join(__dirname, 'restaurant-expanded.json'), 'utf8'))
const chainExpansionPath = path.join(__dirname, 'food-kb/seeds/chain-expansion.json')
const chainExpansion = fs.existsSync(chainExpansionPath)
  ? JSON.parse(fs.readFileSync(chainExpansionPath, 'utf8'))
  : []

const generatedDir = path.join(__dirname, 'food-kb/seeds/generated')
const generatedSeeds = []
if (fs.existsSync(generatedDir)) {
  for (const file of fs.readdirSync(generatedDir)) {
    if (!file.endsWith('.json') || file === 'manifest.json') continue
    generatedSeeds.push(...JSON.parse(fs.readFileSync(path.join(generatedDir, file), 'utf8')))
  }
}

const withSource = convenience.map(item => ({
  ...item,
  source: item.source ?? 'convenience',
  role: item.role ?? 'combo',
  portionable: item.portionable ?? false,
  tags: item.tags ?? [],
}))

const seen = new Set(withSource.map(i => i.id))
const merged = [...withSource]
for (const item of [...chains, ...expanded, ...chainExpansion, ...generatedSeeds]) {
  const normalized = {
    role: 'combo',
    portionable: false,
    tags: [],
    ...item,
    source: item.source ?? 'chain',
  }
  if (normalized.store === '王品' || normalized.id.startsWith('王品-')) continue
  if (normalized.store.includes('精選')) continue
  if (!seen.has(normalized.id)) {
    merged.push(normalized)
    seen.add(normalized.id)
  }
}

const byCat = { breakfast: 0, lunch: 0, dinner: 0 }
const bySource = { convenience: 0, chain: 0, delivery: 0 }
for (const i of merged) {
  byCat[i.category] = (byCat[i.category] ?? 0) + 1
  bySource[i.source] = (bySource[i.source] ?? 0) + 1
}

const header = `// 外食菜單庫 — 便利店 + 連鎖餐廳 + 外送平台（${merged.length} 項）
// 早餐 ${byCat.breakfast} · 午餐 ${byCat.lunch} · 晚餐 ${byCat.dinner}
// 便利店 ${bySource.convenience ?? 0} · 連鎖 ${bySource.chain ?? 0} · 外送 ${bySource.delivery ?? 0}
// 更新：npm run sync-menu

export type EatOutSource = 'convenience' | 'chain' | 'delivery'
export type ItemRole = 'combo' | 'main' | 'protein' | 'carb' | 'side' | 'drink' | 'breakfast'

export interface ConvenienceItem {
  id: string
  name: string
  store: string
  source: EatOutSource
  category: 'breakfast' | 'lunch' | 'dinner'
  role: ItemRole
  portionable: boolean
  tags: string[]
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  price: number
  photo_url: string
  description: string
}

export const eatOutMenu: ConvenienceItem[] = `

const footer = `

/** 向後相容別名 */
export const convenienceStoreMenu = eatOutMenu

export function getEatOutItems(category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return eatOutMenu.filter(item => item.category === category)
}

/** @deprecated */
export function getConvenienceItems(category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return getEatOutItems(category)
}

export function getEatOutItemsByStore(store: string, category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return eatOutMenu.filter(item => item.store === store && item.category === category)
}

export function getEatOutStores(category?: 'breakfast' | 'lunch' | 'dinner'): string[] {
  const items = category ? eatOutMenu.filter(i => i.category === category) : eatOutMenu
  return [...new Set(items.map(i => i.store))].sort()
}

export function searchEatOutItems(
  category: 'breakfast' | 'lunch' | 'dinner',
  query: string,
  store?: string
): ConvenienceItem[] {
  const q = query.trim().toLowerCase()
  return getEatOutItems(category).filter(item => {
    if (store && store !== '全部' && item.store !== store) return false
    if (!q) return true
    return item.name.toLowerCase().includes(q) || item.store.toLowerCase().includes(q)
  })
}
`

fs.writeFileSync(
  path.join(__dirname, '../src/lib/convenience-store-menu.ts'),
  header + JSON.stringify(merged, null, 2) + footer
)

console.log(`✅ 已同步 ${merged.length} 項外食菜單`)
console.log(`   早餐 ${byCat.breakfast} · 午餐 ${byCat.lunch} · 晚餐 ${byCat.dinner}`)
console.log(`   便利店 ${bySource.convenience ?? 0} · 連鎖 ${bySource.chain ?? 0} · 外送 ${bySource.delivery ?? 0}`)
console.log(`   骰子可用品牌 ${[...new Set(merged.map(i => i.store))].length} 家（自動納入配餐）`)
