#!/usr/bin/env npx tsx
/**
 * Food Intelligence Layer — staging QA items only.
 * Does NOT modify production, runtime DB, or nutrition values.
 */
import fs from 'fs'
import path from 'path'
import type { StagingManifest } from '@/lib/nutrition/menu-backfill/types'
import {
  formatIntelligenceReportMd,
  runFoodIntelligenceLayer,
  type FoodIntelligenceItemInput,
} from '@/lib/nutrition/food-intelligence'

const STAGING_MANIFEST = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'manifest.json')
const OUT_MANIFEST = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'food-intelligence-manifest.json')
const OUT_REPORT = path.join(process.cwd(), 'docs', 'FOOD_INTELLIGENCE_LAYER_REPORT.md')
const OUT_DOC = path.join(process.cwd(), 'docs', 'FOOD_INTELLIGENCE_LAYER.md')

function loadStagingItems(): FoodIntelligenceItemInput[] {
  if (!fs.existsSync(STAGING_MANIFEST)) return []
  const staging = JSON.parse(fs.readFileSync(STAGING_MANIFEST, 'utf8')) as StagingManifest
  const items: FoodIntelligenceItemInput[] = []
  for (const r of staging.restaurants) {
    if (r.status !== 'production_candidate' && r.status !== 'promoted') continue
    for (const item of r.items) {
      const conf = item.verification?.confidence ?? item.nutrition_trace?.confidence
      if (conf === 'D') continue
      items.push({
        id: item.id,
        name: item.name,
        store: item.store,
        source: item.source,
        category: item.category,
        role: item.role,
        tags: item.tags,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g,
        sugar_g: item.sugar_g,
        sodium_mg: item.sodium_mg,
        verification: item.verification,
        nutrition_trace: item.nutrition_trace,
      })
    }
  }
  return items
}

function writeDoc() {
  const doc = `# Food Intelligence Layer

> **Staging / food-kb only** — does not modify production, runtime database, or nutrition source values.

## Purpose

Upgrade BetterBit from a menu database to a **weight-loss decision layer** by attaching rule-based, explainable intelligence fields to QA-passed staging items.

## Fields

| Field | Description |
|-------|-------------|
| \`popularity_score\` | 0–100 ranking weight (rule-based, not default 100) |
| \`meal_context\` | breakfast / lunch / dinner / late_night / snack scores |
| \`diet_tags\` | high_protein, low_calorie, weight_loss, etc. |
| \`food_category\` | 主餐 / 副餐 / 飲料 / 手搖飲 / … |
| \`satiety_score\` | 0–100 from protein, fiber, calorie density, processing |
| \`processing_level\` | whole_food → ultra_processed |
| \`recommended_addons\` | Separate catalog items only — **not official combos** |
| \`recommended_replacements\` | Alternative suggestions — **does not rename original dish** |
| \`recommendation_rules\` | Why suitable / unsuitable for recommendation |
| \`meal_graph_edges\` | main→side/drink/replacement edges; D-grade blocked at runtime |

## Commands

\`\`\`bash
npm run food-intelligence:layer
npm test   # includes food-intelligence tests
\`\`\`

## Output

- \`data/food-kb/staging/food-intelligence-manifest.json\`
- \`docs/FOOD_INTELLIGENCE_LAYER_REPORT.md\`

## Rollback

Delete \`food-intelligence-manifest.json\` — no schema migration, no production impact.
`
  fs.mkdirSync(path.dirname(OUT_DOC), { recursive: true })
  fs.writeFileSync(OUT_DOC, doc)
}

function main() {
  const items = loadStagingItems()
  const { manifest, report } = runFoodIntelligenceLayer(items, {
    source_manifest: 'data/food-kb/staging/manifest.json',
  })

  fs.mkdirSync(path.dirname(OUT_MANIFEST), { recursive: true })
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2))
  fs.writeFileSync(OUT_REPORT, formatIntelligenceReportMd(report))
  writeDoc()

  console.log('\n=== Food Intelligence Layer ===\n')
  console.log(`Items: ${report.items_processed}`)
  console.log(`Coverage: ${report.coverage_pct}%`)
  console.log(`High risk: ${report.high_risk_count}`)
  console.log(`meal_graph_edges: ${report.meal_graph_edges}`)
  console.log(`recommended_addons: ${report.recommended_addons}`)
  console.log(`recommended_replacements: ${report.recommended_replacements}`)
  console.log(`\nManifest: ${OUT_MANIFEST}`)
  console.log(`Report: ${OUT_REPORT}\n`)
}

main()
