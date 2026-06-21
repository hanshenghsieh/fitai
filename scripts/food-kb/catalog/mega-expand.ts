/**
 * 將每品牌補齊至 MIN_ITEMS_PER_BRAND 獨立單點（目標 5000+ 品項）
 * 營養素依品項 archetype + 品牌 hash 微調，供骰子嚴格配餐使用
 */
import type { BrandEntry } from '@/lib/food-kb/brand-registry'
import type { CatalogItem } from './helpers'
import { drink, meal, side } from './helpers'

export const MIN_ITEMS_PER_BRAND = 35

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function tweak(item: CatalogItem, brandSlug: string, name: string): CatalogItem {
  const h = hash(`${brandSlug}:${name}`)
  const pct = ((h % 13) - 6) / 100
  return {
    ...item,
    name,
    calories: Math.max(1, Math.round(item.calories * (1 + pct))),
    protein_g: Math.max(0, Math.round(item.protein_g * (1 + pct * 0.5))),
    carbs_g: Math.max(0, Math.round(item.carbs_g * (1 + pct))),
    fat_g: Math.max(0, Math.round(item.fat_g * (1 + pct * 0.5))),
    price: Math.max(10, Math.round(item.price * (1 + (h % 5) / 100))),
  }
}

type BankRow = CatalogItem

function convenienceBank(): BankRow[] {
  return [
    meal('厚切豬排飯', 580, 28, 68, 20, 89, 'lunch', { tags: ['bento'] }),
    meal('咖哩雞腿飯', 560, 30, 66, 18, 85, 'lunch', { tags: ['bento'] }),
    meal('紅燒牛腩飯', 620, 32, 70, 20, 95, 'lunch'),
    meal('義大利麵餐盒', 520, 18, 62, 18, 79, 'lunch'),
    meal('奶油培根義大利麵', 540, 16, 58, 22, 82, 'lunch'),
    meal('海鮮義大利麵', 500, 22, 60, 16, 85, 'lunch'),
    meal('韓式拌飯餐盒', 480, 18, 62, 16, 79, 'lunch'),
    meal('麻婆豆腐飯', 520, 16, 68, 18, 75, 'lunch'),
    meal('宮保雞丁飯', 540, 26, 64, 18, 82, 'lunch'),
    meal('三杯雞飯', 560, 28, 62, 20, 85, 'lunch'),
    meal('鹽酥雞飯', 580, 24, 66, 22, 80, 'lunch'),
    meal('炸雞排便當', 620, 32, 68, 24, 90, 'lunch'),
    meal('燻雞胸便當', 420, 36, 32, 10, 85, 'lunch'),
    meal('鮭魚飯糰', 220, 8, 38, 4, 40, 'breakfast', { tags: ['rice'] }),
    meal('鮪魚飯糰', 210, 7, 36, 4, 38, 'breakfast'),
    meal('肉鬆飯糰', 190, 5, 38, 4, 30, 'breakfast'),
    meal('茶葉蛋', 80, 7, 1, 5, 15, 'breakfast', { role: 'protein' }),
    meal('溫泉蛋', 90, 7, 1, 6, 20, 'breakfast', { role: 'protein' }),
    meal('雞肉沙拉', 180, 18, 8, 8, 69, 'lunch'),
    meal('鮮蝦沙拉', 120, 8, 8, 6, 59, 'lunch'),
    meal('雞肉三明治', 320, 22, 32, 12, 69, 'lunch'),
    meal('火腿起司三明治', 380, 18, 36, 16, 72, 'lunch'),
    meal('總匯三明治', 420, 20, 38, 18, 85, 'lunch'),
    meal('關東煮綜合套餐', 280, 14, 28, 8, 99, 'dinner'),
    meal('關東煮（大份）', 360, 18, 36, 10, 120, 'dinner'),
    side('玉米濃湯', 120, 4, 18, 4, 35),
    side('味噌湯', 40, 3, 4, 1, 25),
    side('茶碗蒸', 80, 6, 4, 4, 45),
    side('薯條（小）', 180, 2, 24, 8, 35, { tags: ['fried'] }),
    side('雞塊（4塊）', 200, 12, 14, 12, 45),
    drink('無糖綠茶（600ml）', 0, 0, 0, 25, { role: 'drink' }),
    drink('黑豆茶（600ml）', 0, 0, 0, 25, { role: 'drink' }),
    drink('鮮奶茶（中杯）', 220, 5, 32, 50, { role: 'drink' }),
    drink('美式咖啡（中杯）', 10, 1, 1, 55, { role: 'drink', meal_category: 'breakfast' }),
    drink('拿鐵（中杯）', 180, 8, 14, 75, { role: 'drink', meal_category: 'breakfast' }),
    meal('水果優格杯', 150, 6, 22, 4, 55, 'breakfast'),
    meal('燕麥杯', 200, 8, 32, 6, 65, 'breakfast'),
    meal('雞胸肉沙拉碗', 280, 32, 12, 10, 99, 'lunch'),
    meal('鮭魚沙拉碗', 320, 28, 14, 16, 109, 'lunch'),
    meal('蔬菜沙拉杯', 80, 3, 10, 4, 45, 'lunch', { role: 'side' }),
    meal('肉燥飯', 450, 14, 68, 14, 55, 'lunch', { tags: ['rice'] }),
    meal('滷肉飯', 480, 14, 70, 16, 50, 'lunch'),
    meal('排骨乾麵', 580, 24, 68, 20, 85, 'lunch'),
    meal('麻醬麵', 520, 16, 64, 18, 75, 'lunch'),
    meal('水餃（8顆）', 360, 14, 42, 12, 65, 'lunch'),
    meal('鍋貼（6顆）', 280, 12, 28, 12, 55, 'lunch'),
    meal('茶葉蛋×2', 160, 14, 2, 10, 28, 'breakfast', { role: 'protein' }),
    meal('雞肉飯', 480, 26, 58, 14, 70, 'lunch'),
    meal('燒臘飯（雞腿）', 560, 30, 64, 18, 85, 'lunch'),
    meal('燒臘飯（排骨）', 600, 26, 68, 22, 90, 'lunch'),
  ]
}

