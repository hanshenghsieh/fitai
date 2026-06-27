#!/usr/bin/env npx tsx
/** Scaffold P0 Retail ONR Rescue — 3 brands only (not Sprint 7 bulk). */
import fs from 'fs'
import path from 'path'
import { P0_RETAIL_ONR_CONFIG } from '@/lib/nutrition/p0-retail-onr'

const OUT = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'p0-retail-onr-rescue', 'brands.json')

function main() {
  const brands = Object.values(P0_RETAIL_ONR_CONFIG).map(c => ({
    canonical_name: c.canonical_name,
    store_aliases: c.store_aliases,
    group: 'p0_retail_onr_rescue',
    restaurant_sources: [
      {
        priority: 'A' as const,
        source_type: 'official_website' as const,
        source_url: c.nutrition_source_url,
        source_name: `${c.canonical_name} 官方鮮食/熟食`,
        observed_at: new Date().toISOString(),
      },
      {
        priority: 'B' as const,
        source_type: 'official_mall' as const,
        source_url: c.nutrition_source_url,
        source_name: `${c.canonical_name} ONR`,
        observed_at: new Date().toISOString(),
      },
    ],
    nutrition_source_url: c.nutrition_source_url,
    target_items: 20,
    sprint: 'p0-retail-onr-rescue',
    status: 'draft',
  }))

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        sprint: 'p0-retail-onr-rescue',
        theme: 'P0 零售 ONR Rescue',
        generated_at: new Date().toISOString(),
        policy: 'zero_hallucination',
        brands,
      },
      null,
      2
    )
  )
  console.log(`P0 retail ONR rescue scaffold: ${brands.length} brands`)
  console.log(`Written: ${OUT}`)
}

main()
