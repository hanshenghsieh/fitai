import fs from 'fs'
import path from 'path'
import type { FoodCrawler } from './base'
import { wrapResult } from './base'
import type { RawFoodObservation } from '@/lib/food-kb/types'
import { parseStarbucksProductPage, safeFetch } from './fetch-utils'

const SOURCES_DIR = path.join(process.cwd(), 'scripts', 'food-kb', 'sources')

interface OfficialRefRow {
  brand: string
  store: string
  name: string
  aliases?: string[]
  source_url: string
  nutrition: {
    calories: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    sugar_g?: number
  }
}

/** 星巴克品項 → 官網產品頁（即時爬取） */
const STARBUCKS_LIVE = [
  {
    catalog_name: '美式咖啡（中杯）',
    url: 'https://www.starbucks.com.tw/products/drinks/product.jspx?catId=116&id=693',
    pick_size: '中杯',
  },
  {
    catalog_name: '拿鐵（中杯）',
    url: 'https://www.starbucks.com.tw/products/drinks/product.jspx?catId=116&id=696',
    pick_size: '中杯',
  },
  {
    catalog_name: '焦糖瑪奇朵（中杯）',
    url: 'https://www.starbucks.com.tw/products/drinks/product.jspx?catId=116&id=694',
    pick_size: '中杯',
  },
]

export const officialNutritionCrawler: FoodCrawler = {
  id: 'official-nutrition',
  name: 'Official Brand Nutrition',
  description: '官網營養標示（靜態參考 + 星巴克即時爬取）',

  async crawl(options) {
    const started = Date.now()
    const errors: string[] = []
    const observations: RawFoodObservation[] = []
    const limit = options?.limit ?? 200

    const refPath = path.join(SOURCES_DIR, 'official-ref.json')
    if (fs.existsSync(refPath)) {
      const refs = JSON.parse(fs.readFileSync(refPath, 'utf8')) as OfficialRefRow[]
      for (const row of refs) {
        observations.push({
          adapter: 'official-nutrition',
          source_type: 'official_website',
          source_name: row.brand,
          source_url: row.source_url,
          brand: row.brand,
          store: row.store,
          name: row.name,
          aliases: row.aliases,
          category: 'lunch',
          nutrition: row.nutrition,
          observed_at: new Date().toISOString(),
        })
        if (observations.length >= limit) break
      }
    } else {
      errors.push('official-ref.json missing')
    }

    for (const prod of STARBUCKS_LIVE) {
      if (observations.length >= limit) break
      const html = await safeFetch(prod.url)
      if (!html) {
        errors.push(`Starbucks fetch failed: ${prod.catalog_name}`)
        continue
      }
      const parsed = parseStarbucksProductPage(html)
      const row = parsed.find(p => p.size === prod.pick_size) ?? parsed[0]
      if (!row?.nutrition.calories) {
        errors.push(`Starbucks parse failed: ${prod.catalog_name}`)
        continue
      }
      observations.push({
        adapter: 'official-nutrition',
        source_type: 'official_website',
        source_name: '星巴克',
        source_url: prod.url,
        brand: '星巴克',
        store: '星巴克',
        name: prod.catalog_name,
        category: 'breakfast',
        role: 'drink',
        price_twd: row.price_twd,
        nutrition: row.nutrition,
        observed_at: new Date().toISOString(),
      })
    }

    return wrapResult(officialNutritionCrawler, observations, errors, started)
  },
}
