#!/usr/bin/env npx tsx
import fs from 'fs'
import path from 'path'
import { listMissingRestaurants } from '@/lib/nutrition/menu-backfill'

const OUT = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'missing-restaurants.json')

function main() {
  const missing = listMissingRestaurants()
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        count: missing.length,
        policy: 'zero_hallucination',
        restaurants: missing,
      },
      null,
      2
    )
  )
  console.log(`Missing restaurants: ${missing.length}`)
  console.log(`Written: ${OUT}`)
  console.log('\nBackfill workflow: verify 2+ sources per restaurant → add top 20 items to staging/manifest.json → run qa:backfill')
}

main()