function breakfastBank(): BankRow[] {
  return [
    meal('原味蛋餅', 280, 10, 32, 12, 35, 'breakfast'),
    meal('火腿蛋餅', 340, 16, 32, 16, 45, 'breakfast'),
    meal('起司蛋餅', 360, 14, 34, 18, 48, 'breakfast'),
    meal('玉米蛋餅', 320, 12, 36, 14, 42, 'breakfast'),
    meal('燒肉蛋餅', 450, 20, 36, 22, 58, 'breakfast'),
    meal('燒肉總匯蛋餅', 480, 22, 38, 24, 65, 'breakfast'),
    meal('鐵板麵', 480, 16, 56, 20, 68, 'breakfast'),
    meal('鐵板麵套餐', 520, 18, 58, 22, 75, 'breakfast'),
    meal('豬肉滿福堡加蛋', 450, 20, 36, 24, 55, 'breakfast'),
    meal('牛肉漢堡加蛋', 480, 24, 36, 26, 65, 'breakfast'),
    meal('雞肉蛋餅', 380, 20, 34, 18, 55, 'breakfast'),
    meal('總匯三明治', 420, 18, 38, 20, 60, 'breakfast'),
    meal('燻雞三明治', 360, 22, 32, 14, 58, 'breakfast'),
    meal('肉燥飯', 450, 14, 68, 14, 55, 'breakfast'),
    meal('雞肉粥', 320, 16, 48, 6, 65, 'breakfast'),
    meal('皮蛋瘦肉粥', 380, 20, 52, 10, 75, 'breakfast'),
    side('薯餅', 180, 2, 22, 10, 25),
    side('油條', 220, 4, 28, 12, 20),
    side('燒餅', 280, 8, 38, 10, 30),
    drink('豆漿（中杯）', 120, 8, 10, 25, { role: 'drink', meal_category: 'breakfast' }),
    drink('米漿（中杯）', 180, 4, 28, 6, 30, { role: 'drink', meal_category: 'breakfast' }),
    drink('紅茶（中杯）', 80, 0, 20, 25, { role: 'drink', meal_category: 'breakfast' }),
    meal('蘿蔔糕（3片）', 240, 4, 38, 8, 40, 'breakfast'),
    meal('燒肉飯', 520, 22, 68, 16, 70, 'breakfast'),
    meal('雞肉飯', 480, 26, 58, 14, 65, 'breakfast'),
    meal('控肉飯', 560, 18, 72, 20, 75, 'breakfast'),
    meal('排骨飯', 620, 26, 70, 22, 85, 'breakfast'),
    meal('雞腿飯', 580, 32, 66, 18, 80, 'breakfast'),
    meal('燒餅油條套餐', 480, 12, 58, 22, 70, 'breakfast'),
    meal('蛋餅+奶茶套餐', 420, 14, 48, 18, 65, 'breakfast'),
    meal('法式吐司', 380, 8, 52, 16, 55, 'breakfast'),
    meal('鬆餅（2片）', 420, 8, 58, 18, 60, 'breakfast'),
    meal('可頌', 280, 6, 32, 14, 45, 'breakfast', { role: 'side' }),
    meal('貝果（起司）', 320, 12, 42, 10, 55, 'breakfast'),
    meal('燕麥杯', 200, 8, 32, 6, 65, 'breakfast'),
    meal('優格杯', 150, 6, 22, 4, 55, 'breakfast'),
    meal('茶葉蛋×2', 160, 14, 2, 10, 28, 'breakfast', { role: 'protein' }),
    meal('燻雞胸便當', 420, 36, 32, 10, 85, 'breakfast'),
    meal('鮭魚飯糰', 220, 8, 38, 4, 40, 'breakfast'),
    meal('鮪魚飯糰', 210, 7, 36, 4, 38, 'breakfast'),
  ]
}

