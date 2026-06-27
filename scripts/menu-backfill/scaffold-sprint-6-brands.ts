#!/usr/bin/env npx tsx
/** Scaffold Sprint 6 — first P0 partial batch from dice-backfill-queue.json */
import fs from 'fs'
import path from 'path'
import type { AllowlistFile } from '@/lib/nutrition/restaurant-menu-audit'
import {
  allowlistAliasesForBrand,
  getDiceBackfillBatch,
  resolveBrandNutritionUrl,
  type DiceBackfillQueue,
} from '@/lib/nutrition/dice-backfill-queue'

const ROOT = process.cwd()
const QUEUE_PATH = path.join(ROOT, 'data', 'food-kb', 'staging', 'dice-backfill-queue.json')
const ALLOWLIST_PATH = path.join(ROOT, 'data', 'food-kb', 'food-source-allowlist.json')
const OUT = path.join(ROOT, 'data', 'food-kb', 'staging', 'sprint-6', 'brands.json')
const BATCH_ID = process.env.SPRINT_BATCH ?? 'sprint-6'

function enc(s: string) {
  return encodeURIComponent(s)
}

function main() {
  if (!fs.existsSync(QUEUE_PATH)) {
    console.error(`Missing ${QUEUE_PATH}. Run: npm run backfill:generate-queue`)
    process.exit(1)
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8')) as DiceBackfillQueue
  const batch = getDiceBackfillBatch(queue, BATCH_ID)
  if (!batch) {
    console.error(`Batch ${BATCH_ID} not found in queue`)
    process.exit(1)
  }

  const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8')) as AllowlistFile

  const brands = batch.brands.map(row => {
    const url = resolveBrandNutritionUrl(row.canonical_name)
    const aliases = allowlistAliasesForBrand(allowlist, row.canonical_name)
    return {
      canonical_name: row.canonical_name,
      store_aliases: aliases,
      group: batch.phase,
      sprint6_theme: batch.theme,
      allowlist_rank: row.rank,
      backfill_status: row.status,
      dice_recommendable_main_count: row.dice_recommendable_main_count,
      restaurant_sources: [
        {
          priority: 'A' as const,
          source_type: 'official_website' as const,
          source_url: url,
          source_name: `${row.canonical_name} 官網/營養`,
          observed_at: new Date().toISOString(),
        },
        {
          priority: 'B' as const,
          source_type: 'google_maps' as const,
          source_url: `https://www.google.com/maps/search/${enc(row.canonical_name)}`,
          source_name: `Google Maps ${row.canonical_name}`,
          observed_at: new Date().toISOString(),
        },
      ],
      nutrition_source_url: url,
      target_items: 20,
      sprint: batch.sprint,
      status: 'draft',
    }
  })

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        sprint: batch.sprint,
        batch_id: batch.batch_id,
        phase: batch.phase,
        theme: batch.theme,
        generated_at: new Date().toISOString(),
        policy: 'zero_hallucination',
        brands,
      },
      null,
      2
    )
  )

  console.log(`Sprint ${batch.sprint} (${batch.phase}): ${brands.length} brands`)
  console.log(`Written: ${OUT}`)
}

main()
