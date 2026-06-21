import fs from 'fs'
import path from 'path'
import type { FoodCrawler } from './base'
import { wrapResult } from './base'
import type { RawFoodObservation } from '@/lib/food-kb/types'

const ROOT = path.join(process.cwd(), 'scripts')

/** Parse 7-11 all-categories-raw.json + scraped outputs */
export const sevenElevenCrawler: FoodCrawler = {
  id: 'seven-eleven',
  name: '7-Eleven Taiwan',
  description: 'Official 7-11 fresh food categories (scraped HTML)',

  async crawl() {
    const started = Date.now()
    const errors: string[] = []
    const observations: RawFoodObservation[] = []
    const seen = new Set<string>()

    const rawPath = path.join(ROOT, 'all-categories-raw.json')
    if (!fs.existsSync(rawPath)) {
      errors.push('all-categories-raw.json not found — run: node scripts/scrape-all-7-11-categories.js')
      return wrapResult(sevenElevenCrawler, [], errors, started)
    }

    const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8')) as {
      products?: Array<{
        name?: string
        calories?: number | string
        protein?: number | string
        price?: number | string
        category?: string
        image?: string
        url?: string
      }>
    }

    const products = raw.products ?? (Array.isArray(raw) ? raw : [])
    for (const p of products as Array<Record<string, unknown>>) {
      const name = String(p.name ?? p.productName ?? '').trim()
      if (!name || seen.has(name)) continue
      seen.add(name)

      const cal = parseInt(String(p.calories ?? p.kcal ?? '0'), 10) || estimateCalories(name)
      const pro = parseInt(String(p.protein ?? p.protein_g ?? '0'), 10) || Math.round(cal * 0.08)

      observations.push({
        adapter: 'seven-eleven',
        source_type: 'official_website',
        source_name: '7-11.com.tw',
        source_url: String(p.url ?? 'https://www.7-11.com.tw/freshfoods/'),
        brand: '7-11',
        store: '7-11',
        name,
        category: mapCategory(String(p.category ?? '')),
        price_twd: parseInt(String(p.price ?? '0'), 10) || undefined,
        image_urls: p.image ? [String(p.image)] : [],
        nutrition: {
          calories: cal,
          protein_g: pro,
          carbs_g: Math.round(cal * 0.5 / 4),
          fat_g: Math.round(cal * 0.25 / 9),
        },
        raw_json: p,
      })
    }

    return wrapResult(sevenElevenCrawler, observations, errors, started)
  },
}

function mapCategory(cat: string): string {
  if (cat.includes('breakfast') || cat.includes('飯糰') || cat.includes('三明治')) return 'breakfast'
  if (cat.includes('dinner') || cat.includes('關東煮')) return 'dinner'
  return 'lunch'
}

function estimateCalories(name: string): number {
  if (name.includes('沙拉')) return 280
  if (name.includes('飯糰')) return 200
  if (name.includes('麵')) return 420
  if (name.includes('便當') || name.includes('飯')) return 520
  return 380
}
