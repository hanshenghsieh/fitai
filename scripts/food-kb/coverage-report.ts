#!/usr/bin/env npx tsx
/** Print coverage dashboard from data/food-kb/graph.json */
import fs from 'fs'
import path from 'path'
import { buildCoverageReport, type FoodKnowledgeGraph } from '@/lib/food-kb'

const GRAPH_PATH = path.join(process.cwd(), 'data', 'food-kb', 'graph.json')

function main() {
  if (!fs.existsSync(GRAPH_PATH)) {
    console.log('No graph yet. Run: npm run food-kb:sync')
    process.exit(1)
  }

  const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8')) as FoodKnowledgeGraph
  const report = buildCoverageReport(graph)

  console.log('\n═══════════════════════════════════════')
  console.log('  Taiwan Food KB — Coverage Report')
  console.log('═══════════════════════════════════════\n')
  console.log(`Generated: ${report.generated_at}`)
  console.log(`Items:         ${report.stats.total_items}`)
  console.log(`Clusters:      ${report.stats.total_clusters}`)
  console.log(`Brands:        ${report.stats.total_brands}`)
  console.log(`Observations:  ${report.stats.total_observations}`)
  console.log(`Avg confidence: ${report.stats.avg_confidence}`)
  console.log(`Low confidence: ${report.stats.low_confidence_count}`)
  console.log(`Missing kcal:   ${report.stats.missing_nutrition_count}`)

  console.log('\n── Top brands ──')
  for (const b of report.top_brands_by_items.slice(0, 15)) {
    console.log(`  ${b.name_zh.padEnd(16)} ${b.count}`)
  }

  console.log('\n── Missing target brands ──')
  for (const b of report.missing_brands.slice(0, 20)) {
    console.log(`  ✗ ${b}`)
  }

  console.log('\n── High priority gaps ──')
  for (const g of report.gaps.filter(x => x.priority >= 7).slice(0, 15)) {
    console.log(`  [${g.gap_type}] ${g.description}`)
  }

  if (report.stale_items.length) {
    console.log(`\n── Stale items (30d+): ${report.stale_items.length} ──`)
  }
  console.log('')
}

main()
