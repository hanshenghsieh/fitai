import type { BrandCatalog } from './helpers'
import { drink, meal, side } from './helpers'

export const CONVENIENCE_CATALOG: BrandCatalog = {
  '7-11': [
    meal('御飯糰（鮭魚）', 210, 6, 38, 4, 35, 'breakfast', { tags: ['rice'] }),
    meal('茶葉蛋', 80, 7, 1, 5, 15, 'breakfast', { role: 'protein' }),
    meal('厚切豬排飯', 580, 28, 68, 20, 89, 'lunch', { tags: ['bento'] }),
    meal('義大利麵餐盒', 520, 18, 62, 18, 79, 'lunch', { tags: ['pasta'] }),
    meal('關東煮綜合套餐', 280, 14, 28, 8, 99, 'dinner', { tags: ['oden'] }),
    side('鮮蝦沙拉', 120, 8, 8, 6, 59),
    side('無糖綠茶（600ml）', 0, 0, 0, 25, { role: 'drink', meal_category: 'lunch' }),
    meal('雞肉沙拉三明治', 320, 22, 32, 12, 69, 'lunch'),
  ],
  familymart: [
    meal('御飯糰（鮪魚）', 200, 7, 36, 4, 35, 'breakfast'),
    meal('茶葉蛋', 80, 7, 1, 5, 15, 'breakfast', { role: 'protein' }),
    meal('咖哩豬排飯', 560, 24, 66, 20, 85, 'lunch'),
    meal('韓式拌飯餐盒', 480, 18, 62, 16, 79, 'lunch'),
    meal('關東煮套餐', 260, 12, 26, 8, 95, 'dinner'),
    side('鮮蝦沙拉', 120, 8, 8, 6, 59),
    meal('雞肉三明治', 300, 20, 30, 12, 65, 'lunch'),
  ],
  hilife: [
    meal('御飯糰（肉鬆）', 190, 5, 38, 4, 30, 'breakfast'),
    meal('茶葉蛋', 80, 7, 1, 5, 15, 'breakfast', { role: 'protein' }),
    meal('雞腿飯餐盒', 540, 30, 62, 18, 79, 'lunch'),
    meal('義大利麵餐盒', 500, 16, 60, 18, 75, 'lunch'),
    meal('關東煮套餐', 250, 12, 24, 8, 89, 'dinner'),
    side('沙拉杯', 100, 4, 10, 5, 45),
  ],
  okmart: [
    meal('御飯糰（鮭魚）', 210, 6, 38, 4, 35, 'breakfast'),
    meal('茶葉蛋', 80, 7, 1, 5, 15, 'breakfast', { role: 'protein' }),
    meal('排骨飯餐盒', 560, 26, 66, 20, 82, 'lunch'),
    meal('炒飯餐盒', 480, 14, 62, 16, 72, 'lunch'),
    meal('關東煮套餐', 260, 12, 26, 8, 92, 'dinner'),
    side('鮮蝦沙拉', 120, 8, 8, 6, 55),
  ],
}

