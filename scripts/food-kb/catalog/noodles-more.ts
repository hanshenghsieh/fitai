import type { BrandCatalog } from './helpers'
import { drink, meal, side } from './helpers'

export const NOODLES_CATALOG: BrandCatalog = {
  lindongfang: [
    meal('紅燒牛肉麵（大碗）', 680, 36, 78, 22, 200, 'lunch', { aliases: ['牛肉麵'] }),
    meal('清燉牛肉麵（大碗）', 620, 38, 72, 16, 220, 'lunch'),
    side('滷味拼盤（小）', 180, 14, 80),
  ],
  ichiran: [
    meal('天然豚骨拉麵（一碗）', 620, 24, 72, 24, 280, 'lunch', { tags: ['ramen'] }),
    meal('天然豚骨拉麵（加麵）', 780, 28, 96, 28, 330, 'lunch'),
    side('替玉（加麵）', 160, 6, 32, 60),
    side('煮蛋', 80, 6, 15),
  ],
  kagetsu: [
    meal('東京豚骨拉麵', 580, 22, 70, 20, 210, 'lunch'),
    meal('味噌拉麵', 540, 20, 68, 18, 200, 'lunch'),
    meal('醬油拉麵', 520, 18, 66, 16, 190, 'lunch'),
  ],
  sihai: [
    meal('清燉牛肉麵', 580, 32, 70, 16, 150, 'lunch'),
    meal('紅燒牛肉麵', 620, 30, 74, 18, 160, 'lunch'),
    meal('榨菜肉絲麵', 480, 18, 62, 14, 120, 'lunch'),
    meal('擔擔麵', 520, 18, 62, 20, 120, 'lunch'),
    side('滷味拼盤', 200, 16, 90),
  ],
  wangcheng: [
    meal('綠咖哩雞套餐', 680, 28, 72, 32, 280, 'lunch'),
    meal('打拋豬肉片套餐', 720, 30, 75, 34, 260, 'lunch'),
    meal('月亮蝦餅', 320, 12, 28, 18, 120, 'lunch', { role: 'side' }),
    meal('泰式炒河粉', 620, 26, 78, 22, 240, 'lunch'),
  ],
  daxin: [
    meal('紅咖哩雞腿排麵', 580, 28, 68, 22, 180, 'lunch'),
    meal('綠咖哩雞腿排麵', 560, 26, 66, 20, 175, 'lunch'),
    meal('打拋豬肉飯', 620, 26, 72, 22, 160, 'lunch'),
    side('泰式奶茶', 220, 2, 55),
  ],
  jianren: [
    meal('舒肥雞胸餐盒', 460, 42, 38, 12, 145, 'lunch'),
    meal('炙烤雞腿餐盒', 500, 36, 45, 16, 145, 'lunch'),
    meal('糖心蛋雞胸餐', 400, 38, 32, 12, 160, 'dinner'),
  ],
}

export const HOTPOT_CATALOG: BrandCatalog = {
  shierguo: [
    meal('個人麻辣鍋', 580, 28, 32, 32, 298, 'dinner'),
    meal('石頭鍋套餐', 520, 32, 28, 24, 268, 'dinner'),
    meal('昆布鍋套餐', 420, 30, 22, 16, 328, 'dinner'),
    side('白飯', 200, 4, 35),
    side('烏龍麵', 180, 6, 40),
  ],
  haidilao: [
    meal('清湯鍋套餐（一人）', 480, 32, 18, 22, 398, 'dinner'),
    meal('麻辣鍋套餐（一人）', 620, 30, 28, 36, 428, 'dinner'),
    meal('番茄鍋套餐（一人）', 520, 28, 32, 20, 408, 'dinner'),
    side('撈麵', 200, 6, 45),
  ],
  'wagyu-shabu': [
    meal('和牛套餐（一人）', 680, 38, 18, 42, 580, 'dinner'),
    meal('豬五花套餐', 580, 28, 16, 36, 380, 'dinner'),
    meal('雞腿肉套餐', 480, 32, 12, 20, 320, 'dinner'),
  ],
}

export const NIGHT_MARKET_CATALOG: BrandCatalog = {
  'night-market-tw': [
    meal('雞排', 580, 32, 38, 32, 65, 'dinner', { aliases: ['鹽酥雞排'], tags: ['night_market'] }),
    meal('鹽酥雞', 420, 28, 18, 26, 60, 'dinner', { aliases: ['鹹酥雞'] }),
    meal('蔥油餅', 380, 8, 48, 16, 45, 'dinner'),
    meal('地瓜球', 280, 2, 52, 8, 40, 'dinner'),
    meal('滷味拼盤', 320, 22, 12, 18, 80, 'dinner'),
    meal('臭豆腐', 280, 14, 18, 16, 55, 'dinner'),
    meal('蚵仔煎', 420, 12, 48, 18, 70, 'dinner'),
    meal('大腸包小腸', 480, 16, 42, 26, 55, 'dinner'),
    meal('潤餅', 380, 12, 52, 12, 45, 'lunch'),
    meal('飯糰', 220, 6, 38, 4, 30, 'breakfast'),
    meal('蛋餅', 280, 10, 32, 12, 35, 'breakfast'),
    meal('鍋燒意麵', 420, 14, 52, 14, 80, 'dinner'),
    meal('肉圓', 320, 8, 48, 10, 40, 'dinner'),
    meal('碗粿', 280, 6, 52, 6, 35, 'breakfast'),
    meal('肉羹麵', 480, 18, 62, 14, 70, 'lunch'),
  ],
}

export const SUPERMARKET_CATALOG: BrandCatalog = {
  pxmart: [
    meal('雞胸肉（100g）', 110, 23, 0, 1, 45, 'lunch', { role: 'protein', tags: ['ingredient'] }),
    meal('糙米飯（一盒）', 280, 6, 58, 2, 35, 'lunch', { role: 'carb' }),
    meal('綜合沙拉盒', 120, 4, 12, 6, 59, 'lunch', { role: 'side' }),
    meal('鮭魚切片（100g）', 180, 20, 0, 10, 89, 'dinner', { role: 'protein' }),
    meal('茶葉蛋（2顆）', 140, 12, 2, 8, 25, 'breakfast', { role: 'protein' }),
    meal('御飯糰（鮭魚）', 210, 6, 38, 4, 35, 'breakfast', { role: 'carb' }),
    side('優格（原味）', 100, 8, 25),
    side('香蕉（1根）', 105, 1, 30),
  ],
  carrefour: [
    meal('雞胸肉（100g）', 110, 23, 0, 1, 49, 'lunch', { role: 'protein' }),
    meal('沙拉雞胸盒', 280, 32, 12, 8, 99, 'lunch'),
    meal('鮭魚刺身（100g）', 180, 20, 0, 10, 129, 'dinner', { role: 'protein' }),
    meal('微波便當（雞腿）', 520, 26, 68, 18, 89, 'lunch'),
    meal('微波義大利麵', 480, 18, 62, 16, 79, 'lunch'),
  ],
}
