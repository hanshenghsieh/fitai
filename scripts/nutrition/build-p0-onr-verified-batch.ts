#!/usr/bin/env npx tsx
/**
 * Build official-reference files from p0-onr-verified-batch curated items.
 * Run: npm run onr:p0-verified-batch
 */
import fs from 'fs'
import path from 'path'
import type { OfficialBrandReference } from '@/lib/nutrition/official-reference/types'
import { inferPriorityKind, priorityForKind } from '@/lib/nutrition/official-reference/priority'
import {
  curatedItemToOfficialMenuItem,
  validateP0RetailOnrItem,
  type P0RetailOnrCuratedItem,
} from '@/lib/nutrition/p0-retail-onr'

const ROOT = process.cwd()
const BATCH = path.join(ROOT, 'data/food-kb/staging/p0-onr-verified-batch/brands.json')
const OUT_DIR = path.join(ROOT, 'data/food-kb/official-reference')

interface VerifiedBrand {
  brand_id: string
  canonical_name: string
  store_aliases: string[]
  nutrition_source_url: string
  items: P0RetailOnrCuratedItem[]
}

function main() {
  const batch = JSON.parse(fs.readFileSync(BATCH, 'utf8')) as { brands: VerifiedBrand[] }
  let total = 0
  const rejected: Array<{ brand_id: string; name: string; reasons: string[] }> = []

  for (const brand of batch.brands) {
    if (!brand.items?.length) continue
    const menu = []
    for (const item of brand.items) {
      const gate = validateP0RetailOnrItem(item)
      if (!gate.ok) {
        rejected.push({ brand_id: brand.brand_id, name: item.name, reasons: gate.reasons })
        continue
      }
      menu.push(curatedItemToOfficialMenuItem(item))
    }
    if (!menu.length) continue
    total += menu.length

    const kind = inferPriorityKind(brand.nutrition_source_url)
    const ref: OfficialBrandReference = {
      metadata: {
        brand_id: brand.brand_id,
        canonical_name: brand.canonical_name,
        store_aliases: brand.store_aliases,
        nutrition_source_url: brand.nutrition_source_url,
        last_verified: new Date().toISOString(),
        official_version: '1.0.0-p0-verified-batch',
        country: 'TW',
        source_priority: priorityForKind(kind),
        source_priority_kind: kind,
      },
      menu,
    }
    const outPath = path.join(OUT_DIR, `${brand.brand_id}.json`)
    fs.writeFileSync(outPath, JSON.stringify(ref, null, 2) + '\n', 'utf8')
    console.log(`OK ${brand.canonical_name}: ${menu.length} items → ${path.relative(ROOT, outPath)}`)
  }

  console.log(`\nTotal accepted: ${total}`)
  if (rejected.length) {
    console.log(`Rejected: ${rejected.length}`)
    for (const r of rejected.slice(0, 10)) {
      console.log(`  - ${r.brand_id}/${r.name}: ${r.reasons.join(', ')}`)
    }
  }
}

main()