export const BREAKFAST_GAP_CATALOG: BrandCatalog = {
  'mcdonald-breakfast': [
    meal('原味蛋餅', 280, 10, 32, 12, 35, 'breakfast'),
    meal('火腿蛋餅', 340, 16, 32, 16, 45, 'breakfast'),
    meal('燒肉總匯蛋餅', 480, 22, 38, 24, 65, 'breakfast'),
    meal('豬肉滿福堡加蛋', 450, 20, 36, 24, 55, 'breakfast'),
    meal('鐵板麵套餐', 520, 18, 58, 22, 75, 'breakfast'),
    side('薯餅', 180, 2, 22, 10, 25),
  ],
  qburger: [
    meal('招牌蛋餅', 300, 12, 34, 14, 40, 'breakfast'),
    meal('火腿蛋餅', 350, 16, 34, 16, 50, 'breakfast'),
    meal('雞肉蛋餅', 380, 20, 34, 18, 55, 'breakfast'),
    meal('牛肉漢堡加蛋', 480, 24, 36, 26, 65, 'breakfast'),
    meal('鐵板麵', 480, 16, 56, 20, 70, 'breakfast'),
  ],
  'morning-kitchen': [
    meal('原味蛋餅', 270, 10, 30, 12, 35, 'breakfast'),
    meal('玉米蛋餅', 320, 12, 36, 14, 40, 'breakfast'),
    meal('燒肉蛋餅', 420, 20, 36, 22, 55, 'breakfast'),
    meal('豬肉堡加蛋', 440, 20, 34, 24, 55, 'breakfast'),
    meal('鐵板麵', 500, 16, 56, 20, 68, 'breakfast'),
  ],
  xiashangbao: [
    meal('招牌蛋餅', 290, 10, 32, 12, 38, 'breakfast'),
    meal('火腿蛋餅', 340, 16, 32, 16, 48, 'breakfast'),
    meal('燒肉蛋餅', 450, 20, 36, 22, 58, 'breakfast'),
    meal('鐵板麵套餐', 510, 18, 56, 20, 72, 'breakfast'),
    meal('豬肉堡', 420, 18, 34, 22, 52, 'breakfast'),
  ],
  'morning-hill': [
    meal('原味蛋餅', 280, 10, 32, 12, 36, 'breakfast'),
    meal('起司蛋餅', 340, 14, 34, 16, 45, 'breakfast'),
    meal('燒肉蛋餅', 460, 20, 36, 22, 58, 'breakfast'),
    meal('鐵板麵', 490, 16, 54, 20, 68, 'breakfast'),
    meal('總匯三明治', 420, 18, 38, 20, 60, 'breakfast'),
  ],
  'julin-meirumei': [
    meal('原味蛋餅', 275, 10, 30, 12, 32, 'breakfast'),
    meal('火腿蛋餅', 330, 16, 30, 16, 42, 'breakfast'),
    meal('燒肉蛋餅', 440, 20, 34, 22, 52, 'breakfast'),
    meal('鐵板麵', 480, 16, 54, 20, 65, 'breakfast'),
    meal('豬肉堡加蛋', 430, 20, 34, 24, 52, 'breakfast'),
  ],
}

export const COFFEE_GAP_CATALOG: BrandCatalog = {
  'mr-brown': [
    drink('美式咖啡（中杯）', 10, 1, 75, { tags: ['coffee'] }),
    drink('拿鐵（中杯）', 180, 8, 14, 95, { tags: ['coffee'] }),
    drink('卡布奇諾（中杯）', 160, 7, 12, 95, { tags: ['coffee'] }),
    meal('雞肉三明治', 320, 20, 32, 12, 85, 'breakfast'),
    meal('起司貝果', 280, 10, 38, 8, 65, 'breakfast', { role: 'side' }),
  ],
  'cheng-zhen': [
    drink('美式咖啡（中杯）', 10, 1, 80, { tags: ['coffee'] }),
    drink('拿鐵（中杯）', 175, 8, 14, 100, { tags: ['coffee'] }),
    drink('焦糖瑪奇朵（中杯）', 250, 8, 32, 120, { tags: ['coffee'] }),
    meal('雞肉沙拉三明治', 340, 22, 32, 14, 95, 'breakfast'),
    meal('藍莓瑪芬', 380, 6, 52, 16, 65, 'breakfast', { role: 'side' }),
  ],
  'black-water': [
    drink('美式咖啡（中杯）', 8, 1, 70, { tags: ['coffee'] }),
    drink('拿鐵（中杯）', 170, 8, 12, 90, { tags: ['coffee'] }),
    drink('手沖單品（中杯）', 5, 1, 85, { tags: ['coffee'] }),
    meal('火腿起司三明治', 360, 18, 34, 16, 90, 'breakfast'),
    meal('可頌', 280, 6, 32, 14, 55, 'breakfast', { role: 'side' }),
  ],
  dante: [
    drink('美式咖啡（中杯）', 10, 1, 75, { tags: ['coffee'] }),
    drink('拿鐵（中杯）', 180, 8, 14, 95, { tags: ['coffee'] }),
    drink('摩卡（中杯）', 220, 8, 28, 110, { tags: ['coffee'] }),
    meal('雞肉三明治', 330, 20, 32, 12, 88, 'breakfast'),
    meal('提拉米蘇', 380, 6, 40, 20, 95, 'lunch', { role: 'side' }),
  ],
  donutes: [
    drink('美式咖啡（中杯）', 10, 1, 70, { tags: ['coffee'] }),
    drink('拿鐵（中杯）', 175, 8, 14, 90, { tags: ['coffee'] }),
    meal('波堤（6入）', 320, 4, 48, 14, 60, 'breakfast', { role: 'side' }),
    meal('草莓蛋糕（切片）', 380, 5, 48, 18, 95, 'lunch', { role: 'side' }),
    meal('雞肉三明治', 310, 18, 32, 12, 80, 'breakfast'),
  ],
  cafein: [
    drink('美式咖啡（中杯）', 8, 1, 65, { tags: ['coffee'] }),
    drink('拿鐵（中杯）', 165, 8, 12, 85, { tags: ['coffee'] }),
    drink('燕麥拿鐵（中杯）', 190, 8, 18, 95, { tags: ['coffee'] }),
    meal('雞肉沙拉三明治', 330, 22, 30, 12, 90, 'breakfast'),
    meal('藍莓瑪芬', 370, 6, 50, 16, 60, 'breakfast', { role: 'side' }),
  ],
}