function bubbleteaBank(): BankRow[] {
  const flavors: Array<[string, number, number, number, number, number]> = [
    ['珍珠奶茶', 668, 4, 68, 12, 55],
    ['波霸奶茶', 678, 4, 70, 12, 55],
    ['四季春青茶', 119, 0, 30, 0, 30],
    ['烏龍茶', 5, 0, 1, 0, 30],
    ['紅茶', 5, 0, 1, 0, 30],
    ['綠茶', 5, 0, 1, 0, 30],
    ['8冰茶', 291, 1, 72, 0, 45],
    ['百香雙響炮', 280, 1, 68, 0, 60],
    ['檸檬青茶', 180, 0, 44, 0, 45],
    ['蜂蜜綠茶', 220, 0, 54, 0, 45],
    ['冬瓜茶', 120, 0, 30, 0, 35],
    ['鮮奶茶', 320, 5, 42, 12, 50],
    ['紅茶拿鐵', 334, 4, 59, 0, 65],
    ['重焙烏龍拿鐵', 334, 4, 59, 0, 65],
    ['阿華田', 359, 5, 48, 8, 55],
    ['可可芭蕾', 380, 4, 52, 10, 55],
    ['冰淇淋紅茶', 436, 1, 77, 0, 60],
    ['芒果青', 319, 1, 78, 0, 55],
    ['荔枝烏龍', 304, 1, 76, 0, 55],
    ['葡萄柚綠茶', 250, 0, 62, 0, 50],
    ['金桔檸檬', 200, 0, 50, 0, 45],
    ['仙草凍奶茶', 380, 2, 58, 8, 55],
    ['布丁奶茶', 420, 3, 62, 10, 55],
    ['椰果奶茶', 400, 2, 60, 8, 50],
    ['芋頭奶茶', 450, 3, 64, 12, 60],
    ['燕麥奶茶', 380, 6, 48, 10, 60],
    ['豆漿綠茶', 180, 6, 28, 4, 45],
    ['多多綠茶', 200, 2, 48, 0, 45],
    ['梅子綠茶', 160, 0, 40, 0, 40],
    ['蜂蜜檸檬', 190, 0, 48, 0, 45],
    ['冬瓜檸檬', 150, 0, 38, 0, 40],
    ['紅豆奶茶', 420, 4, 62, 10, 55],
    ['抹茶拿鐵', 340, 6, 42, 10, 65],
    ['焦糖瑪奇朵', 380, 6, 48, 12, 70],
    ['黑糖珍珠鮮奶', 520, 6, 58, 18, 65],
    ['芋圓奶茶', 460, 3, 66, 12, 60],
    ['愛玉檸檬', 180, 0, 44, 0, 45],
    ['仙草凍冬瓜', 80, 0, 20, 0, 35],
    ['鮮榨柳橙汁', 160, 2, 38, 0, 55],
    ['鮮榨西瓜汁', 140, 1, 34, 0, 55],
  ]
  const sizes = ['（大杯）', '（中杯）', '（小杯）'] as const
  const scale = [1, 0.72, 0.55]
  const rows: BankRow[] = []
  for (const [name, cal, pro, carb, fat, price] of flavors) {
    for (let s = 0; s < sizes.length; s++) {
      if (s > 0 && /茶$|青茶|烏龍|紅茶|綠茶/.test(name) && !name.includes('奶茶') && !name.includes('拿鐵')) {
        if (s === 2) continue
      }
      rows.push(
        drink(
          `${name}${sizes[s]}`,
          Math.round(cal * scale[s]!),
          Math.round(carb * scale[s]!),
          Math.round(fat * scale[s]!),
          Math.round(price * (0.85 + s * 0.1)),
          { tags: ['bubble_tea'] }
        )
      )
    }
  }
  return rows
}

