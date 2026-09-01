/**
 * High-frequency Taiwan food/drink search smoke-test set (menu-nutrition-
 * integrity audit, phase 3). Not exhaustive — a representative sample of
 * what a normal Taiwanese user is likely to type into manual/text search.
 *
 * `expected` locks in current, VERIFIED behavior (every entry below was run
 * through the real searchFoodMenu() and checked, not guessed) so a
 * currently-working query can never silently regress again, while
 * explicitly documenting queries that are known gaps rather than
 * pretending they don't exist. See search-smoke-test.test.ts for how this
 * is exercised, and scripts/food-kb/audit-search-coverage.ts for how it's
 * classified/scored.
 *
 * known_coverage_gap breakdown (5 of 90, see phase-3 final report for detail):
 * - 麥脆雞 / 麥脆鷄: genuinely absent from the entire repository — no
 *   trusted source exists anywhere to recover from.
 * - 鹹酥雞: the record + alias exist (canonical name 鹽酥雞), but the row is
 *   gate-rejected by the (untouched, by design) placeholder/unverified
 *   trust policy — a policy question, not a missing-data problem.
 * - 多多綠: exists only as a bubbleteaBank() source recipe whose own listed
 *   calories don't balance against its macros (Group C — "source-authored
 *   inconsistent", left unrepaired on purpose, see final report §F).
 * - 夏威夷披薩: only placeholder-tier chain records exist for this specific
 *   combo; the generic 披薩 query is unaffected.
 */

export type SmokeTestCategory =
  | 'breakfast'
  | 'convenience'
  | 'taiwanese'
  | 'drinks'
  | 'mcdonalds'
  | 'kfc'
  | 'chain_meals'
  | 'japanese_hotpot'

export type SmokeTestExpectation = 'searchable' | 'known_coverage_gap'

export interface SmokeTestQuery {
  query: string
  category: SmokeTestCategory
  expected: SmokeTestExpectation
}

