import type { BrandCatalog } from './helpers'
import { drink, meal, side } from './helpers'

export const BBQ_CATALOG: BrandCatalog = {
  'yakiniku-like': [
    meal('牛五花套餐（一人）', 720, 36, 12, 48, 380, 'dinner', { tags: ['yakiniku'] }),
    meal('豬五花套餐', 680, 32, 14, 44, 320, 'dinner'),
    meal('牛舌套餐', 520, 42, 8, 28, 450, 'dinner'),
    side('白飯（一碗）', 280, 6, 58, 30, { role: 'carb' }),
    side('味噌湯', 40, 3, 30, 25),
    side('韓式泡菜', 30, 1, 6, 20),
  ],
  kanpai: [
    meal('牛小排（150g）', 580, 42, 2, 42, 680, 'dinner'),
    meal('牛五花（150g）', 620, 32, 4, 48, 480, 'dinner'),
    meal('豬五花（150g）', 560, 28, 4, 44, 380, 'dinner'),
    side('蒜片牛小排（80g）', 320, 24, 2, 24, 280, { role: 'protein' }),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  laokanpai: [
    meal('和牛肋眼（200g）', 780, 48, 2, 58, 1280, 'dinner'),
    meal('牛小排（200g）', 720, 52, 2, 48, 980, 'dinner'),
    meal('牛舌（150g）', 480, 40, 4, 28, 680, 'dinner'),
    side('海膽手卷', 180, 8, 22, 6, 280),
    side('鮭魚手卷', 160, 10, 20, 4, 180),
  ],
  roucifang: [
    meal('牛五花吃到飽（90分）', 1200, 56, 18, 72, 598, 'dinner'),
    meal('豬五花吃到飽（90分）', 1100, 48, 16, 68, 498, 'dinner'),
    side('霜降牛五花（100g）', 420, 24, 2, 32, 0),
    side('牛舌（80g）', 280, 22, 2, 18, 0),
  ],
  'yakiniku-smile': [
    meal('牛五花套餐', 680, 34, 12, 44, 360, 'dinner'),
    meal('豬五花套餐', 640, 30, 14, 40, 320, 'dinner'),
    side('牛小排（100g）', 380, 28, 2, 26, 280),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  yuma: [
    meal('和牛肋眼（150g）', 680, 44, 2, 52, 880, 'dinner'),
    meal('牛五花（150g）', 620, 32, 4, 46, 480, 'dinner'),
    meal('豬五花（150g）', 580, 28, 4, 42, 380, 'dinner'),
    side('霜降牛五花（80g）', 360, 22, 2, 28, 320),
  ],
  cha6: [
    meal('牛小排套餐', 720, 48, 8, 48, 680, 'dinner'),
    meal('牛五花套餐', 680, 36, 10, 44, 520, 'dinner'),
    side('蒜香牛小排（100g）', 420, 32, 4, 28, 380),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
}

export const THAI_CATALOG: BrandCatalog = {
  wangcheng: [
    meal('綠咖哩雞套餐', 680, 28, 72, 32, 280, 'lunch'),
    meal('打拋豬肉片套餐', 720, 30, 75, 34, 260, 'lunch'),
    meal('月亮蝦餅', 320, 12, 28, 18, 120, 'lunch', { role: 'side' }),
    meal('泰式炒河粉', 620, 26, 78, 22, 240, 'lunch'),
    meal('椰汁雞湯', 280, 18, 12, 18, 180, 'dinner'),
    side('泰式酸辣湯', 120, 8, 10, 4, 80),
  ],
  daxin: [
    meal('酸辣湯麵', 480, 22, 62, 14, 160, 'lunch'),
    meal('打拋豬肉飯', 620, 28, 72, 22, 140, 'lunch'),
    meal('綠咖哩雞飯', 580, 26, 68, 24, 150, 'lunch'),
    meal('泰式炸雞腿飯', 680, 32, 68, 28, 160, 'lunch'),
    side('月亮蝦餅（2片）', 240, 10, 20, 14, 80),
  ],
  verythai: [
    meal('綠咖哩雞', 620, 26, 68, 28, 320, 'lunch'),
    meal('打拋豬肉', 580, 28, 62, 26, 280, 'lunch'),
    meal('泰式炒河粉', 600, 24, 76, 20, 260, 'lunch'),
    meal('酸辣海鮮湯', 320, 22, 18, 14, 220, 'dinner'),
    side('春捲（2條）', 180, 6, 22, 8, 80),
  ],
  xiangtaiduo: [
    meal('綠咖哩雞套餐', 660, 28, 70, 30, 300, 'lunch'),
    meal('打拋豬肉套餐', 700, 30, 74, 32, 280, 'lunch'),
    meal('月亮蝦餅', 300, 12, 26, 16, 120, 'lunch', { role: 'side' }),
    meal('泰式海鮮炒飯', 640, 28, 78, 22, 260, 'lunch'),
    side('酸辣湯', 100, 6, 10, 4, 60),
  ],
}

export const KOREAN_CATALOG: BrandCatalog = {
  'juan-tofu': [
    meal('韓式豆腐鍋（牛肉）', 420, 22, 28, 18, 220, 'lunch'),
    meal('韓式豆腐鍋（海鮮）', 380, 20, 24, 16, 220, 'lunch'),
    meal('石鍋拌飯（牛肉）', 640, 28, 82, 18, 260, 'lunch'),
    side('韓式泡菜', 30, 1, 6, 20),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  liangbanjia: [
    meal('韓式炸雞（原味·半份）', 480, 28, 28, 28, 280, 'dinner'),
    meal('韓式炸雞（甜辣·半份）', 520, 26, 38, 26, 280, 'dinner'),
    meal('部隊鍋（一人）', 580, 26, 48, 28, 280, 'dinner'),
    meal('石鍋拌飯（豬肉）', 620, 26, 80, 18, 240, 'lunch'),
    side('韓式泡菜', 30, 1, 6, 20),
  ],
  hankang: [
    meal('韓式烤肉定食', 680, 36, 58, 32, 380, 'dinner'),
    meal('石鍋拌飯', 620, 26, 80, 18, 260, 'lunch'),
    meal('韓式炸雞', 640, 30, 38, 32, 320, 'dinner'),
    side('韓式泡菜', 30, 1, 6, 20),
  ],
  beicun: [
    meal('嫩豆腐鍋', 380, 18, 22, 16, 200, 'lunch'),
    meal('石鍋拌飯', 600, 24, 78, 18, 240, 'lunch'),
    meal('韓式炸雞（原味）', 620, 28, 36, 30, 300, 'dinner'),
    side('韓式泡菜', 30, 1, 6, 20),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
  doufucun: [
    meal('豆腐鍋套餐', 400, 20, 26, 16, 220, 'lunch'),
    meal('石鍋拌飯（牛肉）', 640, 28, 82, 18, 260, 'lunch'),
    side('韓式泡菜', 30, 1, 6, 20),
    side('白飯', 280, 6, 58, 30, { role: 'carb' }),
  ],
}

export const AMERICAN_CATALOG: BrandCatalog = {
  'texas-roadhouse': [
    meal('肋眼牛排（8oz）', 680, 48, 2, 48, 680, 'dinner'),
    meal('菲力牛排（6oz）', 520, 42, 2, 32, 780, 'dinner'),
    meal('烤雞胸排', 420, 38, 4, 18, 380, 'lunch'),
    side('薯條', 380, 4, 48, 16, 120),
    side('凱薩沙拉', 280, 8, 12, 22, 180),
  ],
  tgi: [
    meal('肋眼牛排（10oz）', 820, 52, 4, 56, 880, 'dinner'),
    meal('牛肉起司漢堡', 680, 32, 48, 38, 380, 'lunch'),
    meal('烤雞沙拉', 380, 36, 16, 14, 320, 'lunch'),
    side('洋蔥圈', 320, 4, 38, 16, 120),
    meal('經典班尼迪克蛋', 520, 22, 32, 32, 280, 'breakfast'),
  ],
  chilis: [
    meal('肋眼牛排（8oz）', 720, 46, 4, 50, 720, 'dinner'),
    meal('牛肉起司漢堡套餐', 820, 36, 68, 42, 420, 'lunch'),
    meal('烤雞胸沙拉', 360, 34, 14, 12, 300, 'lunch'),
    side('薯條', 360, 4, 46, 16, 100),
    meal('美式鬆餅套餐', 620, 14, 82, 24, 240, 'breakfast'),
  ],
  lezi: [
    meal('經典班尼迪克蛋', 520, 22, 32, 32, 280, 'breakfast'),
    meal('美式鬆餅套餐', 620, 14, 82, 24, 240, 'breakfast'),
    meal('牛肉起司漢堡', 680, 32, 48, 36, 320, 'lunch'),
    meal('烤雞沙拉碗', 380, 36, 18, 14, 280, 'lunch'),
    side('薯條', 320, 4, 42, 14, 80),
  ],
  'second-floor': [
    meal('經典班尼迪克蛋', 540, 24, 34, 34, 320, 'breakfast'),
    meal('美式鬆餅套餐', 640, 14, 84, 26, 260, 'breakfast'),
    meal('牛肉起司漢堡', 720, 34, 52, 38, 360, 'lunch'),
    meal('肋眼牛排（8oz）', 700, 46, 4, 50, 720, 'dinner'),
    side('凱薩沙拉', 300, 8, 14, 24, 180),
  ],
}

export const HEALTHY_CATALOG: BrandCatalog = {
  '72c': [
    meal('舒肥雞胸餐盒', 460, 42, 38, 12, 150, 'lunch'),
    meal('舒肥牛腱餐盒', 520, 40, 42, 18, 165, 'lunch'),
    meal('鮭魚糙米餐盒', 450, 36, 35, 16, 175, 'lunch'),
    meal('雞胸沙拉碗', 380, 38, 18, 14, 160, 'lunch'),
    side('水煮蛋（2顆）', 140, 12, 2, 10, 30, { role: 'protein' }),
  ],
  leka: [
    meal('雞胸糙米餐盒', 440, 40, 36, 12, 145, 'lunch'),
    meal('牛腱餐盒', 500, 38, 40, 16, 160, 'lunch'),
    meal('鮭魚餐盒', 430, 34, 32, 14, 170, 'lunch'),
    meal('雞胸沙拉', 360, 36, 16, 12, 155, 'lunch'),
  ],
  'miss-energy': [
    meal('雞胸能量碗', 420, 40, 32, 12, 160, 'lunch'),
    meal('鮭魚能量碗', 440, 36, 30, 16, 175, 'lunch'),
    meal('牛腱能量碗', 480, 38, 36, 14, 170, 'lunch'),
    side('堅果沙拉', 280, 8, 18, 22, 90),
  ],
  jianren: [
    meal('舒肥雞胸餐', 450, 44, 36, 10, 155, 'lunch'),
    meal('舒肥牛腱餐', 510, 42, 40, 16, 168, 'lunch'),
    meal('鮭魚餐', 440, 36, 34, 14, 178, 'lunch'),
    meal('雞胸沙拉碗', 370, 38, 16, 12, 158, 'lunch'),
  ],
  xiangjiankang: [
    meal('雞胸餐盒', 430, 40, 36, 10, 140, 'lunch'),
    meal('牛腱餐盒', 490, 38, 40, 14, 155, 'lunch'),
    meal('鮭魚餐盒', 420, 34, 32, 12, 165, 'lunch'),
  ],
  yecanri: [
    meal('雞胸野餐盒', 400, 38, 34, 10, 150, 'lunch'),
    meal('鮭魚野餐盒', 420, 34, 30, 14, 165, 'lunch'),
    meal('沙拉碗', 320, 12, 22, 18, 130, 'lunch'),
  ],
  fitbox: [
    meal('雞胸FitBox', 440, 42, 36, 10, 155, 'lunch'),
    meal('牛腱FitBox', 500, 40, 40, 14, 168, 'lunch'),
    meal('鮭魚FitBox', 430, 36, 32, 12, 175, 'lunch'),
    meal('雞胸沙拉', 360, 36, 16, 10, 150, 'lunch'),
  ],
  'muscle-beach': [
    meal('雞胸肌肉餐', 460, 44, 38, 10, 160, 'lunch'),
    meal('牛腱肌肉餐', 520, 42, 42, 14, 172, 'lunch'),
    meal('鮭魚肌肉餐', 450, 38, 34, 14, 180, 'lunch'),
  ],
  yeshou: [
    meal('雞胸野瘦餐', 420, 40, 34, 10, 145, 'lunch'),
    meal('牛腱野瘦餐', 480, 38, 38, 14, 158, 'lunch'),
    meal('沙拉碗', 300, 14, 18, 14, 130, 'lunch'),
  ],
  chumi: [
    meal('雞胸初米餐', 430, 40, 36, 10, 148, 'lunch'),
    meal('鮭魚初米餐', 420, 34, 32, 12, 168, 'lunch'),
    meal('牛腱初米餐', 490, 38, 40, 14, 162, 'lunch'),
  ],
}

export const DESSERTS_CATALOG: BrandCatalog = {
  annick: [
    meal('生乳捲（切片）', 320, 6, 38, 16, 95, 'dinner', { role: 'side' }),
    meal('巧克力生乳捲', 380, 6, 42, 20, 110, 'dinner', { role: 'side' }),
    meal('草莓生乳捲', 340, 5, 40, 16, 110, 'dinner', { role: 'side' }),
    meal('提拉米蘇', 420, 6, 42, 24, 140, 'dinner', { role: 'side' }),
    side('巴斯克乳酪蛋糕', 380, 8, 32, 26, 120),
  ],
  fujiya: [
    meal('草莓蛋糕（切片）', 380, 5, 48, 18, 120, 'dinner', { role: 'side' }),
    meal('巧克力蛋糕（切片）', 400, 5, 46, 22, 120, 'dinner', { role: 'side' }),
    meal('奶油泡芙', 280, 4, 32, 16, 45, 'dinner', { role: 'side' }),
    meal('銅鑼燒', 220, 4, 38, 6, 35, 'dinner', { role: 'side' }),
  ],
  'cold-stone': [
    meal('經典香草（中杯）', 480, 8, 52, 28, 120, 'dinner', { role: 'side' }),
    meal('巧克力狂戀（中杯）', 520, 8, 56, 30, 130, 'dinner', { role: 'side' }),
    meal('草莓狂戀（中杯）', 500, 6, 54, 28, 130, 'dinner', { role: 'side' }),
    meal('冰淇淋（單球）', 220, 4, 28, 10, 80, 'dinner', { role: 'side' }),
  ],
  haagen: [
    meal('香草冰淇淋（單球）', 250, 4, 28, 14, 90, 'dinner', { role: 'side' }),
    meal('巧克力冰淇淋（單球）', 260, 4, 30, 14, 90, 'dinner', { role: 'side' }),
    meal('草莓冰淇淋（單球）', 240, 3, 28, 12, 90, 'dinner', { role: 'side' }),
    meal('焦糖海鹽（單球）', 270, 4, 30, 14, 95, 'dinner', { role: 'side' }),
  ],
}

/** 手搖飲品牌補齊 */
export const BUBBLETEA_EXTRA_CATALOG: BrandCatalog = {
  dezheng: [
    drink('熟成紅茶（中杯）', 5, 1, 30, { tags: ['bubble_tea'] }),
    drink('珍珠奶茶（大杯）', 400, 64, 55, { tags: ['bubble_tea'] }),
    drink('珍珠紅茶拿鐵（大杯）', 300, 42, 62, { tags: ['bubble_tea'] }),
    drink('珍珠烏龍奶（大杯）', 380, 58, 58, { tags: ['bubble_tea'] }),
    drink('檸檬紅茶（大杯）', 180, 45, 50, { tags: ['bubble_tea'] }),
  ],
  guiji: [
    drink('翡翠檸檬（大杯）', 170, 42, 55, { tags: ['bubble_tea'] }),
    drink('珍珠奶茶（大杯）', 405, 65, 52, { tags: ['bubble_tea'] }),
    drink('芋頭牛奶（大杯）', 360, 52, 60, { tags: ['bubble_tea'] }),
    drink('四季春茶（中杯）', 5, 1, 28, { tags: ['bubble_tea'] }),
    drink('冬瓜檸檬（大杯）', 160, 40, 45, { tags: ['bubble_tea'] }),
  ],
  wanpo: [
    drink('紅玉鮮奶茶（大杯）', 350, 48, 58, { tags: ['bubble_tea'] }),
    drink('珍珠奶茶（大杯）', 410, 66, 55, { tags: ['bubble_tea'] }),
    drink('烏龍鮮奶茶（大杯）', 340, 46, 58, { tags: ['bubble_tea'] }),
    drink('四季春茶（中杯）', 5, 1, 30, { tags: ['bubble_tea'] }),
    drink('檸檬翡翠（大杯）', 175, 44, 52, { tags: ['bubble_tea'] }),
  ],
  zhenzhu: [
    drink('黑糖珍珠鮮奶（大杯）', 420, 52, 68, { tags: ['bubble_tea'] }),
    drink('珍珠奶茶（大杯）', 400, 64, 55, { tags: ['bubble_tea'] }),
    drink('黑糖珍珠紅茶（大杯）', 380, 58, 55, { tags: ['bubble_tea'] }),
    drink('四季春茶（中杯）', 5, 1, 28, { tags: ['bubble_tea'] }),
  ],
  comebuy: [
    drink('玩火奶茶（大杯）', 420, 66, 60, { tags: ['bubble_tea'] }),
    drink('珍珠奶茶（大杯）', 400, 64, 55, { tags: ['bubble_tea'] }),
    drink('鐵觀音奶茶（大杯）', 390, 62, 52, { tags: ['bubble_tea'] }),
    drink('四季春茶（中杯）', 5, 1, 28, { tags: ['bubble_tea'] }),
  ],
  xianhe: [
    drink('珍珠奶茶（大杯）', 395, 63, 50, { tags: ['bubble_tea'] }),
    drink('紅茶拿鐵（大杯）', 285, 38, 60, { tags: ['bubble_tea'] }),
    drink('翡翠檸檬（大杯）', 170, 42, 52, { tags: ['bubble_tea'] }),
    drink('四季春茶（中杯）', 5, 1, 28, { tags: ['bubble_tea'] }),
  ],
  teapost: [
    drink('珍珠奶茶（大杯）', 400, 64, 50, { tags: ['bubble_tea'] }),
    drink('紅茶拿鐵（大杯）', 280, 38, 58, { tags: ['bubble_tea'] }),
    drink('綠茶拿鐵（大杯）', 275, 36, 58, { tags: ['bubble_tea'] }),
    drink('四季春茶（中杯）', 5, 1, 28, { tags: ['bubble_tea'] }),
  ],
  laolai: [
    drink('珍珠奶茶（大杯）', 410, 66, 55, { tags: ['bubble_tea'] }),
    drink('冬瓜檸檬（大杯）', 160, 40, 45, { tags: ['bubble_tea'] }),
    drink('紅茶拿鐵（大杯）', 290, 40, 62, { tags: ['bubble_tea'] }),
    drink('四季春茶（中杯）', 5, 1, 28, { tags: ['bubble_tea'] }),
  ],
  'yayoi-tea': [
    drink('八曜和茶（中杯）', 8, 2, 40, { tags: ['bubble_tea'] }),
    drink('珍珠奶茶（大杯）', 390, 62, 55, { tags: ['bubble_tea'] }),
    drink('紅茶拿鐵（大杯）', 285, 38, 62, { tags: ['bubble_tea'] }),
    drink('檸檬和茶（大杯）', 170, 42, 52, { tags: ['bubble_tea'] }),
  ],
  hecha: [
    drink('鶴茶樓招牌（大杯）', 380, 58, 55, { tags: ['bubble_tea'] }),
    drink('珍珠奶茶（大杯）', 400, 64, 55, { tags: ['bubble_tea'] }),
    drink('翡翠檸檬（大杯）', 175, 44, 52, { tags: ['bubble_tea'] }),
    drink('四季春茶（中杯）', 5, 1, 28, { tags: ['bubble_tea'] }),
  ],
  shuixiang: [
    drink('水巷紅茶（中杯）', 5, 1, 30, { tags: ['bubble_tea'] }),
    drink('珍珠奶茶（大杯）', 405, 65, 52, { tags: ['bubble_tea'] }),
    drink('紅茶拿鐵（大杯）', 290, 40, 60, { tags: ['bubble_tea'] }),
    drink('檸檬紅茶（大杯）', 180, 45, 50, { tags: ['bubble_tea'] }),
  ],
  'sunrise-tea': [
    drink('日出紅茶（中杯）', 5, 1, 28, { tags: ['bubble_tea'] }),
    drink('珍珠奶茶（大杯）', 400, 64, 50, { tags: ['bubble_tea'] }),
    drink('紅茶拿鐵（大杯）', 280, 38, 58, { tags: ['bubble_tea'] }),
    drink('翡翠檸檬（大杯）', 170, 42, 50, { tags: ['bubble_tea'] }),
  ],
}
