import type { FoodCrawler } from './base'
import { wrapResult } from './base'
import type { RawFoodObservation } from '@/lib/food-kb/types'

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl'

/** Open Food Facts — Taiwan barcoded products (cross-validation source) */
export const openFoodFactsCrawler: FoodCrawler = {
  id: 'open-food-facts',
  name: 'Open Food Facts Taiwan',
  description: 'Global open nutrition DB filtered to Taiwan',

  async crawl(options) {
    const started = Date.now()
    const errors: string[] = []
    const observations: RawFoodObservation[] = []
    const limit = options?.limit ?? 100
    const pageSize = 50

    for (let page = 1; observations.length < limit; page++) {
      const url = new URL(OFF_SEARCH)
      url.searchParams.set('search_simple', '1')
      url.searchParams.set('action', 'process')
      url.searchParams.set('json', '1')
      url.searchParams.set('page_size', String(pageSize))
      url.searchParams.set('page', String(page))
      url.searchParams.set('tagtype_0', 'countries')
      url.searchParams.set('tag_contains_0', 'contains')
      url.searchParams.set('tag_0', 'taiwan')

      try {
        const res = await fetch(url.toString(), {
          headers: { 'User-Agent': 'BetterBit-FoodKB/1.0 (nutrition research)' },
        })
        if (!res.ok) {
          errors.push(`OFF page ${page}: HTTP ${res.status}`)
          break
        }
        const json = await res.json() as {
          products?: Array<{
            code?: string
            product_name?: string
            product_name_zh?: string
            brands?: string
            nutriments?: Record<string, number>
            image_url?: string
            url?: string
          }>
          page_count?: number
        }

        const products = json.products ?? []
        if (!products.length) break

        for (const p of products) {
          const name = p.product_name_zh || p.product_name
          if (!name) continue
          const n = p.nutriments ?? {}
          observations.push({
            adapter: 'open-food-facts',
            source_type: 'open_food_facts',
            source_name: 'OpenFoodFacts',
            source_url: p.url ?? `https://world.openfoodfacts.org/product/${p.code}`,
            brand: p.brands?.split(',')[0]?.trim() ?? 'unknown',
            store: p.brands?.split(',')[0]?.trim() ?? 'supermarket',
            name,
            category: 'snack',
            image_urls: p.image_url ? [p.image_url] : [],
            legacy_id: `off-${p.code}`,
            nutrition: {
              calories: n['energy-kcal_100g'] ?? n['energy-kcal'],
              protein_g: n.proteins_100g ?? n.proteins,
              fat_g: n.fat_100g ?? n.fat,
              carbs_g: n.carbohydrates_100g ?? n.carbohydrates,
              sugar_g: n.sugars_100g ?? n.sugars,
              fiber_g: n.fiber_100g ?? n.fiber,
              sodium_mg: n.sodium_100g ? n.sodium_100g * 1000 : undefined,
              serving_size: '100g',
              serving_weight_g: 100,
            },
            raw_json: p as Record<string, unknown>,
          })
          if (observations.length >= limit) break
        }

        if (page >= (json.page_count ?? 1)) break
      } catch (e) {
        errors.push(`OFF page ${page}: ${e instanceof Error ? e.message : String(e)}`)
        break
      }
    }

    return wrapResult(openFoodFactsCrawler, observations, errors, started)
  },
}