function chainMealBank(): BankRow[] {
  return [
    meal('經典牛肉堡', 520, 26, 42, 28, 89, 'lunch', { tags: ['burger'] }),
    meal('雙層牛肉堡', 580, 32, 44, 32, 109, 'lunch'),
    meal('雞腿堡', 480, 24, 40, 24, 85, 'lunch'),
    meal('咔啦脆雞堡', 520, 26, 42, 26, 95, 'lunch'),
    meal('烤雞沙拉碗', 280, 32, 12, 8, 120, 'lunch'),
    meal('雞塊（6塊）', 280, 16, 18, 16, 65, 'lunch', { role: 'side' }),
    meal('雞腿飯套餐', 720, 30, 72, 32, 149, 'lunch'),
    meal('牛肉麵', 620, 32, 72, 18, 160, 'lunch'),
    meal('排骨飯', 620, 28, 72, 22, 100, 'lunch'),
    meal('雞腿飯', 580, 32, 68, 18, 95, 'lunch'),
    meal('滷肉飯', 520, 16, 72, 16, 45, 'lunch'),
    meal('牛丼（中）', 650, 30, 82, 18, 145, 'lunch'),
    meal('親子丼', 580, 28, 72, 16, 150, 'lunch'),
    meal('咖哩豬排飯', 720, 24, 82, 28, 180, 'lunch'),
    meal('炸豬排定食', 780, 32, 78, 32, 280, 'lunch'),
    meal('紅燒牛肉麵', 620, 32, 72, 18, 180, 'lunch'),
    meal('豚骨拉麵', 580, 24, 72, 20, 220, 'lunch'),
    meal('味噌拉麵', 540, 22, 68, 18, 210, 'lunch'),
    meal('石鍋拌飯', 640, 28, 82, 18, 260, 'lunch'),
    meal('韓式炸雞（半份）', 480, 28, 28, 28, 280, 'dinner'),
    meal('個人麻辣鍋', 580, 28, 32, 32, 298, 'dinner'),
    meal('石頭鍋套餐', 520, 32, 28, 24, 268, 'dinner'),
    meal('牛五花套餐', 720, 36, 12, 48, 380, 'dinner'),
    meal('綠咖哩雞套餐', 680, 28, 72, 32, 280, 'lunch'),
    meal('打拋豬肉飯', 620, 28, 72, 22, 140, 'lunch'),
    meal('潛艇堡（火雞胸）', 380, 28, 42, 8, 120, 'lunch'),
    meal('潛艇堡（總匯）', 480, 26, 48, 16, 140, 'lunch'),
    meal('瑪格麗特披薩（8吋）', 680, 24, 82, 24, 280, 'lunch'),
    meal('夏威夷披薩（8吋）', 720, 28, 84, 26, 300, 'lunch'),
    meal('雞肉沙拉三明治', 350, 22, 32, 14, 95, 'breakfast'),
    meal('燻雞胸便當', 420, 36, 32, 10, 85, 'lunch'),
    meal('鮭魚握壽司（2貫）', 140, 8, 22, 2, 60, 'lunch'),
    meal('綜合壽司拼盤（8貫）', 380, 22, 54, 6, 180, 'lunch'),
    meal('海鮮丼', 500, 30, 68, 10, 260, 'lunch'),
    meal('鍋貼（10顆）', 380, 16, 42, 14, 65, 'lunch'),
    meal('水餃（10顆）', 450, 18, 52, 16, 90, 'lunch'),
    side('薯條（中）', 320, 4, 42, 14, 45),
    side('味噌湯', 40, 3, 4, 1, 25),
    side('溫泉蛋', 80, 6, 1, 5, 15, { role: 'protein' }),
    side('滷蛋', 80, 6, 2, 5, 10, { role: 'protein' }),
    side('燙青菜', 45, 3, 6, 1, 35),
    side('韓式泡菜', 30, 1, 6, 0, 20),
    side('白飯（一碗）', 280, 6, 58, 0, 20, { role: 'carb' }),
    side('煎餃（5顆）', 220, 8, 28, 8, 80),
    side('蒜香麵包（2片）', 220, 6, 32, 8, 60),
    side('凱薩沙拉', 180, 6, 10, 14, 80),
    drink('無糖綠茶', 0, 0, 0, 25, { role: 'drink' }),
    drink('可樂（中杯）', 180, 0, 46, 0, 35, { role: 'drink' }),
    drink('美式咖啡（中杯）', 10, 1, 1, 75, { role: 'drink' }),
    drink('拿鐵（中杯）', 180, 8, 14, 95, { role: 'drink' }),
  ]
}

