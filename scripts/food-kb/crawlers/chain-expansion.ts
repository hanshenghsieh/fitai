import fs from 'fs'
import path from 'path'
import type { FoodCrawler } from './base'
import { wrapResult } from './base'
import type { RawFoodObservation } from '@/lib/food-kb/types'

const SEED_PATH = path.join(process.cwd(), 'scripts', 'food-kb', 'seeds', 'chain-expansion.json')

function itemToObs(item: Record<string, unknown>): RawFoodObservation {
  const store = String(item.store ?? 'unknown')
  return {
    adapter: 'chain-expansion',
    source_type: 'official_website',
    source_name: `chain-seed:${store}`,
    source_url: `internal://food-kb/seeds/chain-expansion.json#${item.id}`,
    brand: store,
    store,
    name: String(item.name),
    category: String(item.category ?? 'lunch'),
    role: item.role ? String(item.role) : undefined,
    price_twd: Number(item.price) || undefined,
    image_urls: item.photo_url ? [String(item.photo_url)] : [],
    legacy_id: String(item.id),
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    nutrition: {
      calories: Number(item.calories) || undefined,
      protein_g: Number(item.protein_g) || undefined,
      carbs_g: Number(item.carbs_g) || undefined,
      fat_g: Number(item.fat_g) || undefined,
    },
    raw_json: item,
  }
}

/** Subway、爭鮮、點點心、百貨美食街 — curated multi-source seed */
export const chainExpansionCrawler: FoodCrawler = {
  id: 'chain-expansion',
  name: 'Chain Expansion Seed',
  description: 'Subway, 爭鮮, 點點心, department store food courts',

  async crawl() {
    const started = Date.now()
    const errors: string[] = []
    const observations: RawFoodObservation[] = []

    if (!fs.existsSync(SEED_PATH)) {
      errors.push(`Seed file missing: ${SEED_PATH}`)
      return wrapResult(chainExpansionCrawler, [], errors, started)
    }

    try {
      const rows = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8')) as Record<string, unknown>[]
      for (const row of rows) {
        observations.push(itemToObs(row))
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }

    return wrapResult(chainExpansionCrawler, observations, errors, started)
  },
}
