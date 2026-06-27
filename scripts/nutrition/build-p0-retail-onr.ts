#!/usr/bin/env npx tsx
/**
 * Build P0 retail ONR files from Founder-curated JSON (zero hallucination).
 * Run: npm run onr:p0-retail
 */
import fs from 'fs'
import path from 'path'
import type { OfficialBrandReference, OfficialReferenceIndex } from '@/lib/nutrition/official-reference/types'
import { inferPriorityKind, priorityForKind } from '@/lib/nutrition/official-reference/priority'
import {
  curatedItemToOfficialMenuItem,
  P0_RETAIL_ONR_CONFIG,
  validateP0RetailOnrItem,
  type P0RetailOnrCuratedFile,
} from '@/lib/nutrition/p0-retail-onr'

const ROOT = process.cwd()
const CURATED = path.join(ROOT, 'data', 'food-kb', 'staging', 'p0-retail-onr-curated.json')
const OUT_DIR = path.join(ROOT, 'data', 'food-kb', 'official-reference')
const INDEX = path.join(OUT_DIR, 'index.json')

function main() {
  const curated = JSON.parse(fs.readFileSync(CURATED, 'utf8')) as P0RetailOnrCuratedFile
  const rejected: Array<{ brand_id: string; name: string; reasons: string[] }> = []
  const accepted: Record<string, number> = {}

  for (const brand of curated.brands) {
    const config = P0_RETAIL_ONR_CONFIG[brand.brand_id]
    const menu = []
    for (const item of brand.items) {
      const gate = validateP0RetailOnrItem(item)
      if (!gate.ok) {
        rejected.push({ brand_id: brand.brand_id, name: item.name, reasons: gate.reasons })
        continue
      }
      menu.push(curatedItemToOfficialMenuItem(item))
    }
    accepted[brand.brand_id] = menu.length

    const kind = inferPriorityKind(config.nutrition_source_url)
    const ref: OfficialBrandReference = {
      metadata: {
        brand_id: config.brand_id,
        canonical_name: config.canonical_name,
        store_aliases: config.store_aliases,
        nutrition_source_url: config.nutrition_source_url,
        last_verified: new Date().toISOString(),
        official_version: '1.0.0-p0-retail-rescue',
        country: 'TW',
        source_priority: priorityForKind(kind),
        source_priority_kind: kind,
      },
      menu,
    }
    fs.writeFileSync(path.join(OUT_DIR, `${config.brand_id}.json`), JSON.stringify(ref, null, 2))
  }

  const existing = fs.existsSync(INDEX)
    ? (JSON.parse(fs.readFileSync(INDEX, 'utf8')) as OfficialReferenceIndex)
    : null
  const keep = (existing?.brands ?? []).filter(
    b => !['hilife', 'okmart', 'pxmart'].includes(b.brand_id)
  )
  const added = Object.values(P0_RETAIL_ONR_CONFIG).map(c => ({
    brand_id: c.brand_id,
    canonical_name: c.canonical_name,
    file: `${c.brand_id}.json`,
    menu_count: accepted[c.brand_id] ?? 0,
  }))
  const brands = [...keep, ...added].sort((a, b) => a.brand_id.localeCompare(b.brand_id))
  const index: OfficialReferenceIndex = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    policy: 'official_nutrition_reference',
    brand_count: brands.length,
    brands,
  }
  fs.writeFileSync(INDEX, JSON.stringify(index, null, 2))

  console.log('\n=== P0 Retail ONR Build ===\n')
  for (const [id, n] of Object.entries(accepted)) {
    console.log(`  ${id}: ${n} A/B items`)
  }
  console.log(`  rejected: ${rejected.length}`)
  console.log(`  blocked (curated): ${curated.blocked.length}`)
  if (rejected.length) {
    rejected.forEach(r => console.log(`    ✗ ${r.brand_id} ${r.name}: ${r.reasons.join('; ')}`))
  }
  console.log(`\nOutput: ${OUT_DIR}\n`)
}

main()
