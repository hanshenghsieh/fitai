#!/usr/bin/env npx tsx
/**
 * Export knowledge graph → runtime JSON for sync-menu integration
 * Output: data/food-kb/runtime-menu.json
 */
import fs from 'fs'
import path from 'path'
import { itemToRuntimeMenu, type FoodKnowledgeGraph } from '@/lib/food-kb'

const GRAPH_PATH = path.join(process.cwd(), 'data', 'food-kb', 'graph.json')
const OUT_PATH = path.join(process.cwd(), 'data', 'food-kb', 'runtime-menu.json')

function main() {
  if (!fs.existsSync(GRAPH_PATH)) {
    console.log('Run pipeline first: npm run food-kb:sync')
    process.exit(1)
  }

  const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8')) as FoodKnowledgeGraph
  const items = graph.items
    .filter(i => i.is_available && i.nutrition.calories)
    .map(i => itemToRuntimeMenu(i, graph.clusters.find(c => c.id === i.cluster_id)))
    .sort((a, b) => a.store.localeCompare(b.store) || a.name.localeCompare(b.name))

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(items, null, 2))

  const byStore = new Map<string, number>()
  for (const i of items) byStore.set(i.store, (byStore.get(i.store) ?? 0) + 1)

  console.log(`\n✓ Exported ${items.length} items → ${OUT_PATH}`)
  console.log(`  Stores: ${byStore.size}`)
  for (const [store, count] of [...byStore.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${store}: ${count}`)
  }
}

main()
