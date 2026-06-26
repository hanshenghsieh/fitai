#!/usr/bin/env node
/**
 * Generate food_aliases.json — deterministic, no AI.
 * Run: node scripts/nutrition/generate-food-aliases.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const MENU = path.join(ROOT, 'data/food-kb/menu-lookup-index.json')
const OUT = path.join(ROOT, 'src/lib/nutrition/alias-engine/food_aliases.json')

const CURATED = [
  {
    official_name: '雞排',
    aliases: ['炸雞排', '香雞排', '無骨雞排', '豪大雞排', '派克雞排', '惡魔雞排', '雞排飯'],
    restaurant_aliases: [],
  },
  {
    official_name: 'Subway',
    store: 'Subway',
    aliases: ['SUBWAY', 'Sub Way', '潛艇堡', 'subway'],
    restaurant_aliases: ['SUBWAY', 'Sub Way', '潛艇堡'],
  },
  {
    official_name: '椰香綠咖哩嫩雞飯',
    store: '7-11',
    aliases: ['綠咖哩雞飯', '椰香咖哩雞飯', '711綠咖哩', '7-11綠咖哩雞飯'],
    restaurant_aliases: ['711', '7-11', '統一超商'],
  },
  {
    official_name: '竹筍排骨湯',
    store: '7-11',
    aliases: ['711竹筍湯', '711排骨湯', '竹筍湯排骨', '7-11竹筍排骨湯'],
    restaurant_aliases: ['711', '7-11'],
  },
  {
    official_name: '滷肉飯',
    aliases: ['魯肉飯', '滷肉便當', '魯肉便當'],
    restaurant_aliases: [],
  },
  {
    official_name: '珍珠奶茶',
    aliases: ['波霸奶茶', '粉圓奶茶', '珍奶', '黑糖珍奶'],
    restaurant_aliases: [],
  },
]

function norm(s) {
  return s
    .replace(/[（(].*?[)）]/g, '')
    .replace(/[^\u4e00-\u9fffA-Za-z0-9+]/g, '')
    .toLowerCase()
    .trim()
}

function variants(name) {
  const out = new Set()
  const n = name.trim()
  if (!n) return []
  out.add(n)
  out.add(n.replace(/\s+/g, ''))
  if (n.length > 4) out.add(n.slice(0, 4))
  if (n.length > 6) out.add(n.slice(-6))
  if (n.includes('雞')) out.add(n.replace(/雞/g, '鸡'))
  if (n.includes('麵')) out.add(n.replace(/麵/g, '面'))
  if (n.includes('飯')) out.add(n.replace(/飯/g, '饭'))
  if (n.includes('（')) out.add(n.split('（')[0].trim())
  return [...out].filter(a => a.length >= 2 && a !== n)
}

function main() {
  const menu = JSON.parse(fs.readFileSync(MENU, 'utf8'))
  const entries = []
  const aliasSet = new Set()

  function addEntry(entry) {
    const key = `${entry.store ?? ''}::${norm(entry.official_name)}`
    const filteredAliases = (entry.aliases ?? []).filter(a => {
      const ak = `${entry.store ?? ''}::${norm(a)}`
      if (aliasSet.has(ak)) return false
      if (norm(a) === norm(entry.official_name)) return false
      aliasSet.add(ak)
      return true
    })
    if (!filteredAliases.length && !entry.restaurant_aliases?.length) return
    entries.push({
      official_name: entry.official_name,
      ...(entry.store ? { store: entry.store } : {}),
      ...(entry.item_id ? { item_id: entry.item_id } : {}),
      aliases: filteredAliases,
      restaurant_aliases: entry.restaurant_aliases ?? [],
    })
  }

  for (const c of CURATED) addEntry(c)

  for (const item of menu.items) {
    const als = variants(item.name)
    if (item.store === 'Subway') {
      als.push('潛艇堡', 'SUBWAY', 'subway')
    }
    if (item.store === '7-11') {
      als.push(`711${item.name}`, `7-11${item.name}`)
    }
    addEntry({
      official_name: item.name,
      store: item.store,
      item_id: item.id,
      aliases: als,
      restaurant_aliases: item.store === '7-11' ? ['711', '7-11'] : item.store === '全家' ? ['全家', 'familymart'] : [],
    })
  }

  const BRAND_PAIRS = [
    ['麥當勞', 'mcdonalds', 'McDonalds'],
    ['肯德基', 'kfc', 'KFC'],
    ['摩斯漢堡', '摩斯', 'mos'],
    ['星巴克', 'starbucks'],
    ['五十嵐', '50嵐'],
    ['清心福全', '清心'],
    ['路易莎', 'louisa'],
  ]
  for (const [official, ...als] of BRAND_PAIRS) {
    addEntry({ official_name: official, aliases: als, restaurant_aliases: als })
  }

  const totalAliases = entries.reduce((s, e) => s + e.aliases.length + e.restaurant_aliases.length, 0)
  const doc = {
    version: 1,
    generated_at: new Date().toISOString(),
    entry_count: entries.length,
    alias_count: totalAliases,
    entries,
  }
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2), 'utf8')
  console.log(`Wrote ${OUT}: ${entries.length} entries, ${totalAliases} aliases`)
  if (totalAliases < 500) {
    console.warn(`WARN: alias_count ${totalAliases} < 500`)
    process.exitCode = 1
  }
}

main()
