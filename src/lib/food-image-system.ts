import { SHOW_AI_FOOD_IMAGES } from '@/lib/food-image-display'

/**
 * BetterBit Food Image System
 * Priority: user photo → brand official → cluster hero → category pool (local only)
 * Never search by food name at runtime.
 */

export type ImageCategory =
  | 'bento'
  | 'salmon'
  | 'noodles'
  | 'hotpot'
  | 'salad'
  | 'convenience'
  | 'fried'
  | 'dessert'
  | 'drink'
  | 'fruit'
  | 'snack'
  | 'breakfast'
  | 'restaurant'

export const IMAGE_CATEGORIES: ImageCategory[] = [
  'bento',
  'salmon',
  'noodles',
  'hotpot',
  'salad',
  'convenience',
  'fried',
  'dessert',
  'drink',
  'fruit',
  'snack',
  'breakfast',
  'restaurant',
]

/** Fixed local pool — 3–4 images per category, rotated by name hash */
export const CATEGORY_IMAGE_POOL: Record<ImageCategory, string[]> = {
  bento: [
    '/food-images/bento-01.jpg',
    '/food-images/bento-02.jpg',
    '/food-images/bento-03.jpg',
    '/food-images/bento-04.jpg',
  ],
  salmon: [
    '/food-images/salmon-01.jpg',
    '/food-images/salmon-02.jpg',
    '/food-images/salmon-03.jpg',
    '/food-images/salmon-04.jpg',
  ],
  noodles: [
    '/food-images/noodles-01.jpg',
    '/food-images/noodles-02.jpg',
    '/food-images/noodles-03.jpg',
    '/food-images/noodles-04.jpg',
  ],
  hotpot: [
    '/food-images/hotpot-01.jpg',
    '/food-images/hotpot-02.jpg',
    '/food-images/hotpot-03.jpg',
    '/food-images/hotpot-04.jpg',
  ],
  salad: [
    '/food-images/salad-01.jpg',
    '/food-images/salad-02.jpg',
    '/food-images/salad-03.jpg',
    '/food-images/salad-04.jpg',
  ],
  convenience: [
    '/food-images/convenience-01.jpg',
    '/food-images/convenience-02.jpg',
    '/food-images/convenience-03.jpg',
    '/food-images/convenience-04.jpg',
  ],
  fried: [
    '/food-images/fried-01.jpg',
    '/food-images/fried-02.jpg',
    '/food-images/fried-03.jpg',
    '/food-images/fried-04.jpg',
  ],
  dessert: [
    '/food-images/dessert-01.jpg',
    '/food-images/dessert-02.jpg',
    '/food-images/dessert-03.jpg',
    '/food-images/dessert-04.jpg',
  ],
  drink: [
    '/food-images/drink-01.jpg',
    '/food-images/drink-02.jpg',
    '/food-images/drink-03.jpg',
    '/food-images/drink-04.jpg',
  ],
  fruit: [
    '/food-images/fruit-01.jpg',
    '/food-images/fruit-02.jpg',
    '/food-images/fruit-03.jpg',
    '/food-images/fruit-04.jpg',
  ],
  snack: [
    '/food-images/snack-01.jpg',
    '/food-images/snack-02.jpg',
    '/food-images/snack-03.jpg',
    '/food-images/snack-04.jpg',
  ],
  breakfast: [
    '/food-images/breakfast-01.jpg',
    '/food-images/breakfast-02.jpg',
    '/food-images/breakfast-03.jpg',
    '/food-images/breakfast-04.jpg',
  ],
  restaurant: [
    '/food-images/restaurant-01.jpg',
    '/food-images/restaurant-02.jpg',
    '/food-images/restaurant-03.jpg',
    '/food-images/restaurant-04.jpg',
  ],
}

export const DEFAULT_CATEGORY_IMAGE = CATEGORY_IMAGE_POOL.restaurant[0]

export type FoodImageSource = 'user' | 'brand' | 'cluster' | 'category'

