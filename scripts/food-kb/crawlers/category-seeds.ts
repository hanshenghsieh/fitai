import fs from 'fs'
import path from 'path'
import type { FoodCrawler } from './base'
import { wrapResult } from './base'
import { KB_CATEGORIES, type KbCategory } from '@/lib/food-kb/brand-registry'
import { seedRowToObservation } from './seed-utils'

const GEN_DIR = path.join(process.cwd(), 'scripts', 'food-kb', 'seeds', 'generated')

/** Load category-generated seeds — run build-category-seeds first */
export const categorySeedsCrawler: FoodCrawler = {
  id: 'category-seeds',
  name: 'Category Brand Seeds',
  description: 'Per-category Taiwan brand menu templates (incremental by category)',

  async crawl(options) {
    const started = Date.now()
    const errors: string[] = []
    const observations = []

    const filterCat = (options as { category?: string })?.category
    const cats = filterCat
      ? filterCat.split(',').map(s => s.trim()) as KbCategory[]
      : [...KB_CATEGORIES]

    if (!fs.existsSync(GEN_DIR)) {
      errors.push('Generated seeds missing — run: npm run food-kb:build-seeds')
      return wrapResult(categorySeedsCrawler, [], errors, started)
    }

    for (const cat of cats) {
      const filePath = path.join(GEN_DIR, `${cat}.json`)
      if (!fs.existsSync(filePath)) {
        errors.push(`Missing seed file for category: ${cat}`)
        continue
      }
      try {
        const rows = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>[]
        for (const row of rows) {
          observations.push(
            seedRowToObservation(row, 'category-seeds', `seeds/generated/${cat}.json`)
          )
        }
      } catch (e) {
        errors.push(`${cat}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return wrapResult(categorySeedsCrawler, observations, errors, started)
  },
}
