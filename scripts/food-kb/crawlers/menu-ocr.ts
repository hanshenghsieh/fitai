/**
 * OCR Menu Crawler — architecture stub
 * Production: wire Claude Vision / Tesseract on menu images from:
 * Google Maps reviews, blog posts, Instagram, PDF menus, user uploads
 */
import type { FoodCrawler } from './base'
import { wrapResult } from './base'
import type { RawFoodObservation } from '@/lib/food-kb/types'

export interface OcrMenuInput {
  image_url: string
  source_url?: string
  store?: string
  brand?: string
}

export const ocrMenuCrawler: FoodCrawler = {
  id: 'menu-ocr',
  name: 'Menu OCR',
  description: 'Extract menu items from photos (requires image_urls in options)',

  async crawl(options) {
    const started = Date.now()
    const images = (options as { image_urls?: string[] })?.image_urls ?? []

    if (!images.length) {
      return wrapResult(ocrMenuCrawler, [], [
        'No image_urls provided. Pass { image_urls: [...] } to pipeline --adapter menu-ocr',
        'Future: auto-collect from Google review photos, Dcard, 愛食記, Instagram',
      ], started)
    }

    const observations: RawFoodObservation[] = []
    for (const url of images) {
      observations.push({
        adapter: 'menu-ocr',
        source_type: 'menu_ocr',
        source_name: 'menu-ocr-pending',
        source_url: url,
        brand: 'unknown',
        store: 'unknown',
        name: `[OCR pending] ${url.slice(-40)}`,
        nutrition: {},
        raw_json: { image_url: url, status: 'pending_ocr' },
      })
    }

    return wrapResult(ocrMenuCrawler, observations, [
      'OCR extraction not yet automated — queue for Claude Vision batch',
    ], started)
  },
}
