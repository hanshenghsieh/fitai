#!/usr/bin/env npx tsx
/**
 * Incremental food KB pipeline — never full rebuild
 *
 * Usage:
 *   npx tsx scripts/food-kb/pipeline.ts
 *   npx tsx scripts/food-kb/pipeline.ts --adapters legacy-menu,seven-eleven
 *   npx tsx scripts/food-kb/pipeline.ts --adapters open-food-facts --limit 200
 */
import fs from 'fs'
import path from 'path'
import {
  buildCoverageReport,
  emptyGraph,
  ingestBatch,
  nextId,
  type FoodKnowledgeGraph,
  type PipelineRunResult,
} from '@/lib/food-kb'
import { ALL_CRAWLER_IDS, getCrawler } from './crawlers/registry'

const DATA_DIR = path.join(process.cwd(), 'data', 'food-kb')
const GRAPH_PATH = path.join(DATA_DIR, 'graph.json')
const COVERAGE_PATH = path.join(DATA_DIR, 'coverage.json')
const MISSING_PATH = path.join(DATA_DIR, 'missing-foods.json')
const RUN_LOG_PATH = path.join(DATA_DIR, 'pipeline-runs.jsonl')

function parseArgs() {
  const args = process.argv.slice(2)
  let adapters = ALL_CRAWLER_IDS.filter(id => id !== 'menu-ocr')
  let limit: number | undefined
  let category: string | undefined
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--adapters' && args[i + 1]) {
      adapters = args[i + 1]!.split(',').map(s => s.trim())
      i++
    }
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1]!, 10)
      i++
    }
    if (args[i] === '--category' && args[i + 1]) {
      category = args[i + 1]!
      if (!adapters.includes('category-seeds')) {
        adapters = ['category-seeds', ...adapters.filter(a => a !== 'category-seeds')]
      }
      i++
    }
  }
  return { adapters, limit, category }
}

function loadGraph(): FoodKnowledgeGraph {
  if (!fs.existsSync(GRAPH_PATH)) return emptyGraph()
  return JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8')) as FoodKnowledgeGraph
}

function saveGraph(graph: FoodKnowledgeGraph) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2))
}

async function main() {
  const { adapters, limit, category } = parseArgs()
  const started = new Date().toISOString()
  const runId = nextId('run')
  const graph = loadGraph()
  const errors: string[] = []
  let itemsNew = 0
  let itemsUpdated = 0
  let observationsAdded = 0

  console.log(`\n🍜 Food KB Pipeline — incremental update`)
  console.log(`   Graph: ${GRAPH_PATH}`)
  console.log(`   Adapters: ${adapters.join(', ')}\n`)

  for (const adapterId of adapters) {
    const crawler = getCrawler(adapterId)
    if (!crawler) {
      errors.push(`Unknown adapter: ${adapterId}`)
      continue
    }

    console.log(`▶ ${crawler.name} (${adapterId})`)
    try {
      const result = await crawler.crawl({
        limit,
        ...(category && adapterId === 'category-seeds' ? { category } : {}),
      })
      const batch = ingestBatch(graph, result.observations)
      itemsNew += batch.newCount
      itemsUpdated += batch.updatedCount
      observationsAdded += result.observations.length
      console.log(`  ✓ ${result.fetched} fetched · ${batch.newCount} new · ${batch.updatedCount} updated · ${result.duration_ms}ms`)
      if (result.errors.length) {
        for (const e of result.errors) console.log(`  ⚠ ${e}`)
        errors.push(...result.errors.map(e => `${adapterId}: ${e}`))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${adapterId}: ${msg}`)
      console.log(`  ✗ ${msg}`)
    }
  }

  saveGraph(graph)

  const coverage = buildCoverageReport(graph)
  fs.writeFileSync(COVERAGE_PATH, JSON.stringify(coverage, null, 2))
  fs.writeFileSync(MISSING_PATH, JSON.stringify({
    generated_at: coverage.generated_at,
    missing_brands: coverage.missing_brands,
    gaps: coverage.gaps.filter(g => g.gap_type === 'missing_brand' || g.gap_type === 'missing_nutrition'),
  }, null, 2))

  const runResult: PipelineRunResult = {
    run_id: runId,
    started_at: started,
    finished_at: new Date().toISOString(),
    adapters_run: adapters,
    items_new: itemsNew,
    items_updated: itemsUpdated,
    clusters_merged: 0,
    observations_added: observationsAdded,
    gaps_detected: coverage.gaps.length,
    errors,
  }
  fs.appendFileSync(RUN_LOG_PATH, JSON.stringify(runResult) + '\n')

  console.log(`\n📊 Coverage`)
  console.log(`   Items: ${graph.stats.total_items}`)
  console.log(`   Clusters: ${graph.stats.total_clusters}`)
  console.log(`   Brands: ${graph.stats.total_brands}`)
  console.log(`   Observations: ${graph.stats.total_observations}`)
  console.log(`   Avg confidence: ${graph.stats.avg_confidence}`)
  console.log(`   Low confidence: ${graph.stats.low_confidence_count}`)
  console.log(`   Missing nutrition: ${graph.stats.missing_nutrition_count}`)
  console.log(`   Open gaps: ${coverage.gaps.length}`)
  console.log(`   Missing brands: ${coverage.missing_brands.length}`)
  console.log(`\n✓ Saved → ${GRAPH_PATH}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