export const SEARCH_SMOKE_TEST_QUERIES: SmokeTestQuery[] = [
  // A. Breakfast shops
  { query: '蛋餅', category: 'breakfast', expected: 'searchable' },
  { query: '起司蛋餅', category: 'breakfast', expected: 'searchable' },
  { query: '培根蛋餅', category: 'breakfast', expected: 'searchable' },
  { query: '蘿蔔糕', category: 'breakfast', expected: 'searchable' },
  { query: '鐵板麵', category: 'breakfast', expected: 'searchable' },
  { query: '火腿蛋吐司', category: 'breakfast', expected: 'searchable' },
  { query: '鮪魚蛋吐司', category: 'breakfast', expected: 'searchable' },
  { query: '豬排蛋吐司', category: 'breakfast', expected: 'searchable' },
  { query: '漢堡', category: 'breakfast', expected: 'searchable' },
  { query: '奶茶', category: 'breakfast', expected: 'searchable' },
  { query: '豆漿', category: 'breakfast', expected: 'searchable' },
  { query: '米漿', category: 'breakfast', expected: 'searchable' },
  { query: '紅茶', category: 'breakfast', expected: 'searchable' },

  // B. Convenience stores
  { query: '茶葉蛋', category: 'convenience', expected: 'searchable' },
  { query: '御飯糰', category: 'convenience', expected: 'searchable' },
  { query: '鮪魚飯糰', category: 'convenience', expected: 'searchable' },
  { query: '雞胸肉', category: 'convenience', expected: 'searchable' },
  { query: '地瓜', category: 'convenience', expected: 'searchable' },
  { query: '關東煮', category: 'convenience', expected: 'searchable' },
  { query: '熱狗', category: 'convenience', expected: 'searchable' },
  { query: '御便當', category: 'convenience', expected: 'searchable' },
  { query: '三明治', category: 'convenience', expected: 'searchable' },
  { query: '拿鐵', category: 'convenience', expected: 'searchable' },
  { query: '豆漿', category: 'convenience', expected: 'searchable' },

  // C. Taiwanese everyday foods
  { query: '滷肉飯', category: 'taiwanese', expected: 'searchable' },
  { query: '雞肉飯', category: 'taiwanese', expected: 'searchable' },
  { query: '排骨飯', category: 'taiwanese', expected: 'searchable' },
  { query: '雞腿飯', category: 'taiwanese', expected: 'searchable' },
  { query: '牛肉麵', category: 'taiwanese', expected: 'searchable' },
  { query: '乾麵', category: 'taiwanese', expected: 'searchable' },
  { query: '陽春麵', category: 'taiwanese', expected: 'searchable' },
  { query: '水餃', category: 'taiwanese', expected: 'searchable' },
  { query: '鍋貼', category: 'taiwanese', expected: 'searchable' },
  { query: '滷味', category: 'taiwanese', expected: 'searchable' },
  { query: '鹽水雞', category: 'taiwanese', expected: 'searchable' },
  { query: '雞排', category: 'taiwanese', expected: 'searchable' },
  { query: '鹹酥雞', category: 'taiwanese', expected: 'known_coverage_gap' },
  { query: '蚵仔煎', category: 'taiwanese', expected: 'searchable' },
  { query: '肉圓', category: 'taiwanese', expected: 'searchable' },
  { query: '臭豆腐', category: 'taiwanese', expected: 'searchable' },
  { query: '刈包', category: 'taiwanese', expected: 'searchable' },
  { query: '肉粽', category: 'taiwanese', expected: 'searchable' },
  { query: '碗粿', category: 'taiwanese', expected: 'searchable' },
  { query: '米粉', category: 'taiwanese', expected: 'searchable' },
  { query: '炒飯', category: 'taiwanese', expected: 'searchable' },
  { query: '炒麵', category: 'taiwanese', expected: 'searchable' },

  // D. Drinks
  { query: '紅茶', category: 'drinks', expected: 'searchable' },
  { query: '綠茶', category: 'drinks', expected: 'searchable' },
  { query: '烏龍茶', category: 'drinks', expected: 'searchable' },
  { query: '冬瓜茶', category: 'drinks', expected: 'searchable' },
  { query: '奶茶', category: 'drinks', expected: 'searchable' },
  { query: '珍珠奶茶', category: 'drinks', expected: 'searchable' },
  { query: '鮮奶茶', category: 'drinks', expected: 'searchable' },
  { query: '多多綠', category: 'drinks', expected: 'known_coverage_gap' },
  { query: '檸檬紅茶', category: 'drinks', expected: 'searchable' },
  { query: '檸檬綠茶', category: 'drinks', expected: 'searchable' },
  { query: '水果茶', category: 'drinks', expected: 'searchable' },
  { query: '四季春', category: 'drinks', expected: 'searchable' },
  { query: '青茶', category: 'drinks', expected: 'searchable' },
  { query: '豆漿', category: 'drinks', expected: 'searchable' },
  { query: '米漿', category: 'drinks', expected: 'searchable' },
  { query: '拿鐵', category: 'drinks', expected: 'searchable' },
  { query: '美式咖啡', category: 'drinks', expected: 'searchable' },

  // E. McDonald's
  { query: '大麥克', category: 'mcdonalds', expected: 'searchable' },
  { query: '麥香雞', category: 'mcdonalds', expected: 'searchable' },
  { query: '麥香魚', category: 'mcdonalds', expected: 'searchable' },
  { query: '麥克雞塊', category: 'mcdonalds', expected: 'searchable' },
  { query: '薯條', category: 'mcdonalds', expected: 'searchable' },
  { query: '麥脆雞', category: 'mcdonalds', expected: 'known_coverage_gap' },
  { query: '麥脆鷄', category: 'mcdonalds', expected: 'known_coverage_gap' },
  { query: '玉米湯', category: 'mcdonalds', expected: 'searchable' },
  { query: '玉米濃湯', category: 'mcdonalds', expected: 'searchable' },
  { query: '豬肉滿福堡', category: 'mcdonalds', expected: 'searchable' },
  { query: '滿福堡', category: 'mcdonalds', expected: 'searchable' },

  // F. KFC
  { query: '蛋撻', category: 'kfc', expected: 'searchable' },
  { query: '炸雞', category: 'kfc', expected: 'searchable' },
  { query: '咔啦雞腿堡', category: 'kfc', expected: 'searchable' },
  { query: '雞米花', category: 'kfc', expected: 'searchable' },
  { query: '薯條', category: 'kfc', expected: 'searchable' },
  { query: '玉米', category: 'kfc', expected: 'searchable' },

  // G. Pizza / chain meals
  { query: '披薩', category: 'chain_meals', expected: 'searchable' },
  { query: '夏威夷披薩', category: 'chain_meals', expected: 'known_coverage_gap' },
  { query: '海鮮披薩', category: 'chain_meals', expected: 'searchable' },
  { query: '義大利麵', category: 'chain_meals', expected: 'searchable' },
  { query: '焗烤', category: 'chain_meals', expected: 'searchable' },
  { query: '炸雞', category: 'chain_meals', expected: 'searchable' },
  { query: '烤雞', category: 'chain_meals', expected: 'searchable' },

  // H. Japanese / hotpot / common restaurant foods
  { query: '壽司', category: 'japanese_hotpot', expected: 'searchable' },
  { query: '鮭魚壽司', category: 'japanese_hotpot', expected: 'searchable' },
  { query: '生魚片', category: 'japanese_hotpot', expected: 'searchable' },
  { query: '拉麵', category: 'japanese_hotpot', expected: 'searchable' },
  { query: '烏龍麵', category: 'japanese_hotpot', expected: 'searchable' },
  { query: '丼飯', category: 'japanese_hotpot', expected: 'searchable' },
  { query: '咖哩飯', category: 'japanese_hotpot', expected: 'searchable' },
  { query: '火鍋', category: 'japanese_hotpot', expected: 'searchable' },
  { query: '涮涮鍋', category: 'japanese_hotpot', expected: 'searchable' },
  { query: '牛五花', category: 'japanese_hotpot', expected: 'searchable' },
  { query: '豬五花', category: 'japanese_hotpot', expected: 'searchable' },
]
