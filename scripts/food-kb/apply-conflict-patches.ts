#!/usr/bin/env npx tsx
/**
 * 依嚴格交叉驗證衝突報告，用官網/部落格營養覆寫 catalog 種子
 */
import fs from 'fs'
import path from 'path'
import { BRAND_REGISTRY } from '@/lib/food-kb/brand-registry'
import { runStrictValidation, type StrictItemResult } from '@/lib/food-kb/strict-validate'
import type { FoodKnowledgeGraph } from '@/lib/food-kb/types'

const GRAPH_PATH = path.join(process.cwd(), 'data', 'food-kb', 'graph.json')
const GEN_DIR = path.join(process.cwd(), 'scripts', 'food-kb', 'seeds', 'generated')
const PATCH_LOG = path.join(process.cwd(), 'data', 'food-kb', 'conflict-patches.json')

const TRUSTED_TYPES = new Set(['official_website', 'official_pdf', 'tfda_open_data', 'blog'])

function storeToSlug(store: string): string | undefined {
  const hit = BRAND_REGISTRY.find(b => b.name_zh === store)
  return hit?.slug
}

function relDiff(a: number, b: number): number {
  const d = Math.max(Math.abs(a), Math.abs(b), 1)
  return Math.abs(a - b) / d
}

function nameMatch(seedName: string, itemName: string): boolean {
  const norm = (s: string) =>
    s
      .replace(/\s/g, '')
      .replace(/[（(]大杯[）)]/g, '（大杯）')
      .replace(/[（(]中杯[）)]/g, '（中杯）')
      .replace(/[（(]小[）)]/g, '（小）')
  const a = norm(seedName)
  const b = norm(itemName)
  if (a === b) return true
  if (a.replace(/（大杯）|（中杯）|（小）/g, '') !== b.replace(/（大杯）|（中杯）|（小）/g, '')) {
    return false
  }
  return a === b
}

function trustedCalories(result: StrictItemResult, seedCal: number): number | null {
  const trusted = result.sources.filter(
    s => TRUSTED_TYPES.has(s.type) && s.calories && nameMatch(result.name, s.raw_name ?? result.name)
  )
  if (!trusted.length) return null

  const weights: Record<string, number> = {
    official_website: 0.95,
    official_pdf: 0.9,
    tfda_open_data: 0.92,
    blog: 0.6,
  }

  const cals = trusted.map(t => t.calories!)
  const spread =
    cals.length >= 2
      ? Math.max(...cals.map((a, i) => Math.max(...cals.slice(i + 1).map(b => relDiff(a, b)))))
      : 0

  const pool =
    spread > 0.2
      ? trusted.filter(t => relDiff(t.calories!, seedCal) <= 0.15)
      : trusted
  if (!pool.length) return null

  let sum = 0
  let w = 0
  for (const t of pool) {
    const tw = weights[t.type] ?? 0.5
    sum += t.calories! * tw
    w += tw
  }
  return Math.round(sum / w)
}

function applyPatches(graph: FoodKnowledgeGraph): { patched: number; skipped: number; details: unknown[] } {
  const { conflicts } = runStrictValidation(graph)
  const catalogStores = new Set(BRAND_REGISTRY.map(b => b.name_zh))
  const details: unknown[] = []
  let patched = 0
  let skipped = 0

  const targets = conflicts.filter(c => catalogStores.has(c.store))

  for (const file of fs.readdirSync(GEN_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json')) {
    const fp = path.join(GEN_DIR, file)
    const rows = JSON.parse(fs.readFileSync(fp, 'utf8')) as Array<Record<string, unknown>>
    let changed = false

    for (const row of rows) {
      const store = String(row.store ?? '')
      const name = String(row.name ?? '')
      const hit = targets.find(t => t.store === store && nameMatch(name, t.name))
      if (!hit) continue

      const oldCal = Number(row.calories) || 0
      const newCal = trustedCalories(hit, oldCal)
      if (newCal == null) {
        skipped++
        continue
      }
      if (!oldCal || Math.abs(newCal - oldCal) / oldCal < 0.08) {
        skipped++
        continue
      }
      if (relDiff(newCal, oldCal) > 0.35 && !hit.sources.some(s => s.type === 'official_website')) {
        skipped++
        continue
      }

      row.calories = newCal
      if (hit.sources.some(s => s.type === 'blog')) {
        row.description = `${store} · ${name} · 部落格交叉驗證`
      } else {
        row.description = `${store} · ${name} · 官網交叉驗證`
      }
      changed = true
      patched++
      details.push({
        store,
        name,
        slug: storeToSlug(store),
        old_cal: oldCal,
        new_cal: newCal,
        sources: hit.source_types.filter(t => TRUSTED_TYPES.has(t)),
      })
    }

    if (changed) fs.writeFileSync(fp, JSON.stringify(rows, null, 2))
  }

  return { patched, skipped, details }
}

function main() {
  if (!fs.existsSync(GRAPH_PATH)) {
    console.error('Run food-kb:xval first')
    process.exit(1)
  }
  const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8')) as FoodKnowledgeGraph
  const { patched, skipped, details } = applyPatches(graph)

  fs.mkdirSync(path.dirname(PATCH_LOG), { recursive: true })
  fs.writeFileSync(
    PATCH_LOG,
    JSON.stringify({ generated_at: new Date().toISOString(), patched, skipped, details }, null, 2)
  )

  console.log(`\n✅ 衝突修正: ${patched} 筆種子已更新（跳過 ${skipped} 筆）`)
  for (const d of (details as Array<{ store: string; name: string; old_cal: number; new_cal: number }>).slice(0, 15)) {
    console.log(`   · ${d.store} ${d.name}: ${d.old_cal} → ${d.new_cal} kcal`)
  }
  console.log(`\n→ ${PATCH_LOG}`)
}

main()