export const FASTFOOD_GAP_CATALOG: BrandCatalog = {
  napoli: [
    meal('瑪格麗特披薩（8吋）', 680, 24, 82, 24, 280, 'lunch'),
    meal('夏威夷披薩（8吋）', 720, 28, 84, 26, 300, 'lunch'),
    meal('雞肉披薩（8吋）', 640, 32, 76, 22, 290, 'lunch'),
    side('蒜香麵包（2片）', 220, 6, 32, 8, 60),
    side('凱薩沙拉', 180, 6, 10, 14, 80),
  ],
  'texas-chicken': [
    meal('咔啦雞腿堡', 480, 26, 40, 24, 99, 'lunch'),
    meal('原味炸雞（2塊）', 380, 24, 18, 22, 89, 'lunch'),
    meal('雞腿飯套餐', 620, 34, 62, 24, 149, 'lunch'),
    side('薯條（中）', 320, 4, 42, 14, 45),
    side('玉米麵包', 180, 4, 28, 6, 35),
  ],
}

export const JAPANESE_GAP_CATALOG: BrandCatalog = {
  'magic-touch': [
    meal('鮭魚握壽司（2貫）', 130, 8, 20, 2, 60, 'lunch'),
    meal('鮪魚握壽司（2貫）', 120, 10, 18, 1, 60, 'lunch'),
    meal('綜合壽司拼盤（8貫）', 380, 22, 54, 6, 180, 'lunch'),
    meal('海鮮丼', 500, 30, 68, 10, 260, 'lunch'),
    side('味噌湯', 40, 3, 30, 25),
  ],
  hamasushi: [
    meal('鮭魚握壽司（2貫）', 125, 8, 20, 2, 60, 'lunch'),
    meal('炙燒鮭魚（2貫）', 150, 9, 22, 3, 80, 'lunch'),
    meal('干貝握壽司（2貫）', 115, 8, 16, 1, 60, 'lunch'),
    meal('壽司定食（10貫）', 500, 28, 68, 8, 300, 'lunch'),
    side('茶碗蒸', 80, 6, 4, 4, 60),
  ],
  matsuya: [
    meal('牛丼（中）', 640, 28, 80, 18, 140, 'lunch'),
    meal('牛丼（小）', 470, 22, 56, 14, 115, 'dinner'),
    meal('咖哩牛丼', 680, 26, 82, 22, 150, 'lunch'),
    side('味噌湯', 35, 2, 4, 25),
    side('溫泉蛋', 80, 6, 1, 15),
  ],
  kyoani: [
    meal('腰內豬排定食', 720, 32, 72, 28, 280, 'lunch'),
    meal('里肌豬排定食', 780, 34, 74, 32, 300, 'lunch'),
    meal('炸蝦定食', 680, 24, 68, 26, 260, 'lunch'),
    side('味噌湯', 40, 3, 30, 25),
    side('高麗菜絲', 30, 1, 6, 0),
  ],
  yayoi: [
    meal('牛丼定食', 680, 30, 78, 20, 220, 'lunch'),
    meal('親子丼定食', 620, 28, 72, 18, 210, 'lunch'),
    meal('炸蝦定食', 700, 26, 70, 24, 240, 'lunch'),
    side('味噌湯', 40, 3, 30, 25),
    side('溫泉蛋', 80, 6, 1, 15),
  ],
}