export interface FoodImageInput {
  name: string
  store?: string
  /** Priority 1 — user capture */
  userUploadedPhoto?: string
  /** Priority 2 — menu KB brand asset */
  officialBrandImage?: string
  /** Priority 3 — Food DNA cluster hero */
  clusterHeroImage?: string
  /** Explicit category override */
  imageCategory?: ImageCategory
  /** Legacy alias for userUploadedPhoto */
  photo_url?: string
}

export interface ResolvedFoodImage {
  src: string
  source: FoodImageSource
  imageCategory: ImageCategory
}

function hashSeed(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function pickCategoryImage(category: ImageCategory, seed: string): string {
  const pool = CATEGORY_IMAGE_POOL[category] ?? CATEGORY_IMAGE_POOL.restaurant
  if (pool.length === 0) return DEFAULT_CATEGORY_IMAGE
  return pool[hashSeed(seed || category) % pool.length] ?? pool[0]
}

export function isUsableFoodPhoto(url: string | undefined | null): boolean {
  if (!url?.trim()) return false
  if (/7-11\.com\.tw\/images\/products\//i.test(url)) return false
  if (/placeholder|default\.jpg/i.test(url)) return false
  return url.startsWith('/') || /^https?:\/\//i.test(url)
}

interface ClassifyRule {
  category: ImageCategory
  pattern: RegExp
  priority: number
  nameOnly?: boolean
}

const BUBBLE_TEA_STORES =
  /五十嵐|清心福全|CoCo都可|可不可|麻古茶坊|迷客夏|大苑子|茶湯會|烏弄|得正|一沐日|龜記|萬波|珍煮丹|COMEBUY|先喝道|茶聚|老賴茶棧|再睡五分鐘|八曜和茶|鶴茶樓|水巷茶弄|日出茶太/
const COFFEE_STORES =
  /星巴克|路易莎|85度C|cama|伯朗咖啡|成真咖啡|黑沃咖啡|丹堤咖啡|多那之|CAFE!N/
const CONVENIENCE_STORES = /7-11|全家|萊爾富|OK超商/
const BREAKFAST_STORES = /美而美|麥味登|弘爺漢堡|拉亞漢堡|早安美芝城|晨間廚房|呷尚寶|早安山丘|Q Burger/

const CLASSIFY_RULES: ClassifyRule[] = [
  { category: 'salad', pattern: /沙拉/, priority: 97, nameOnly: true },
  { category: 'bento', pattern: /便當|雞腿飯|排骨飯|燴飯|丼|油飯|滷肉飯|肉燥飯/, priority: 96, nameOnly: true },
  { category: 'drink', pattern: /手搖|奶茶|茶飲|珍珠鮮奶|鮮奶茶|珍奶/, priority: 95, nameOnly: true },
  { category: 'breakfast', pattern: /蛋餅|蘿蔔糕|吐司|可頌|貝果|帕尼尼|蛋堡/, priority: 94, nameOnly: true },
  { category: 'salmon', pattern: /壽司|握壽司|軍艦|手卷|刺身|生魚片|鮭魚|鱈魚|生魚|魚排/, priority: 93, nameOnly: true },
  { category: 'hotpot', pattern: /火鍋|麻辣鍋|涮涮|石頭火鍋|鴛鴦鍋/, priority: 92, nameOnly: true },
  { category: 'bento', pattern: /咖哩|丼/, priority: 91, nameOnly: true },
  { category: 'convenience', pattern: /關東煮|御飯糰|飯糰|茶葉蛋/, priority: 91, nameOnly: true },
  { category: 'bento', pattern: /炸雞飯|豬排飯|雞飯|排骨飯|燴飯|打拋/, priority: 90, nameOnly: true },
  { category: 'fried', pattern: /鍋貼|水餃|餃子|煎餃|小籠包|咔啦|炸雞|鹽酥/, priority: 89, nameOnly: true },
  { category: 'fried', pattern: /披薩|pizza|大麥克|麥香雞|勁辣|吉士堡|雙層牛肉|牛肉堡|雞腿堡|漢堡/, priority: 89, nameOnly: true },
  { category: 'fried', pattern: /潛艇堡|subway|三明治|三文治/i, priority: 88, nameOnly: true },
  { category: 'bento', pattern: /三杯雞|麻油雞|照燒雞|打拋|滷肉|肉燥/, priority: 87, nameOnly: true },
  { category: 'noodles', pattern: /牛肉麵|牛麵|拉麵|義大利麵|烏龍麵|炒麵|鐵板麵|麵線|米粉|冬粉/, priority: 86, nameOnly: true },
  { category: 'salad', pattern: /燙青菜|燙時蔬|青菜|時蔬|蔬菜|沙拉|蔬食碗|輕食/, priority: 85, nameOnly: true },
  { category: 'dessert', pattern: /蛋糕|布丁|冰品|霜淇淋|甜點|提拉米蘇|司康|馬卡龍/, priority: 84, nameOnly: true },
  { category: 'fruit', pattern: /香蕉|蘋果|芭樂|火龍果|奇異果|葡萄|水果/, priority: 83, nameOnly: true },
  { category: 'snack', pattern: /餅乾|洋芋片|堅果|點心|小點/, priority: 82, nameOnly: true },
  { category: 'drink', pattern: /(?:^|[^炸])咖啡|latte|拿鐵|美式咖啡|卡布|瑪奇朵|濃縮/, priority: 81, nameOnly: true },
  { category: 'drink', pattern: /豆漿|鮮奶|果汁|氣泡飲|可樂|雪碧|飲料/, priority: 80, nameOnly: true },
  { category: 'bento', pattern: /飯/, priority: 40, nameOnly: true },
  { category: 'noodles', pattern: /麵/, priority: 39, nameOnly: true },

  { category: 'drink', pattern: BUBBLE_TEA_STORES, priority: 60 },
  { category: 'drink', pattern: COFFEE_STORES, priority: 59 },
  { category: 'fried', pattern: /肯德基|KFC|頂呱呱|漢堡王|摩斯漢堡|麥當勞|丹丹漢堡/, priority: 58 },
  { category: 'fried', pattern: /必勝客|達美樂|Subway/i, priority: 57 },
  { category: 'breakfast', pattern: BREAKFAST_STORES, priority: 56 },
  { category: 'convenience', pattern: CONVENIENCE_STORES, priority: 55 },
]

const SORTED_RULES = [...CLASSIFY_RULES].sort((a, b) => b.priority - a.priority)

export function classifyImageCategory(name: string, store?: string): ImageCategory {
  for (const rule of SORTED_RULES.filter(r => r.nameOnly)) {
    if (rule.pattern.test(name)) return rule.category
  }
  const text = `${name} ${store ?? ''}`
  for (const rule of SORTED_RULES.filter(r => !r.nameOnly)) {
    if (rule.pattern.test(text)) return rule.category
  }
  if (store) {
    if (CONVENIENCE_STORES.test(store)) return 'convenience'
    if (BUBBLE_TEA_STORES.test(store)) return 'drink'
    if (COFFEE_STORES.test(store)) return 'drink'
    if (BREAKFAST_STORES.test(store)) return 'breakfast'
  }
  return 'restaurant'
}

export function resolveFoodImage(input: FoodImageInput): ResolvedFoodImage {
  const userPhoto = input.userUploadedPhoto ?? input.photo_url
  const imageCategory =
    input.imageCategory ?? classifyImageCategory(input.name, input.store)

  if (isUsableFoodPhoto(userPhoto)) {
    return { src: userPhoto!, source: 'user', imageCategory }
  }

  if (!SHOW_AI_FOOD_IMAGES) {
    return { src: '', source: 'category', imageCategory }
  }

  if (isUsableFoodPhoto(input.officialBrandImage)) {
    return { src: input.officialBrandImage!, source: 'brand', imageCategory }
  }
  if (isUsableFoodPhoto(input.clusterHeroImage)) {
    return { src: input.clusterHeroImage!, source: 'cluster', imageCategory }
  }

  return {
    src: pickCategoryImage(imageCategory, `${input.name}|${input.store ?? ''}`),
    source: 'category',
    imageCategory,
  }
}
