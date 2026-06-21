import fs from 'fs'
import path from 'path'
import type { FoodCrawler } from './base'
import { wrapResult } from './base'
import type { RawFoodObservation } from '@/lib/food-kb/types'

const ROOT = path.join(process.cwd(), 'scripts')

function loadJson(name: string): Record<string, unknown>[] {
  const p = path.join(ROOT, name)
  if (!fs.existsSync(p)) return []
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
  if (Array.isArray(raw)) return raw as Record<string, unknown>[]
  if (raw && typeof raw === 'object' && Array.isArray((raw as { products?: unknown }).products)) {
    return (raw as { products: Record<string, unknown>[] }).products
  }
  return []
}

function itemToObs(item: Record<string, unknown>, sourceName: string): RawFoodObservation {
  const store = String(item.store ?? 'unknown')
  return {
    adapter: 'legacy-menu',
    source_type: 'legacy_import',
    source_name: sourceName,
    source_url: 'internal://convenience-store-menu',
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

export const legacyMenuCrawler: FoodCrawler = {
  id: 'legacy-menu',
  name: 'Legacy Menu Import',
  description: 'Import final-menu + restaurant-chains + restaurant-expanded JSON',

  async crawl() {
    const started = Date.now()
    const errors: string[] = []
    const observations: RawFoodObservation[] = []
    const seen = new Set<string>()

    const files = [
      ['final-menu.json', 'legacy-convenience'],
      ['restaurant-chains.json', 'legacy-chains'],
      ['restaurant-expanded.json', 'legacy-expanded'],
      ['menu-data-processed.json', 'legacy-scraped-711'],
    ] as const

    for (const [file, source] of files) {
      try {
        const rows = loadJson(file) as Record<string, unknown>[]
        for (const row of rows) {
          const id = String(row.id ?? row.name)
          if (seen.has(id)) continue
          seen.add(id)
          observations.push(itemToObs(row, source))
        }
      } catch (e) {
        errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return wrapResult(legacyMenuCrawler, observations, errors, started)
  },
}
