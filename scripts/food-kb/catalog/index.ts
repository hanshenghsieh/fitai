import type { BrandCatalog } from './helpers'
import { BUBBLETEA_CATALOG } from './bubbletea'
import { FASTFOOD_CATALOG } from './fastfood'
import { JAPANESE_CATALOG } from './japanese'
import { BENTO_CATALOG, BREAKFAST_CATALOG, COFFEE_CATALOG } from './bento-breakfast-coffee'
import { NOODLES_CATALOG, HOTPOT_CATALOG, NIGHT_MARKET_CATALOG, SUPERMARKET_CATALOG } from './noodles-more'
import {
  BBQ_CATALOG,
  THAI_CATALOG,
  KOREAN_CATALOG,
  AMERICAN_CATALOG,
  HEALTHY_CATALOG,
  DESSERTS_CATALOG,
  BUBBLETEA_EXTRA_CATALOG,
} from './remaining-categories'
import {
  CONVENIENCE_CATALOG,
  BREAKFAST_GAP_CATALOG,
  COFFEE_GAP_CATALOG,
  FASTFOOD_GAP_CATALOG,
  JAPANESE_GAP_CATALOG,
  BENTO_GAP_CATALOG,
  HOTPOT_GAP_CATALOG,
  NOODLES_GAP_CATALOG,
  SUPERMARKET_GAP_CATALOG,
} from './gap-fill'
import { BRAND_REGISTRY } from '@/lib/food-kb/brand-registry'
import { fillBrandCatalog } from './mega-expand'

const CORE_CATALOG: BrandCatalog = {
  ...CONVENIENCE_CATALOG,
  ...BREAKFAST_GAP_CATALOG,
  ...COFFEE_GAP_CATALOG,
  ...BUBBLETEA_CATALOG,
  ...BUBBLETEA_EXTRA_CATALOG,
  ...FASTFOOD_CATALOG,
  ...FASTFOOD_GAP_CATALOG,
  ...JAPANESE_CATALOG,
  ...JAPANESE_GAP_CATALOG,
  ...BENTO_CATALOG,
  ...BENTO_GAP_CATALOG,
  ...BREAKFAST_CATALOG,
  ...COFFEE_CATALOG,
  ...NOODLES_CATALOG,
  ...NOODLES_GAP_CATALOG,
  ...HOTPOT_CATALOG,
  ...HOTPOT_GAP_CATALOG,
  ...NIGHT_MARKET_CATALOG,
  ...SUPERMARKET_CATALOG,
  ...SUPERMARKET_GAP_CATALOG,
  ...BBQ_CATALOG,
  ...THAI_CATALOG,
  ...KOREAN_CATALOG,
  ...AMERICAN_CATALOG,
  ...HEALTHY_CATALOG,
  ...DESSERTS_CATALOG,
}

/** 品牌 slug → 獨立單點品項（核心 catalog + 自動補齊至 35 品項/品牌） */
export const BRAND_ITEM_CATALOG: BrandCatalog = Object.fromEntries(
  BRAND_REGISTRY.map(brand => [
    brand.slug,
    fillBrandCatalog(brand, CORE_CATALOG[brand.slug] ?? []),
  ])
)

export function catalogItemCount(): number {
  return Object.values(BRAND_ITEM_CATALOG).reduce((s, arr) => s + arr.length, 0)
}

export function brandsWithCatalog(): number {
  return Object.keys(BRAND_ITEM_CATALOG).length
}