export const BENTO_GAP_CATALOG: BrandCatalog = {
  zhengzhong: [
    meal('排骨飯', 600, 26, 70, 22, 95, 'lunch'),
    meal('雞腿飯', 560, 30, 66, 18, 90, 'lunch'),
    meal('滷肉飯', 500, 14, 70, 16, 40, 'lunch'),
    meal('排骨乾麵套餐', 660, 28, 76, 22, 115, 'lunch'),
    side('滷蛋', 80, 6, 2, 5, 10),
  ],
  chishang: [
    meal('池上排骨飯', 620, 28, 72, 22, 100, 'lunch'),
    meal('池上雞腿飯', 580, 32, 68, 18, 95, 'lunch'),
    meal('滷肉飯', 510, 16, 72, 16, 45, 'lunch'),
    meal('鯖魚飯', 520, 28, 58, 18, 90, 'lunch'),
    side('滷蛋', 80, 6, 2, 5, 10),
  ],
  dongchi: [
    meal('飯包（排骨）', 580, 26, 68, 20, 85, 'lunch'),
    meal('飯包（雞腿）', 540, 30, 64, 18, 80, 'lunch'),
    meal('飯包（滷肉）', 480, 14, 66, 16, 50, 'lunch'),
    meal('飯包（鯖魚）', 500, 26, 56, 16, 75, 'lunch'),
    side('滷蛋', 80, 6, 2, 5, 10),
  ],
  fukusho: [
    meal('腰內豬排定食', 720, 32, 70, 28, 260, 'lunch'),
    meal('里肌豬排定食', 780, 34, 72, 32, 280, 'lunch'),
    meal('炸蝦定食', 680, 24, 66, 26, 240, 'lunch'),
    side('味噌湯', 40, 3, 30, 25),
    side('高麗菜絲', 30, 1, 6, 0),
  ],
}

