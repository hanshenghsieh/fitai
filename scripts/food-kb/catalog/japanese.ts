import type { BrandCatalog } from './helpers'
import { drink, meal, side } from './helpers'

export const JAPANESE_CATALOG: BrandCatalog = {
  'sushi-express': [
    meal('鮭魚握壽司（2貫）', 140, 8, 22, 2, 60, 'lunch', { tags: ['sushi'] }),
    meal('鮪魚握壽司（2貫）', 120, 10, 18, 1, 60, 'lunch', { tags: ['sushi'] }),
    meal('甜蝦握壽司（2貫）', 110, 7, 18, 1, 60, 'lunch', { tags: ['sushi'] }),
    meal('鰻魚握壽司（2貫）', 180, 8, 28, 4, 80, 'lunch', { tags: ['sushi'] }),
    meal('鮭魚細卷（8切）', 220, 10, 36, 3, 60, 'lunch', { tags: ['sushi'] }),
    meal('加州卷（8切）', 250, 8, 38, 6, 60, 'lunch', { tags: ['sushi'] }),
    meal('綜合壽司拼盤（10貫）', 480, 28, 68, 8, 220, 'lunch', { tags: ['sushi'] }),
    meal('海鮮丼', 520, 32, 72, 10, 280, 'lunch', { tags: ['donburi'] }),
    side('味噌湯', 40, 3, 30, { tags: ['soup'] }),
    meal('花壽司', 380, 14, 62, 6, 120, 'dinner', { tags: ['sushi'] }),
  ],
  sushiro: [
    meal('鮭魚握壽司（2貫）', 130, 8, 20, 2, 60, 'lunch'),
    meal('炙燒鮭魚握壽司（2貫）', 150, 9, 22, 3, 80, 'lunch'),
    meal('鮪魚中腹（2貫）', 160, 10, 18, 4, 80, 'lunch'),
    meal('干貝握壽司（2貫）', 120, 8, 16, 1, 60, 'lunch'),
    meal('茶碗蒸', 80, 6, 4, 4, 60, 'lunch', { role: 'side' }),
    meal('鮭魚刺身（5片）', 180, 24, 0, 8, 150, 'dinner'),
    meal('壽司定食（10貫+味噌）', 520, 30, 70, 10, 320, 'lunch'),
  ],
  kura: [
    meal('鮭魚握壽司（2貫）', 125, 8, 20, 2, 60, 'lunch'),
    meal('鮪魚握壽司（2貫）', 115, 10, 16, 1, 60, 'lunch'),
    meal('炙燒起司鮭魚（2貫）', 170, 9, 24, 5, 80, 'lunch'),
    meal('炸蝦壽司（2貫）', 200, 8, 28, 6, 60, 'lunch'),
    meal('烏龍麵', 380, 12, 58, 10, 80, 'lunch', { tags: ['noodle'] }),
  ],
  yoshinoya: [
    meal('牛丼（中）', 733, 30, 82, 18, 145, 'lunch', { aliases: ['牛丼'] }),
    meal('牛丼（小）', 480, 24, 58, 14, 120, 'dinner'),
    meal('親子丼（中）', 580, 28, 72, 16, 150, 'lunch'),
    meal('豚丼（中）', 620, 26, 78, 20, 140, 'lunch'),
    side('溫泉蛋', 80, 6, 1, 15),
    side('味噌湯', 35, 2, 4, 25),
  ],
  sukiya: [
    meal('牛丼（中）', 630, 28, 80, 18, 140, 'lunch'),
    meal('牛丼（並）', 520, 24, 66, 16, 120, 'lunch'),
    meal('起司牛丼（中）', 680, 30, 78, 24, 160, 'lunch'),
    meal('豚丼（中）', 600, 26, 76, 20, 135, 'lunch'),
    side('溫泉蛋', 80, 6, 15),
  ],
  'coco-ichibanya': [
    meal('豬排咖哩飯', 720, 24, 82, 28, 180, 'lunch'),
    meal('雞排咖哩飯', 680, 28, 78, 24, 170, 'lunch'),
    meal('牛肉咖哩飯', 700, 30, 80, 26, 190, 'lunch'),
    meal('蔬菜咖哩飯', 520, 12, 78, 16, 150, 'lunch'),
    meal('漢堡排咖哩飯', 750, 26, 84, 30, 185, 'lunch'),
  ],
  katsuya: [
    meal('腰內豬排定食', 780, 32, 78, 32, 280, 'lunch'),
    meal('里肌豬排定食', 820, 34, 80, 34, 300, 'lunch'),
    meal('海老豬排定食', 800, 30, 76, 36, 290, 'lunch'),
    meal('起司豬排定食', 850, 36, 78, 38, 310, 'lunch'),
  ],
  ootoya: [
    meal('雞肉南蠻定食', 720, 36, 72, 28, 280, 'lunch'),
    meal('薑燒肉定食', 680, 32, 70, 26, 260, 'lunch'),
    meal('鯖魚定食', 620, 34, 58, 28, 240, 'lunch'),
    meal('野菜天婦羅定食', 580, 14, 78, 22, 220, 'lunch'),
  ],
}
