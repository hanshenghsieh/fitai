// 便利店菜單資料庫 - 7-11 & 全家常見便當
// 優先選擇高蛋白選項，支持減脂目標

export interface ConvenienceItem {
  id: string
  name: string
  store: '7-11' | '全家'
  category: 'breakfast' | 'lunch' | 'dinner'
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  price: number
  photo_url: string
  description: string
}

export const convenienceStoreMenu: ConvenienceItem[] = [
  // 7-11 早餐 - 高蛋白優先
  {
    id: '7-11-breakfast-1',
    name: '雞胸肉蛋白早餐便當',
    store: '7-11',
    category: 'breakfast',
    calories: 350,
    protein_g: 52,
    carbs_g: 20,
    fat_g: 8,
    price: 89,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '高蛋白早餐：烤雞胸肉+米飯+蔬菜',
  },
  {
    id: '7-11-breakfast-2',
    name: '鮭魚蛋白早餐',
    store: '7-11',
    category: 'breakfast',
    calories: 380,
    protein_g: 48,
    carbs_g: 25,
    fat_g: 12,
    price: 99,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    description: '烤鮭魚+地瓜+青菜，Omega-3豐富',
  },
  {
    id: '7-11-breakfast-3',
    name: '蛋白質沙拉套餐',
    store: '7-11',
    category: 'breakfast',
    calories: 320,
    protein_g: 38,
    carbs_g: 28,
    fat_g: 10,
    price: 79,
    photo_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop',
    description: '雞肉沙拉+水煮蛋+全穀麵包',
  },

  // 7-11 午餐 - 高蛋白優先
  {
    id: '7-11-lunch-1',
    name: '燒烤雞腿便當',
    store: '7-11',
    category: 'lunch',
    calories: 580,
    protein_g: 68,
    carbs_g: 38,
    fat_g: 18,
    price: 129,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '炭火烤雞腿+糙米+時蔬',
  },
  {
    id: '7-11-lunch-2',
    name: '牛肉蓋飯便當',
    store: '7-11',
    category: 'lunch',
    calories: 620,
    protein_g: 72,
    carbs_g: 42,
    fat_g: 20,
    price: 139,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    description: '日式牛肉蓋飯，高蛋白減脂首選',
  },
  {
    id: '7-11-lunch-3',
    name: '雙人蛋白便當',
    store: '7-11',
    category: 'lunch',
    calories: 560,
    protein_g: 64,
    carbs_g: 35,
    fat_g: 16,
    price: 119,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '雞肉+蛋+豆腐，三重蛋白來源',
  },

  // 7-11 晚餐 - 高蛋白優先
  {
    id: '7-11-dinner-1',
    name: '烤鮭魚晚餐',
    store: '7-11',
    category: 'dinner',
    calories: 520,
    protein_g: 60,
    carbs_g: 32,
    fat_g: 14,
    price: 129,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    description: '野生鮭魚+花菜+糙米',
  },
  {
    id: '7-11-dinner-2',
    name: '白肉晚餐便當',
    store: '7-11',
    category: 'dinner',
    calories: 480,
    protein_g: 56,
    carbs_g: 30,
    fat_g: 12,
    price: 119,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '雞胸肉+地瓜+綠菜',
  },
  {
    id: '7-11-dinner-3',
    name: '海鮮盤便當',
    store: '7-11',
    category: 'dinner',
    calories: 540,
    protein_g: 62,
    carbs_g: 28,
    fat_g: 16,
    price: 139,
    photo_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=300&h=300&fit=crop',
    description: '蝦+魚+貝類，低碳高蛋白',
  },

  // 全家 早餐 - 高蛋白優先
  {
    id: 'family-breakfast-1',
    name: '火腿蛋白早餐',
    store: '全家',
    category: 'breakfast',
    calories: 360,
    protein_g: 50,
    carbs_g: 22,
    fat_g: 10,
    price: 85,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '火腿+蛋+全穀麵包',
  },
  {
    id: 'family-breakfast-2',
    name: '牛奶蛋白套餐',
    store: '全家',
    category: 'breakfast',
    calories: 340,
    protein_g: 44,
    carbs_g: 26,
    fat_g: 8,
    price: 79,
    photo_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291840?w=300&h=300&fit=crop',
    description: '蛋白奶+蛋+麥片+水果',
  },
  {
    id: 'family-breakfast-3',
    name: '起司蛋白早餐',
    store: '全家',
    category: 'breakfast',
    calories: 370,
    protein_g: 48,
    carbs_g: 24,
    fat_g: 12,
    price: 89,
    photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=300&h=300&fit=crop',
    description: '起司+蛋+火腿+全麥',
  },

  // 全家 午餐 - 高蛋白優先
  {
    id: 'family-lunch-1',
    name: '雞肉蓋飯便當',
    store: '全家',
    category: 'lunch',
    calories: 600,
    protein_g: 70,
    carbs_g: 40,
    fat_g: 16,
    price: 119,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '嫩雞肉蓋飯+湯+小菜',
  },
  {
    id: 'family-lunch-2',
    name: '豚肉便當',
    store: '全家',
    category: 'lunch',
    calories: 620,
    protein_g: 66,
    carbs_g: 44,
    fat_g: 18,
    price: 129,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    description: '豬里肌肉+糙米+青菜',
  },
  {
    id: 'family-lunch-3',
    name: '綜合肉便當',
    store: '全家',
    category: 'lunch',
    calories: 580,
    protein_g: 68,
    carbs_g: 36,
    fat_g: 16,
    price: 119,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '雞+豬+蛋，三重蛋白',
  },

  // 全家 晚餐 - 高蛋白優先
  {
    id: 'family-dinner-1',
    name: '唐揚雞晚餐',
    store: '全家',
    category: 'dinner',
    calories: 550,
    protein_g: 58,
    carbs_g: 32,
    fat_g: 18,
    price: 129,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '日式炸雞塊+沙拉+米飯',
  },
  {
    id: 'family-dinner-2',
    name: '鮮蝦海鮮便當',
    store: '全家',
    category: 'dinner',
    calories: 480,
    protein_g: 64,
    carbs_g: 28,
    fat_g: 12,
    price: 139,
    photo_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=300&h=300&fit=crop',
    description: '鮮蝦+貝類+玉米+青菜',
  },
  {
    id: 'family-dinner-3',
    name: '豆腐蛋白晚餐',
    store: '全家',
    category: 'dinner',
    calories: 420,
    protein_g: 52,
    carbs_g: 30,
    fat_g: 14,
    price: 99,
    photo_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop',
    description: '臭豆腐+雞蛋+麵+青菜',
  },
]

export function getConvenienceItems(category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return convenienceStoreMenu.filter(item => item.category === category)
}

export function getConvenienceItemsByStore(store: '7-11' | '全家', category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return convenienceStoreMenu.filter(item => item.store === store && item.category === category)
}
