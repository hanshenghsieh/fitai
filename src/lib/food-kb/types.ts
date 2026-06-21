/** Taiwan Food Knowledge Graph — canonical types */

export type BrandType =
  | 'convenience'
  | 'fast_food'
  | 'chain_restaurant'
  | 'breakfast'
  | 'buffet'
  | 'bento'
  | 'hot_pot'
  | 'bubble_tea'
  | 'coffee'
  | 'night_market'
  | 'supermarket'
  | 'home_ingredient'
  | 'snack'
  | 'dessert'
  | 'delivery_platform'
  | 'other'

export type SourceType =
  | 'official_website'
  | 'official_pdf'
  | 'tfda_open_data'
  | 'open_food_facts'
  | 'google_maps'
  | 'google_reviews'
  | 'ubereats'
  | 'foodpanda'
  | 'openrice'
  | 'ifoodie'
  | 'dcard'
  | 'ptt'
  | 'reddit'
  | 'blog'
  | 'instagram'
  | 'facebook'
  | 'news'
  | 'menu_ocr'
  | 'user_photo'
  | 'community'
  | 'legacy_import'
  | 'estimated'
  | 'other'

export interface NutritionFacts {
  calories?: number
  protein_g?: number
  fat_g?: number
  carbs_g?: number
  sugar_g?: number
  fiber_g?: number
  sodium_mg?: number
  serving_size?: string
  serving_weight_g?: number
}

export interface RawFoodObservation {
  /** Crawler adapter id */
  adapter: string
  source_type: SourceType
  source_name: string
  source_url?: string
  observed_at?: string
  brand?: string
  store?: string
  name: string
  aliases?: string[]
  category?: string
  role?: string
  price_twd?: number
  image_urls?: string[]
  ingredients?: string
  tags?: string[]
  region?: string
  legacy_id?: string
  nutrition: NutritionFacts
  raw_json?: Record<string, unknown>
}

export interface KbBrand {
  id: string
  slug: string
  name_zh: string
  brand_type: BrandType
  website_url?: string
}

export interface KbFoodCluster {
  id: string
  cluster_key: string
  canonical_name_zh: string
  brand_slug?: string
  category?: string
  aliases: string[]
  nutrition: NutritionFacts
  confidence: number
  source_count: number
  item_ids: string[]
  updated_at: string
}

export interface KbFoodItem {
  id: string
  legacy_id?: string
  cluster_id?: string
  brand_slug: string
  store_name: string
  name_zh: string
  name_normalized: string
  category?: string
  role?: string
  price_twd?: number
  image_urls: string[]
  ingredients?: string
  tags: string[]
  portionable: boolean
  nutrition: NutritionFacts
  confidence: number
  source_observation_ids: string[]
  first_seen_at: string
  last_seen_at: string
  is_available: boolean
}

export interface KbSourceRecord {
  id: string
  source_type: SourceType
  source_name: string
  source_url?: string
  trust_weight: number
}

export interface KbObservation {
  id: string
  source_id: string
  item_id?: string
  cluster_id?: string
  raw_name: string
  raw_store?: string
  nutrition: NutritionFacts
  content_hash: string
  observed_at: string
}

export interface FoodKnowledgeGraph {
  version: number
  updated_at: string
  brands: KbBrand[]
  clusters: KbFoodCluster[]
  items: KbFoodItem[]
  sources: KbSourceRecord[]
  observations: KbObservation[]
  stats: KbGraphStats
}

export interface KbGraphStats {
  total_items: number
  total_clusters: number
  total_brands: number
  total_observations: number
  by_source_type: Record<string, number>
  by_brand_type: Record<string, number>
  avg_confidence: number
  low_confidence_count: number
  missing_nutrition_count: number
}

export interface CoverageGap {
  gap_type: 'missing_brand' | 'missing_category' | 'missing_nutrition' | 'low_confidence' | 'stale_menu' | 'user_requested' | 'competitor_has'
  brand_slug?: string
  category?: string
  description: string
  priority: number
}

export interface CoverageReport {
  generated_at: string
  stats: KbGraphStats
  gaps: CoverageGap[]
  top_brands_by_items: { slug: string; name_zh: string; count: number }[]
  missing_brands: string[]
  stale_items: { id: string; name: string; last_seen_at: string }[]
}

export interface CrawlerResult {
  adapter: string
  source_type: SourceType
  fetched: number
  observations: RawFoodObservation[]
  errors: string[]
  duration_ms: number
}

export interface PipelineRunResult {
  run_id: string
  started_at: string
  finished_at: string
  adapters_run: string[]
  items_new: number
  items_updated: number
  clusters_merged: number
  observations_added: number
  gaps_detected: number
  errors: string[]
}
