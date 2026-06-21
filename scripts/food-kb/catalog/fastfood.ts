import type { BrandCatalog } from './helpers'
import { drink, meal, side } from './helpers'

export const FASTFOOD_CATALOG: BrandCatalog = {
  mcdonalds: [
    meal('大麥克', 563, 26, 42, 30, 115, 'lunch', { tags: ['burger'] }),
    meal('雙層牛肉吉士堡', 480, 28, 35, 26, 95, 'lunch', { tags: ['burger'] }),
    meal('就醬好雞腿堡', 520, 30, 38, 24, 99, 'lunch', { tags: ['burger'] }),
    meal('麥香雞', 380, 18, 36, 18, 65, 'lunch', { tags: ['burger'] }),
    meal('麥香魚', 340, 16, 38, 16, 55, 'lunch', { tags: ['burger'] }),
    meal('勁辣雞腿堡', 480, 26, 40, 24, 89, 'lunch', { tags: ['burger'] }),
    side('麥克雞塊（6塊）', 280, 16, 65, { tags: ['fried'] }),
    side('薯條（中）', 320, 4, 45, { tags: ['side'] }),
    meal('滿足早餐（蛋餅+薯餅+飲）', 420, 18, 45, 20, 89, 'breakfast'),
    meal('咔啦豬肉滿福堡加蛋', 480, 22, 38, 26, 75, 'breakfast'),
  ],
  kfc: [
    meal('咔啦脆雞腿堡', 450, 24, 38, 24, 89, 'lunch'),
    meal('原味雞腿飯', 620, 38, 62, 24, 149, 'lunch'),
    meal('卡洛卡羅烤雞腿排餐', 520, 42, 28, 22, 179, 'lunch'),
    side('咔啦脆雞（2塊）', 280, 18, 75, { tags: ['fried'] }),
    side('蛋塔（1個）', 180, 3, 35, { tags: ['dessert'] }),
    meal('咔啦脆雞捲餅', 390, 18, 34, 20, 69, 'breakfast'),
    meal('烤雞腿排餐（去皮）', 480, 44, 22, 18, 189, 'dinner'),
  ],
  mos: [
    meal('摩斯漢堡', 380, 18, 36, 18, 75, 'lunch'),
    meal('摩斯雞腿堡', 480, 26, 40, 22, 95, 'lunch'),
    meal('海洋堡', 420, 20, 42, 18, 85, 'lunch'),
    meal('燒肉珍珠堡', 380, 16, 35, 18, 65, 'breakfast'),
    meal('摩斯漢堡早餐套餐', 520, 24, 48, 24, 115, 'breakfast'),
    side('薯條（中）', 300, 4, 40, { tags: ['side'] }),
  ],
  subway: [
    meal('烤雞胸潛艇堡（6吋·全麥）', 300, 26, 38, 5, 99, 'lunch', { aliases: ['烤雞沙拉潛艇堡'] }),
    meal('火雞胸潛艇堡（6吋·全麥）', 280, 24, 38, 4, 95, 'lunch'),
    meal('照燒雞胸潛艇堡（6吋）', 300, 26, 42, 5, 99, 'lunch'),
    meal('義式香腸潛艇堡（6吋）', 420, 22, 42, 16, 105, 'lunch'),
    meal('鮪魚潛艇堡（6吋）', 320, 22, 38, 12, 95, 'lunch'),
    meal('蔬菜 Delite 潛艇堡（6吋）', 200, 8, 38, 2, 85, 'lunch'),
    meal('烤雞胸沙拉碗', 160, 28, 8, 3, 120, 'lunch', { role: 'combo', tags: ['salad'] }),
    meal('火雞胸沙拉碗', 140, 26, 8, 2, 118, 'dinner', { tags: ['salad'] }),
    side('燕麥葡萄乾餅乾（1片）', 200, 3, 35, { role: 'side' }),
  ],
  'burger-king': [
    meal('華堡', 660, 28, 49, 40, 129, 'lunch'),
    meal('雙層華堡', 900, 48, 49, 58, 169, 'lunch'),
    meal('國王雞塊（6塊）', 260, 14, 18, 16, 65, 'lunch', { role: 'combo' }),
    meal('雞腿堡', 420, 20, 38, 22, 89, 'lunch'),
  ],
  pizzahut: [
    meal('個人披薩（夏威夷）', 680, 28, 78, 28, 199, 'lunch'),
    meal('個人披薩（燻雞蘑菇）', 720, 32, 76, 32, 219, 'lunch'),
    meal('義大利麵（肉醬）', 580, 22, 72, 22, 179, 'lunch'),
    side('雞翅（3支）', 320, 18, 12, 22, 99, { tags: ['fried'] }),
  ],
  dominos: [
    meal('個人披薩（經典）', 640, 26, 74, 26, 189, 'lunch'),
    meal('個人披薩（彩蔬）', 560, 18, 72, 20, 179, 'lunch'),
    side('烤雞翅（4支）', 360, 22, 8, 24, 109),
  ],
  tkk: [
    meal('頂呱呱原味炸雞（2塊）', 380, 28, 12, 24, 99, 'lunch'),
    meal('頂呱呱炸雞飯', 620, 32, 68, 26, 129, 'lunch'),
    side('地瓜薯條', 280, 3, 42, 45),
  ],
  jiguang: [
    meal('繼光香香雞（小份）', 420, 24, 28, 26, 85, 'lunch'),
    meal('繼光香香雞（中份）', 580, 32, 38, 34, 110, 'lunch'),
    side('地瓜球', 280, 2, 40, 35),
  ],
}