export const HOTPOT_GAP_CATALOG: BrandCatalog = {
  zhujian: [
    meal('築間招牌鍋', 580, 32, 28, 32, 328, 'dinner'),
    meal('昆布鍋套餐', 420, 30, 22, 16, 298, 'dinner'),
    meal('和牛套餐', 680, 38, 18, 42, 580, 'dinner'),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  'shabu-yo': [
    meal('涮乃葉昆布鍋', 440, 30, 22, 18, 298, 'dinner'),
    meal('麻辣鍋', 520, 28, 26, 28, 328, 'dinner'),
    meal('和牛套餐', 660, 36, 18, 40, 548, 'dinner'),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  juhokkaido: [
    meal('北海道昆布鍋', 480, 32, 24, 20, 348, 'dinner'),
    meal('海鮮鍋', 520, 34, 22, 22, 368, 'dinner'),
    meal('和牛套餐', 700, 38, 18, 44, 598, 'dinner'),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  roduoduo: [
    meal('肉多多招牌鍋', 620, 36, 20, 36, 398, 'dinner'),
    meal('麻辣鍋', 580, 30, 24, 32, 368, 'dinner'),
    meal('和牛套餐', 720, 40, 18, 46, 628, 'dinner'),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  qiandu: [
    meal('錢都涮涮鍋', 480, 30, 22, 22, 298, 'dinner'),
    meal('麻辣鍋', 540, 28, 26, 30, 328, 'dinner'),
    meal('和牛套餐', 680, 36, 18, 42, 568, 'dinner'),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  xiaomengniu: [
    meal('小蒙牛麻辣鍋', 560, 28, 24, 32, 348, 'dinner'),
    meal('昆布鍋', 440, 30, 22, 18, 298, 'dinner'),
    meal('和牛套餐', 700, 38, 18, 44, 598, 'dinner'),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  qianye: [
    meal('千葉火鍋套餐', 520, 30, 24, 28, 328, 'dinner'),
    meal('麻辣鍋', 560, 28, 26, 30, 348, 'dinner'),
    meal('和牛套餐', 680, 36, 18, 42, 568, 'dinner'),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  laoxianjue: [
    meal('老先覺麻辣鍋', 540, 28, 24, 30, 318, 'dinner'),
    meal('昆布鍋', 420, 28, 20, 16, 278, 'dinner'),
    meal('和牛套餐', 660, 34, 18, 40, 528, 'dinner'),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  guotaiming: [
    meal('鍋台銘石頭鍋', 500, 30, 24, 26, 308, 'dinner'),
    meal('麻辣鍋', 540, 28, 26, 30, 328, 'dinner'),
    meal('和牛套餐', 660, 34, 18, 40, 528, 'dinner'),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  shierduan: [
    meal('十二段石頭鍋', 520, 32, 24, 28, 328, 'dinner'),
    meal('昆布鍋', 440, 30, 22, 18, 298, 'dinner'),
    meal('和牛套餐', 680, 36, 18, 42, 568, 'dinner'),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
}

export const NOODLES_GAP_CATALOG: BrandCatalog = {
  'duan-chunzhen': [
    meal('紅燒牛肉麵', 620, 32, 72, 18, 180, 'lunch'),
    meal('清燉牛肉麵', 580, 34, 68, 14, 190, 'lunch'),
    meal('半筋半肉牛肉麵', 640, 36, 72, 18, 200, 'lunch'),
    side('滷味拼盤（小）', 180, 14, 80),
    side('滷蛋', 80, 6, 2, 10),
  ],
  laodong: [
    meal('紅燒牛肉麵', 630, 34, 72, 18, 170, 'lunch'),
    meal('清燉牛肉麵', 590, 35, 68, 14, 180, 'lunch'),
    meal('半筋半肉牛肉麵', 650, 38, 72, 18, 190, 'lunch'),
    side('滷味拼盤（小）', 180, 14, 80),
  ],
  huangjia: [
    meal('紅燒牛肉麵', 640, 34, 74, 18, 200, 'lunch'),
    meal('清燉牛肉麵', 600, 36, 70, 14, 210, 'lunch'),
    meal('半筋半肉牛肉麵', 660, 38, 74, 18, 220, 'lunch'),
    side('滷味拼盤（小）', 180, 14, 80),
  ],
  tianxia: [
    meal('紅燒牛肉麵', 650, 36, 74, 18, 220, 'lunch'),
    meal('清燉牛肉麵', 610, 38, 70, 14, 230, 'lunch'),
    meal('半筋半肉牛肉麵', 670, 40, 74, 18, 240, 'lunch'),
    side('滷味拼盤（小）', 180, 14, 80),
  ],
  tonchin: [
    meal('豚骨拉麵', 580, 24, 72, 20, 220, 'lunch'),
    meal('味噌拉麵', 540, 22, 68, 18, 210, 'lunch'),
    meal('醬油拉麵', 520, 20, 66, 16, 200, 'lunch'),
    side('煎餃（5顆）', 220, 8, 28, 8, 80),
    side('叉燒（加點）', 120, 12, 2, 6, 60, { role: 'protein' }),
  ],
  musashi: [
    meal('白湯拉麵', 560, 22, 70, 18, 210, 'lunch'),
    meal('味噌拉麵', 540, 22, 68, 18, 210, 'lunch'),
    meal('醬油拉麵', 520, 20, 66, 16, 200, 'lunch'),
    side('煎餃（5顆）', 220, 8, 28, 8, 80),
  ],
  raumenya: [
    meal('豚骨拉麵', 570, 23, 71, 19, 200, 'lunch'),
    meal('味噌拉麵', 530, 21, 67, 17, 190, 'lunch'),
    meal('醬油拉麵', 510, 19, 65, 15, 180, 'lunch'),
    side('煎餃（5顆）', 220, 8, 28, 8, 75),
  ],
  shantouhuo: [
    meal('越南河粉（牛肉）', 480, 26, 62, 12, 160, 'lunch'),
    meal('越南河粉（雞肉）', 420, 24, 58, 8, 140, 'lunch'),
    meal('越式法棍三明治', 520, 28, 48, 22, 120, 'lunch'),
    side('春捲（2條）', 180, 6, 22, 8, 60),
  ],
  wuhuama: [
    meal('紅燒牛肉麵', 600, 30, 70, 18, 150, 'lunch'),
    meal('清燉牛肉麵', 560, 32, 66, 14, 160, 'lunch'),
    meal('擔擔麵', 520, 18, 62, 20, 120, 'lunch'),
    side('滷味拼盤（小）', 180, 14, 80),
  ],
  qiaozhiwei: [
    meal('紅燒牛肉麵', 610, 31, 71, 18, 155, 'lunch'),
    meal('清燉牛肉麵', 570, 33, 67, 14, 165, 'lunch'),
    meal('半筋半肉牛肉麵', 630, 35, 71, 18, 175, 'lunch'),
    side('滷蛋', 80, 6, 2, 10),
  ],
}

export const SUPERMARKET_GAP_CATALOG: BrandCatalog = {
  amart: [
    meal('雞胸肉（100g）', 110, 23, 0, 1, 45, 'lunch', { role: 'protein' }),
    meal('糙米飯（一盒）', 280, 6, 58, 2, 35, 'lunch', { role: 'carb' }),
    meal('綜合沙拉盒', 120, 4, 12, 6, 59, 'lunch'),
    meal('鮭魚切片（100g）', 180, 20, 0, 10, 89, 'dinner', { role: 'protein' }),
    meal('舒肥雞胸即食包', 130, 26, 2, 2, 79, 'lunch', { role: 'protein' }),
  ],
  rtmart: [
    meal('雞胸肉（100g）', 110, 23, 0, 1, 42, 'lunch', { role: 'protein' }),
    meal('糙米飯（一盒）', 280, 6, 58, 2, 32, 'lunch', { role: 'carb' }),
    meal('綜合沙拉盒', 120, 4, 12, 6, 55, 'lunch'),
    meal('鮭魚切片（100g）', 180, 20, 0, 10, 85, 'dinner', { role: 'protein' }),
    meal('即食雞胸肉', 125, 25, 2, 2, 75, 'lunch', { role: 'protein' }),
  ],
  costco: [
    meal('雞胸肉（100g）', 110, 23, 0, 1, 38, 'lunch', { role: 'protein' }),
    meal('烤雞（1/4隻）', 380, 42, 4, 20, 0, 'dinner'),
    meal('鮭魚切片（100g）', 180, 20, 0, 10, 75, 'dinner', { role: 'protein' }),
    meal('沙拉盒（大）', 180, 6, 16, 8, 89, 'lunch'),
    meal('牛肉捲（100g）', 220, 24, 2, 12, 0, 'lunch', { role: 'protein' }),
  ],
  miacb: [
    meal('雞胸肉（100g）', 110, 23, 0, 1, 55, 'lunch', { role: 'protein' }),
    meal('綜合沙拉盒', 130, 5, 12, 6, 69, 'lunch'),
    meal('鮭魚切片（100g）', 180, 20, 0, 10, 99, 'dinner', { role: 'protein' }),
    meal('糙米飯（一盒）', 280, 6, 58, 2, 42, 'lunch', { role: 'carb' }),
    meal('舒肥雞胸即食包', 130, 26, 2, 2, 89, 'lunch', { role: 'protein' }),
  ],
  jasons: [
    meal('雞胸肉（100g）', 110, 23, 0, 1, 58, 'lunch', { role: 'protein' }),
    meal('綜合沙拉盒', 130, 5, 12, 6, 72, 'lunch'),
    meal('鮭魚切片（100g）', 180, 20, 0, 10, 105, 'dinner', { role: 'protein' }),
    meal('糙米飯（一盒）', 280, 6, 58, 2, 45, 'lunch', { role: 'carb' }),
    meal('即食雞胸肉', 125, 25, 2, 2, 85, 'lunch', { role: 'protein' }),
  ],
}
