#!/usr/bin/env npx tsx
/**
 * 嚴格交叉驗證：官網 + 部落格爬蟲 → 圖譜合併 → 驗證報告 → 種子覆寫
 *
 * Usage: npx tsx scripts/food-kb/strict-xval.ts
 */
import fs from 'fs'
import path from 'path'
import {
  buildCoverageReport,
  emptyGraph,
  ingestBatch,
  type FoodKnowledgeGraph,
} from '@/lib/food-kb'
import { runStrictValidation, validatedNutritionForItem } from '@/lib/food-kb/strict-validate'
import { officialNutritionCrawler } from './crawlers/official-nutrition'
import { blogNutritionCrawler } from './crawlers/blog-nutrition'

const DATA_DIR = path.join(process.cwd(), 'data', 'food-kb')
const GRAPH_PATH = path.join(DATA_DIR, 'graph.json')
const REPORT_PATH = path.join(DATA_DIR, 'xval-report.json')
const GEN_DIR = path.join(process.cwd(), 'scripts', 'food-kb', 'seeds', 'generated')

function loadGraph(): FoodKnowledgeGraph {
  if (!fs.existsSync(GRAPH_PATH)) return emptyGraph()
  return JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8')) as FoodKnowledgeGraph
}

function saveGraph(graph: FoodKnowledgeGraph) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2))
}

function applyValidatedToSeeds(graph: FoodKnowledgeGraph): number {
  let patched = 0
  if (!fs.existsSync(GEN_DIR)) return 0

  const validatedItems = graph.items.filter(item => {
    const r = runStrictValidation(graph).validated.find(v => v.item_id === item.id)
    return !!r
  })

  for (const item of validatedItems) {
    const nutrition = validatedNutritionForItem(graph, item)
    if (!nutrition?.calories) continue

    const legacyId = item.legacy_id ?? `${item.brand_slug}-${item.name_normalized}`
    for (const file of fs.readdirSync(GEN_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json')) {
      const fp = path.join(GEN_DIR, file)
      const parsed = JSON.parse(fs.readFileSync(fp, 'utf8'))
      if (!Array.isArray(parsed)) continue
      const rows = parsed as Array<Record<string, unknown>>
      let changed = false
      for (const row of rows) {
        const match =
          row.id === legacyId ||
          (row.store === item.store_name && row.name === item.name_zh)
        if (!match) continue
        row.calories = nutrition.calories
        if (nutrition.protein_g != null) row.protein_g = nutrition.protein_g
        if (nutrition.carbs_g != null) row.carbs_g = nutrition.carbs_g
        if (nutrition.fat_g != null) row.fat_g = nutrition.fat_g
        if (nutrition.sugar_g != null) row.sugar_g = nutrition.sugar_g
        row.description = `${item.store_name} · ${row.name} · 交叉驗證（官網+部落格）`
        changed = true
        patched++
      }
      if (changed) fs.writeFileSync(fp, JSON.stringify(rows, null, 2))
    }
  }
  return patched
}

async function main() {
  const graph = loadGraph()
  const errors: string[] = []
  let observationsAdded = 0

  console.log('\n🔬 Food KB — 嚴格交叉驗證（官網 + 部落格）\n')

  const crawlers = [officialNutritionCrawler, blogNutritionCrawler]
  for (const crawler of crawlers) {
    console.log(`▶ ${crawler.name}`)
    try {
      const result = await crawler.crawl({ limit: 500 })
      const batch = ingestBatch(graph, result.observations)
      observationsAdded += result.observations.length
      console.log(
        `  ✓ ${result.fetched} obs · ${batch.newCount} new · ${batch.updatedCount} updated`
      )
      if (result.errors.length) {
        for (const e of result.errors) console.log(`  ⚠ ${e}`)
        errors.push(...result.errors)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`  ✗ ${msg}`)
      errors.push(msg)
    }
  }

  saveGraph(graph)

  const xval = runStrictValidation(graph)
  const report = {
    generated_at: new Date().toISOString(),
    observations_added: observationsAdded,
    stats: graph.stats,
    summary: {
      total_items: xval.results.length,
      validated: xval.validated.length,
      conflicts: xval.conflicts.length,
      insufficient: xval.insufficient.length,
      estimated_only: xval.estimated_only.length,
    },
    validated_samples: xval.validated.slice(0, 30),
    conflict_samples: xval.conflicts.slice(0, 20),
    errors,
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))

  const patched = applyValidatedToSeeds(graph)
  if (patched > 0) {
    console.log(`\n📝 已將 ${patched} 筆嚴格驗證營養寫回 seeds/generated/`)
  }

  const coverage = buildCoverageReport(graph)
  fs.writeFileSync(path.join(DATA_DIR, 'coverage.json'), JSON.stringify(coverage, null, 2))

  console.log('\n📊 嚴格交叉驗證結果')
  console.log(`   觀測新增: ${observationsAdded}`)
  console.log(`   圖譜品項: ${graph.stats.total_items}`)
  console.log(`   平均信心: ${graph.stats.avg_confidence}`)
  console.log(`   ✅ 嚴格通過: ${xval.validated.length}`)
  console.log(`   ⚠️  衝突: ${xval.conflicts.length}`)
  console.log(`   📋 資料不足: ${xval.insufficient.length}`)
  console.log(`   📌 僅估計: ${xval.estimated_only.length}`)
  console.log(`   種子覆寫: ${patched} 筆`)

  if (xval.validated.length) {
    console.log('\n   通過範例:')
    for (const v of xval.validated.slice(0, 8)) {
      console.log(
        `   · ${v.store} ${v.name} → ${v.calories_validated} kcal (Δ${v.cal_delta_pct ?? 0}%) [${v.source_types.join('+')}]`
      )
    }
  }

  if (xval.conflicts.length) {
    console.log('\n   衝突範例:')
    for (const v of xval.conflicts.slice(0, 5)) {
      console.log(
        `   · ${v.store} ${v.name} 估${v.calories_estimated} vs 驗${v.calories_validated} (Δ${v.cal_delta_pct ?? '?'}%)`
      )
    }
  }

  console.log(`\n✓ 報告 → ${REPORT_PATH}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
