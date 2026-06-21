import type { FoodCrawler } from './base'
import { legacyMenuCrawler } from './legacy-menu'
import { chainExpansionCrawler } from './chain-expansion'
import { categorySeedsCrawler } from './category-seeds'
import { sevenElevenCrawler } from './seven-eleven'
import { openFoodFactsCrawler } from './open-food-facts'
import { ocrMenuCrawler } from './menu-ocr'
import { officialNutritionCrawler } from './official-nutrition'
import { blogNutritionCrawler } from './blog-nutrition'

export const CRAWLER_REGISTRY: Record<string, FoodCrawler> = {
  'legacy-menu': legacyMenuCrawler,
  'chain-expansion': chainExpansionCrawler,
  'category-seeds': categorySeedsCrawler,
  'seven-eleven': sevenElevenCrawler,
  'open-food-facts': openFoodFactsCrawler,
  'official-nutrition': officialNutritionCrawler,
  'blog-nutrition': blogNutritionCrawler,
  'menu-ocr': ocrMenuCrawler,
}

export const ALL_CRAWLER_IDS = Object.keys(CRAWLER_REGISTRY)

export function getCrawler(id: string): FoodCrawler | undefined {
  return CRAWLER_REGISTRY[id]
}
