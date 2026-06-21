#!/usr/bin/env npx tsx
/** Progress dashboard — brand coverage by KB category */
import fs from 'fs'
import path from 'path'
import {
  BRAND_REGISTRY,
  KB_CATEGORIES,
  brandsByCategory,
  type KbCategory,
} from '@/lib/food-kb/brand-registry'
import type { FoodKnowledgeGraph } from '@/lib/food-kb/types'

const GRAPH_PATH = path.join(process.cwd(), 'data', 'food-kb', 'graph.json')
const MANIFEST_PATH = path.join(process.cwd(), 'scripts', 'food-kb', 'seeds', 'generated', 'manifest.json')

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0
}

function main() {
  const graph = fs.existsSync(GRAPH_PATH)
    ? (JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8')) as FoodKnowledgeGraph)
    : null

  const presentBrands = new Set(graph?.brands.map(b => b.name_zh) ?? [])
  const itemsByStore = new Map<string, number>()
  for (const item of graph?.items ?? []) {
    itemsByStore.set(item.store_name, (itemsByStore.get(item.store_name) ?? 0) + 1)
  }

  console.log('\n╔══════════════════════════════════════════════════════╗')
  console.log('║     BetterBit Taiwan Food KB — Progress Dashboard    ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  if (graph) {
    console.log(`Graph updated: ${graph.updated_at}`)
    console.log(`Items: ${graph.stats.total_items} · Brands: ${graph.stats.total_brands} · Confidence: ${graph.stats.avg_confidence}`)
    console.log('')
  }

  console.log('── Category coverage ──')
  console.log('Category'.padEnd(16) + 'Brands'.padStart(8) + 'Covered'.padStart(10) + 'Items'.padStart(8) + '  %')
  console.log('─'.repeat(50))

  let totalBrands = 0
  let totalCovered = 0
  let totalItems = 0

  for (const cat of KB_CATEGORIES) {
    const brands = brandsByCategory(cat as KbCategory)
    const covered = brands.filter(b => presentBrands.has(b.name_zh) || itemsByStore.has(b.name_zh))
    const items = covered.reduce((s, b) => s + (itemsByStore.get(b.name_zh) ?? 0), 0)
    totalBrands += brands.length
    totalCovered += covered.length
    totalItems += items
    const p = pct(covered.length, brands.length)
    const bar = '█'.repeat(Math.floor(p / 10)) + '░'.repeat(10 - Math.floor(p / 10))
    console.log(
      cat.padEnd(16) +
      String(brands.length).padStart(8) +
      String(covered.length).padStart(10) +
      String(items).padStart(8) +
      `  ${p}% ${bar}`
    )
  }

  console.log('─'.repeat(50))
  console.log(
    'TOTAL'.padEnd(16) +
    String(totalBrands).padStart(8) +
    String(totalCovered).padStart(10) +
    String(totalItems).padStart(8) +
    `  ${pct(totalCovered, totalBrands)}%`
  )

  const missing = BRAND_REGISTRY.filter(
    b => !presentBrands.has(b.name_zh) && !itemsByStore.has(b.name_zh)
  )
  if (missing.length) {
    console.log(`\n── Top missing brands (${missing.length} total) ──`)
    for (const b of missing.sort((a, b) => b.priority - a.priority).slice(0, 20)) {
      console.log(`  [${b.kb_category}] ${b.name_zh}`)
    }
  }

  if (fs.existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as {
      generated_at: string
      total: number
      categories: Record<string, { count: number; brands: number }>
    }
    console.log(`\n── Seed manifest (${manifest.generated_at}) ──`)
    console.log(`   Generated seeds: ${manifest.total}`)
  }

  console.log('')
}

main()