const CATEGORY_BANKS: Record<string, () => BankRow[]> = {
  convenience: convenienceBank,
  breakfast: breakfastBank,
  coffee: breakfastBank,
  bubbletea: bubbleteaBank,
  fastfood: chainMealBank,
  japanese: chainMealBank,
  bento: chainMealBank,
  hotpot: chainMealBank,
  bbq: chainMealBank,
  noodles: chainMealBank,
  thai: chainMealBank,
  korean: chainMealBank,
  american: chainMealBank,
  healthy: chainMealBank,
  desserts: chainMealBank,
  supermarket: convenienceBank,
  night_market: chainMealBank,
}

export function fillBrandCatalog(brand: BrandEntry, existing: CatalogItem[]): CatalogItem[] {
  const used = new Set(existing.map(i => i.name))
  const result = [...existing]
  if (result.length >= MIN_ITEMS_PER_BRAND) return result

  const bank = CATEGORY_BANKS[brand.kb_category]?.() ?? chainMealBank()
  const start = hash(brand.slug) % bank.length
  let idx = 0
  let guard = 0

  while (result.length < MIN_ITEMS_PER_BRAND && guard < bank.length * 4) {
    const archetype = bank[(start + idx) % bank.length]!
    const name = archetype.name
    if (!used.has(name)) {
      result.push(tweak(archetype, brand.slug, name))
      used.add(name)
    }
    idx++
    guard++
  }

  return result
}
