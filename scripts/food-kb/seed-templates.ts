/** Menu templates per KB category — estimated nutrition, cross-validated later */

export interface SeedTemplate {
  name: string
  meal_category: 'breakfast' | 'lunch' | 'dinner'
  role?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  sugar_g?: number
  fiber_g?: number
  price: number
  aliases?: string[]
  tags?: string[]
}

export const CATEGORY_TEMPLATES: Record<string, SeedTemplate[]> = {
  convenience: [
    { name: '御飯糰（鮭魚）', meal_category: 'breakfast', calories: 210, protein_g: 6, carbs_g: 38, fat_g: 4, price: 35, tags: ['rice'] },
    { name: '茶葉蛋', meal_category: 'breakfast', calories: 80, protein_g: 7, carbs_g: 1, fat_g: 5, price: 15, tags: ['egg'] },
    { name: '厚切豬排飯', meal_category: 'lunch', calories: 580, protein_g: 28, carbs_g: 68, fat_g: 20, price: 89, tags: ['bento'] },
    { name: '義大利麵餐盒', meal_category: 'lunch', calories: 520, protein_g: 18, carbs_g: 62, fat_g: 18, price: 79, tags: ['pasta'] },
    { name: '關東煮綜合套餐', meal_category: 'dinner', calories: 280, protein_g: 14, carbs_g: 28, fat_g: 8, price: 99, tags: ['oden'] },
  ],
  breakfast: [
    { name: '原味蛋餅', meal_category: 'breakfast', calories: 280, protein_g: 10, carbs_g: 32, fat_g: 12, price: 35, aliases: ['蛋餅'], tags: ['egg_crepe'] },
    { name: '火腿蛋餅', meal_category: 'breakfast', calories: 340, protein_g: 16, carbs_g: 32, fat_g: 16, price: 45, tags: ['egg_crepe'] },
    { name: '鐵板麵套餐', meal_category: 'breakfast', calories: 520, protein_g: 18, carbs_g: 58, fat_g: 22, price: 75, tags: ['noodle'] },
    { name: '燒肉總匯蛋餅', meal_category: 'breakfast', calories: 480, protein_g: 22, carbs_g: 38, fat_g: 24, price: 65, tags: ['egg_crepe'] },
    { name: '豬肉滿福堡加蛋', meal_category: 'breakfast', calories: 450, protein_g: 20, carbs_g: 36, fat_g: 24, price: 55, tags: ['burger'] },
  ],
  coffee: [
    { name: '美式咖啡（中杯）', meal_category: 'breakfast', role: 'drink', calories: 10, protein_g: 1, carbs_g: 1, fat_g: 0, price: 75, aliases: ['美式', '黑咖啡'], tags: ['coffee'] },
    { name: '拿鐵（中杯）', meal_category: 'breakfast', role: 'drink', calories: 180, protein_g: 8, carbs_g: 14, fat_g: 8, price: 95, aliases: ['latte'], tags: ['coffee'] },
    { name: '焦糖瑪奇朵（中杯）', meal_category: 'lunch', role: 'drink', calories: 250, protein_g: 8, carbs_g: 32, fat_g: 10, sugar_g: 28, price: 120, tags: ['coffee'] },
    { name: '雞肉沙拉三明治', meal_category: 'breakfast', calories: 350, protein_g: 22, carbs_g: 32, fat_g: 14, price: 95, tags: ['sandwich'] },
    { name: '藍莓瑪芬', meal_category: 'breakfast', calories: 380, protein_g: 6, carbs_g: 52, fat_g: 16, sugar_g: 30, price: 65, tags: ['pastry'] },
  ],
  bubbletea: [
    { name: '珍珠奶茶（大杯）', meal_category: 'lunch', role: 'drink', calories: 420, protein_g: 4, carbs_g: 68, fat_g: 12, sugar_g: 48, price: 55, aliases: ['大杯珍奶', '奶茶', '大冰奶', '冰奶茶'], tags: ['bubble_tea'] },
    { name: '四季春茶（中杯）', meal_category: 'lunch', role: 'drink', calories: 5, protein_g: 0, carbs_g: 1, fat_g: 0, price: 30, aliases: ['青茶'], tags: ['bubble_tea'] },
    { name: '烏龍拿鐵（大杯）', meal_category: 'lunch', role: 'drink', calories: 320, protein_g: 6, carbs_g: 42, fat_g: 12, sugar_g: 32, price: 65, tags: ['bubble_tea'] },
    { name: '百香雙響炮（大杯）', meal_category: 'lunch', role: 'drink', calories: 280, protein_g: 1, carbs_g: 68, fat_g: 0, sugar_g: 60, price: 60, tags: ['bubble_tea'] },
    { name: '鮮奶茶（中杯·微糖）', meal_category: 'lunch', role: 'drink', calories: 220, protein_g: 5, carbs_g: 32, fat_g: 8, sugar_g: 18, price: 50, aliases: ['鮮奶綠', '鮮奶茶'], tags: ['bubble_tea'] },
  ],
  fastfood: [
    { name: '經典牛肉堡', meal_category: 'lunch', calories: 520, protein_g: 26, carbs_g: 42, fat_g: 28, price: 89, tags: ['burger'] },
    { name: '雞塊（6塊）', meal_category: 'lunch', calories: 280, protein_g: 16, carbs_g: 18, fat_g: 16, price: 65, tags: ['fried'] },
    { name: '雞腿堡套餐', meal_category: 'lunch', calories: 720, protein_g: 30, carbs_g: 72, fat_g: 32, price: 149, tags: ['combo'] },
    { name: '烤雞沙拉碗', meal_category: 'lunch', calories: 280, protein_g: 32, carbs_g: 12, fat_g: 8, price: 120, tags: ['salad'] },
    { name: '薯條（中）', meal_category: 'lunch', role: 'side', calories: 320, protein_g: 4, carbs_g: 42, fat_g: 14, price: 45, tags: ['side'] },
  ],
  japanese: [
    { name: '鮭魚握壽司（2貫）', meal_category: 'lunch', calories: 140, protein_g: 8, carbs_g: 22, fat_g: 2, price: 60, tags: ['sushi'] },
    { name: '牛肉丼（中）', meal_category: 'lunch', calories: 650, protein_g: 30, carbs_g: 82, fat_g: 18, price: 145, aliases: ['牛丼'], tags: ['donburi'] },
    { name: '親子丼', meal_category: 'lunch', calories: 580, protein_g: 28, carbs_g: 72, fat_g: 16, price: 150, tags: ['donburi'] },
    { name: '咖哩豬排飯', meal_category: 'lunch', calories: 720, protein_g: 24, carbs_g: 82, fat_g: 28, price: 180, tags: ['curry'] },
    { name: '炸豬排定食', meal_category: 'lunch', calories: 780, protein_g: 32, carbs_g: 78, fat_g: 32, price: 280, tags: ['katsu'] },
  ],
  bento: [
    { name: '排骨飯', meal_category: 'lunch', calories: 620, protein_g: 28, carbs_g: 72, fat_g: 22, price: 100, tags: ['bento'] },
    { name: '雞腿飯', meal_category: 'lunch', calories: 580, protein_g: 32, carbs_g: 68, fat_g: 18, price: 95, tags: ['bento'] },
    { name: '滷肉飯', meal_category: 'lunch', calories: 520, protein_g: 16, carbs_g: 72, fat_g: 16, price: 45, aliases: ['魯肉飯'], tags: ['rice'] },
    { name: '鍋貼（10顆）', meal_category: 'lunch', calories: 380, protein_g: 16, carbs_g: 42, fat_g: 14, price: 65, tags: ['dumpling'] },
    { name: '排骨乾麵套餐', meal_category: 'lunch', calories: 680, protein_g: 30, carbs_g: 78, fat_g: 24, price: 120, tags: ['noodle'] },
  ],
  hotpot: [
    { name: '個人麻辣鍋', meal_category: 'dinner', calories: 580, protein_g: 28, carbs_g: 32, fat_g: 32, price: 298, tags: ['hot_pot'] },
    { name: '石頭鍋套餐', meal_category: 'dinner', calories: 520, protein_g: 32, carbs_g: 28, fat_g: 24, price: 268, tags: ['hot_pot'] },
    { name: '昆布鍋套餐', meal_category: 'dinner', calories: 420, protein_g: 30, carbs_g: 22, fat_g: 16, price: 328, tags: ['hot_pot'] },
    { name: '和牛套餐', meal_category: 'dinner', calories: 680, protein_g: 38, carbs_g: 18, fat_g: 42, price: 580, tags: ['hot_pot', 'premium'] },
  ],
  bbq: [
    { name: '牛五花套餐（一人）', meal_category: 'dinner', calories: 720, protein_g: 36, carbs_g: 12, fat_g: 48, price: 380, tags: ['yakiniku'] },
    { name: '豬五花套餐', meal_category: 'dinner', calories: 680, protein_g: 32, carbs_g: 14, fat_g: 44, price: 320, tags: ['yakiniku'] },
    { name: '牛舌套餐', meal_category: 'dinner', calories: 520, protein_g: 42, carbs_g: 8, fat_g: 28, price: 450, tags: ['yakiniku'] },
  ],
  noodles: [
    { name: '紅燒牛肉麵', meal_category: 'lunch', calories: 620, protein_g: 32, carbs_g: 72, fat_g: 18, price: 160, aliases: ['牛肉麵'], tags: ['beef_noodle'] },
    { name: '清燉牛肉麵', meal_category: 'lunch', calories: 580, protein_g: 34, carbs_g: 68, fat_g: 14, price: 170, tags: ['beef_noodle'] },
    { name: '豚骨拉麵', meal_category: 'lunch', calories: 580, protein_g: 24, carbs_g: 72, fat_g: 20, price: 220, tags: ['ramen'] },
    { name: '味噌拉麵', meal_category: 'lunch', calories: 540, protein_g: 22, carbs_g: 68, fat_g: 18, price: 210, tags: ['ramen'] },
    { name: '擔擔麵', meal_category: 'lunch', calories: 520, protein_g: 18, carbs_g: 62, fat_g: 20, price: 120, tags: ['noodle'] },
  ],
  thai: [
    { name: '綠咖哩雞套餐', meal_category: 'lunch', calories: 680, protein_g: 28, carbs_g: 72, fat_g: 32, price: 280, tags: ['thai'] },
    { name: '打拋豬肉片套餐', meal_category: 'lunch', calories: 720, protein_g: 30, carbs_g: 75, fat_g: 34, price: 260, tags: ['thai'] },
    { name: '月亮蝦餅', meal_category: 'lunch', calories: 320, protein_g: 12, carbs_g: 28, fat_g: 18, price: 120, tags: ['thai'] },
    { name: '泰式炒河粉', meal_category: 'lunch', calories: 620, protein_g: 26, carbs_g: 78, fat_g: 22, price: 240, tags: ['thai'] },
  ],
  korean: [
    { name: '韓式炸雞（原味）', meal_category: 'dinner', calories: 680, protein_g: 32, carbs_g: 42, fat_g: 38, price: 320, tags: ['korean'] },
    { name: '石鍋拌飯（牛肉）', meal_category: 'lunch', calories: 640, protein_g: 28, carbs_g: 82, fat_g: 18, price: 260, tags: ['korean'] },
    { name: '部隊鍋（一人）', meal_category: 'dinner', calories: 580, protein_g: 26, carbs_g: 48, fat_g: 28, price: 280, tags: ['korean'] },
    { name: '豆腐鍋套餐', meal_category: 'lunch', calories: 420, protein_g: 22, carbs_g: 28, fat_g: 18, price: 220, tags: ['korean', 'tofu'] },
  ],
  american: [
    { name: '肋眼牛排（8oz）', meal_category: 'dinner', calories: 680, protein_g: 48, carbs_g: 2, fat_g: 48, price: 680, tags: ['steak'] },
    { name: '經典班尼迪克蛋', meal_category: 'breakfast', calories: 520, protein_g: 22, carbs_g: 32, fat_g: 32, price: 280, tags: ['brunch'] },
    { name: '美式鬆餅套餐', meal_category: 'breakfast', calories: 620, protein_g: 14, carbs_g: 82, fat_g: 24, sugar_g: 42, price: 240, tags: ['brunch'] },
    { name: '牛肉起司漢堡套餐', meal_category: 'lunch', calories: 820, protein_g: 36, carbs_g: 68, fat_g: 42, price: 380, tags: ['burger'] },
  ],
  healthy: [
    { name: '舒肥雞胸餐盒', meal_category: 'lunch', calories: 460, protein_g: 42, carbs_g: 38, fat_g: 12, price: 150, tags: ['healthy'] },
    { name: '舒肥牛腱餐盒', meal_category: 'lunch', calories: 520, protein_g: 40, carbs_g: 42, fat_g: 18, price: 165, tags: ['healthy'] },
    { name: '鮭魚糙米餐盒', meal_category: 'lunch', calories: 450, protein_g: 36, carbs_g: 35, fat_g: 16, price: 175, tags: ['healthy'] },
    { name: '雞胸沙拉碗', meal_category: 'lunch', calories: 380, protein_g: 38, carbs_g: 18, fat_g: 14, price: 160, tags: ['healthy', 'salad'] },
  ],
  desserts: [
    { name: '生乳捲（切片）', meal_category: 'dinner', calories: 320, protein_g: 6, carbs_g: 38, fat_g: 16, sugar_g: 28, price: 95, tags: ['dessert'] },
    { name: '草莓蛋糕（切片）', meal_category: 'dinner', calories: 380, protein_g: 5, carbs_g: 48, fat_g: 18, sugar_g: 32, price: 120, tags: ['dessert'] },
    { name: '冰淇淋（單球）', meal_category: 'dinner', calories: 220, protein_g: 4, carbs_g: 28, fat_g: 10, sugar_g: 24, price: 80, tags: ['dessert'] },
    { name: '提拉米蘇', meal_category: 'dinner', calories: 420, protein_g: 6, carbs_g: 42, fat_g: 24, sugar_g: 30, price: 140, tags: ['dessert'] },
  ],
  supermarket: [
    { name: '雞胸肉（100g）', meal_category: 'lunch', role: 'protein', calories: 110, protein_g: 23, carbs_g: 0, fat_g: 1, price: 45, tags: ['ingredient'] },
    { name: '糙米飯（一盒）', meal_category: 'lunch', role: 'carb', calories: 280, protein_g: 6, carbs_g: 58, fat_g: 2, fiber_g: 4, price: 35, tags: ['ingredient'] },
    { name: '綜合沙拉盒', meal_category: 'lunch', calories: 120, protein_g: 4, carbs_g: 12, fat_g: 6, fiber_g: 4, price: 59, tags: ['ready_meal'] },
    { name: '鮭魚切片（100g）', meal_category: 'dinner', role: 'protein', calories: 180, protein_g: 20, carbs_g: 0, fat_g: 10, price: 89, tags: ['ingredient'] },
  ],
  night_market: [
    { name: '雞排', meal_category: 'dinner', calories: 580, protein_g: 32, carbs_g: 38, fat_g: 32, price: 65, aliases: ['鹽酥雞排'], tags: ['night_market', 'fried'] },
    { name: '鹽酥雞', meal_category: 'dinner', calories: 420, protein_g: 28, carbs_g: 18, fat_g: 26, price: 60, aliases: ['鹹酥雞'], tags: ['night_market', 'fried'] },
    { name: '蔥油餅', meal_category: 'dinner', calories: 380, protein_g: 8, carbs_g: 48, fat_g: 16, price: 45, tags: ['night_market'] },
    { name: '地瓜球', meal_category: 'dinner', calories: 280, protein_g: 2, carbs_g: 52, fat_g: 8, price: 40, tags: ['night_market'] },
    { name: '滷味拼盤', meal_category: 'dinner', calories: 320, protein_g: 22, carbs_g: 12, fat_g: 18, price: 80, tags: ['night_market'] },
    { name: '臭豆腐', meal_category: 'dinner', calories: 280, protein_g: 14, carbs_g: 18, fat_g: 16, price: 55, tags: ['night_market'] },
    { name: '蚵仔煎', meal_category: 'dinner', calories: 420, protein_g: 12, carbs_g: 48, fat_g: 18, price: 70, tags: ['night_market'] },
    { name: '大腸包小腸', meal_category: 'dinner', calories: 480, protein_g: 16, carbs_g: 42, fat_g: 26, price: 55, tags: ['night_market'] },
    { name: '潤餅', meal_category: 'lunch', calories: 380, protein_g: 12, carbs_g: 52, fat_g: 12, price: 45, tags: ['night_market'] },
    { name: '飯糰', meal_category: 'breakfast', calories: 220, protein_g: 6, carbs_g: 38, fat_g: 4, price: 30, aliases: ['三角飯糰'], tags: ['night_market'] },
    { name: '蛋餅', meal_category: 'breakfast', calories: 280, protein_g: 10, carbs_g: 32, fat_g: 12, price: 35, tags: ['night_market'] },
    { name: '鍋燒意麵', meal_category: 'dinner', calories: 420, protein_g: 14, carbs_g: 52, fat_g: 14, price: 80, tags: ['night_market', 'noodle'] },
  ],
}
