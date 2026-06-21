import type { BrandCatalog } from './helpers'
import { drink, meal, side } from './helpers'

export const BENTO_CATALOG: BrandCatalog = {
  bdf: [
    meal('鍋貼（10顆）', 380, 16, 42, 14, 65, 'lunch', { tags: ['dumpling'] }),
    meal('鍋貼套餐（10顆+酸辣湯）', 480, 22, 52, 18, 99, 'breakfast'),
    meal('鍋貼套餐（15顆+玉米湯）', 620, 28, 68, 24, 129, 'lunch'),
    meal('酸辣湯', 80, 4, 10, 3, 35, 'lunch', { role: 'side', tags: ['soup'] }),
    side('玉米湯', 90, 3, 30),
  ],
  lsh: [
    meal('舒肥雞胸健康餐盒', 460, 42, 38, 12, 150, 'lunch', { tags: ['healthy'] }),
    meal('舒肥牛腱健康餐盒', 520, 40, 42, 18, 165, 'lunch'),
    meal('鮭魚健康餐盒', 450, 36, 35, 16, 175, 'lunch'),
    meal('舒肥雞胸+地瓜餐盒', 420, 40, 32, 10, 155, 'dinner'),
    meal('鯛魚健康餐盒', 400, 34, 30, 12, 170, 'dinner'),
  ],
  hsz: [
    meal('滷肉飯', 520, 16, 72, 16, 45, 'lunch', { aliases: ['魯肉飯'] }),
    meal('雙醬便當', 580, 22, 68, 22, 95, 'lunch'),
    meal('排骨飯', 620, 28, 72, 22, 100, 'lunch'),
    meal('雞腿飯', 580, 32, 68, 18, 95, 'lunch'),
    side('豆干', 80, 8, 20),
    side('滷蛋', 80, 6, 15),
  ],
  sunright: [
    meal('肉燥飯套餐', 520, 18, 72, 16, 89, 'breakfast'),
    meal('排骨飯', 600, 26, 70, 20, 95, 'lunch'),
    meal('雞腿飯', 580, 28, 68, 18, 90, 'lunch'),
    meal('牛肉麵', 620, 32, 72, 18, 120, 'lunch'),
    meal('乾麵套餐', 560, 18, 78, 16, 85, 'lunch'),
  ],
  wutao: [
    meal('池上便當（雞腿）', 580, 30, 68, 20, 90, 'lunch'),
    meal('池上便當（排骨）', 600, 26, 70, 22, 95, 'lunch'),
    meal('池上便當（鯛魚）', 520, 28, 62, 16, 100, 'lunch'),
    meal('素食便當', 480, 12, 72, 14, 80, 'lunch'),
  ],
}

export const BREAKFAST_CATALOG: BrandCatalog = {
  meirumei: [
    meal('原味蛋餅', 280, 10, 32, 12, 35, 'breakfast', { aliases: ['蛋餅'] }),
    meal('火腿蛋餅', 340, 16, 32, 16, 45, 'breakfast'),
    meal('玉米蛋餅', 300, 11, 34, 12, 40, 'breakfast'),
    meal('鐵板麵（沙茶）', 420, 14, 52, 16, 55, 'breakfast'),
    meal('鐵板麵套餐', 520, 18, 58, 22, 75, 'breakfast'),
    meal('豬肉蛋吐司', 380, 18, 36, 18, 50, 'breakfast'),
  ],
  'goodmorning-moz': [
    meal('總匯蛋餅', 450, 20, 36, 24, 65, 'breakfast'),
    meal('燒肉蛋餅', 420, 18, 34, 22, 60, 'breakfast'),
    meal('卡拉雞腿蛋餅', 480, 22, 36, 24, 70, 'breakfast'),
    meal('鐵板麵套餐', 540, 20, 60, 24, 80, 'breakfast'),
    meal('法式吐司套餐', 520, 16, 58, 22, 85, 'breakfast'),
  ],
  hongye: [
    meal('燒肉蛋餅', 400, 18, 34, 20, 55, 'breakfast'),
    meal('卡拉雞腿堡', 450, 20, 38, 22, 65, 'breakfast'),
    meal('豬肉蛋堡', 420, 18, 36, 20, 60, 'breakfast'),
    meal('鐵板麵', 400, 14, 50, 14, 50, 'breakfast'),
  ],
  laya: [
    meal('燒肉蛋餅', 410, 18, 35, 20, 58, 'breakfast'),
    meal('雞肉蛋餅', 380, 16, 34, 18, 55, 'breakfast'),
    meal('卡拉雞腿排蛋餅', 460, 22, 36, 22, 68, 'breakfast'),
    meal('火腿蛋吐司', 360, 16, 34, 16, 48, 'breakfast'),
  ],
}

export const COFFEE_CATALOG: BrandCatalog = {
  starbucks: [
    drink('美式咖啡（中杯）', 12, 1, 95, { aliases: ['美式'], tags: ['coffee'] }),
    drink('拿鐵（中杯）', 152, 14, 120, { fat_g: 8, aliases: ['latte'], tags: ['coffee'] }),
    drink('焦糖瑪奇朵（中杯）', 264, 32, 135, { sugar_g: 36, tags: ['coffee'] }),
    drink('冷萃咖啡（中杯）', 5, 1, 120, { tags: ['coffee'] }),
    meal('雞肉沙拉三明治', 350, 22, 32, 14, 105, 'breakfast', { tags: ['sandwich'] }),
    meal('茄香蔬食三明治', 320, 12, 38, 14, 95, 'breakfast'),
    meal('藍莓瑪芬', 380, 6, 52, 16, 65, 'breakfast', { role: 'side' }),
    side('巧克力司康', 420, 48, 8, 75),
  ],
  louisa: [
    drink('美式咖啡（中杯）', 8, 1, 65, { tags: ['coffee'] }),
    drink('拿鐵（中杯）', 170, 12, 8, 85, { tags: ['coffee'] }),
    drink('小農拿鐵（中杯）', 190, 14, 10, 95, { tags: ['coffee'] }),
    meal('火腿起司可頌', 380, 14, 36, 20, 75, 'breakfast'),
    meal('雞胸沙拉', 280, 24, 12, 14, 120, 'lunch', { tags: ['salad'] }),
  ],
  '85c': [
    drink('美式咖啡（中杯）', 10, 1, 75, { tags: ['coffee'] }),
    drink('拿鐵（中杯）', 175, 13, 8, 90, { tags: ['coffee'] }),
    meal('起司蛋糕（切片）', 380, 6, 42, 16, 95, 'dinner', { role: 'side' }),
    meal('海苔肉鬆麵包', 320, 10, 38, 10, 45, 'breakfast'),
    meal('三明治（雞肉）', 340, 20, 34, 14, 65, 'breakfast'),
  ],
  cama: [
    drink('美式（中杯）', 8, 1, 55, { tags: ['coffee'] }),
    drink('拿鐵（中杯）', 165, 12, 8, 75, { tags: ['coffee'] }),
    drink('黑糖拿鐵（中杯）', 220, 28, 10, 85, { tags: ['coffee'] }),
    meal('貝果（燻雞）', 320, 18, 38, 10, 65, 'breakfast'),
  ],
}
