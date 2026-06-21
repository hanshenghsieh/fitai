import fs from 'fs'
import path from 'path'
import type { FoodCrawler } from './base'
import { wrapResult } from './base'
import type { RawFoodObservation } from '@/lib/food-kb/types'
import { parseBlogHtmlTables, parseBlogMarkdownTables, safeFetch } from './fetch-utils'

const SOURCES_DIR = path.join(process.cwd(), 'scripts', 'food-kb', 'sources')

interface BlogSourceRow {
  brand: string
  url: string
  source_name: string
  prefer_size?: '大杯' | '中杯'
}

/** 部落格內嵌參考（爬蟲失敗時仍可提供交叉驗證） */
const BLOG_INLINE: Array<{
  brand: string
  store: string
  name: string
  source_name: string
  source_url: string
  nutrition: { calories: number; sugar_g?: number; carbs_g?: number; protein_g?: number; fat_g?: number }
}> = [
  {
    brand: '五十嵐',
    store: '五十嵐',
    name: '珍珠奶茶（大杯）',
    source_name: '日日營養 DailyDietitian',
    source_url: 'https://dailydietitian.com.tw/50%e5%b5%90%e7%86%b1%e9%87%8f-%e7%b3%96%e9%87%8f-%e5%83%b9%e6%a0%bc-%e7%87%9f%e9%a4%8a%e5%b8%ab%e5%bb%ba%e8%ad%b0/',
    nutrition: { calories: 668, sugar_g: 53, carbs_g: 68, protein_g: 4, fat_g: 12 },
  },
  {
    brand: '五十嵐',
    store: '五十嵐',
    name: '波霸奶茶（大杯）',
    source_name: '日日營養 DailyDietitian',
    source_url: 'https://dailydietitian.com.tw/50%e5%b5%90%e7%86%b1%e9%87%8f-%e7%b3%96%e9%87%8f-%e5%83%b9%e6%a0%bc-%e7%87%9f%e9%a4%8a%e5%b8%ab%e5%bb%ba%e8%ad%b0/',
    nutrition: { calories: 678, sugar_g: 53, carbs_g: 70, protein_g: 4, fat_g: 12 },
  },
  {
    brand: '五十嵐',
    store: '五十嵐',
    name: '四季春青茶（中杯）',
    source_name: '日日營養 DailyDietitian',
    source_url: 'https://dailydietitian.com.tw/50%e5%b5%90%e7%86%b1%e9%87%8f-%e7%b3%96%e9%87%8f-%e5%83%b9%e6%a0%bc-%e7%87%9f%e9%a4%8a%e5%b8%ab%e5%bb%ba%e8%ad%b0/',
    nutrition: { calories: 119, sugar_g: 28, carbs_g: 30, protein_g: 0, fat_g: 0 },
  },
  {
    brand: '五十嵐',
    store: '五十嵐',
    name: '8冰茶（大杯）',
    source_name: '日日營養 DailyDietitian',
    source_url: 'https://dailydietitian.com.tw/50%e5%b5%90%e7%86%b1%e9%87%8f-%e7%b3%96%e9%87%8f-%e5%83%b9%e6%a0%bc-%e7%87%9f%e9%a4%8a%e5%b8%ab%e5%bb%ba%e8%ad%b0/',
    nutrition: { calories: 291, sugar_g: 67, carbs_g: 72, protein_g: 1, fat_g: 0 },
  },
  {
    brand: '五十嵐',
    store: '五十嵐',
    name: '阿華田（中杯）',
    source_name: '日日營養 DailyDietitian',
    source_url: 'https://dailydietitian.com.tw/50%e5%b5%90%e7%86%b1%e9%87%8f-%e7%b3%96%e9%87%8f-%e5%83%b9%e6%a0%bc-%e7%87%9f%e9%a4%8a%e5%b8%ab%e5%bb%ba%e8%ad%b0/',
    nutrition: { calories: 359, sugar_g: 33, carbs_g: 48, protein_g: 5, fat_g: 8 },
  },
  {
    brand: '清心福全',
    store: '清心福全',
    name: '珍珠奶茶（大杯）',
    source_name: '豐健樂活 FJB100',
    source_url: 'https://blog.fjb100.com/article/bubble-tea-calories',
    nutrition: { calories: 720, sugar_g: 52, carbs_g: 70, protein_g: 4, fat_g: 12 },
  },
]

export const blogNutritionCrawler: FoodCrawler = {
  id: 'blog-nutrition',
  name: 'Blog Nutrition Cross-Ref',
  description: '營養師部落格熱量表（即時爬取 + 內嵌參考）',

  async crawl(options) {
    const started = Date.now()
    const errors: string[] = []
    const observations: RawFoodObservation[] = []
    const limit = options?.limit ?? 300
    const seen = new Set<string>()

    const srcPath = path.join(SOURCES_DIR, 'blog-sources.json')
    const sources: BlogSourceRow[] = fs.existsSync(srcPath)
      ? JSON.parse(fs.readFileSync(srcPath, 'utf8'))
      : []

    for (const src of sources) {
      const html = await safeFetch(src.url, 20000)
      if (!html) {
        errors.push(`Blog fetch failed: ${src.source_name}`)
        continue
      }
      let rows = parseBlogMarkdownTables(html, src.brand, {
        preferSize: src.prefer_size ?? '大杯',
      })
      if (!rows.length) {
        rows = parseBlogHtmlTables(html, src.brand, {
          preferSize: src.prefer_size ?? '大杯',
        })
      }
      for (const row of rows) {
        const key = `${src.brand}:${row.name}`
        if (seen.has(key)) continue
        seen.add(key)
        observations.push({
          adapter: 'blog-nutrition',
          source_type: 'blog',
          source_name: src.source_name,
          source_url: src.url,
          brand: src.brand,
          store: src.brand,
          name: row.name,
          category: 'lunch',
          role: 'drink',
          nutrition: row.nutrition,
          observed_at: new Date().toISOString(),
        })
        if (observations.length >= limit) break
      }
    }

    for (const row of BLOG_INLINE) {
      const key = `${row.store}:${row.name}`
      if (seen.has(key)) continue
      seen.add(key)
      observations.push({
        adapter: 'blog-nutrition',
        source_type: 'blog',
        source_name: row.source_name,
        source_url: row.source_url,
        brand: row.brand,
        store: row.store,
        name: row.name,
        category: 'lunch',
        role: 'drink',
        nutrition: row.nutrition,
        observed_at: new Date().toISOString(),
      })
    }

    return wrapResult(blogNutritionCrawler, observations, errors, started)
  },
}
