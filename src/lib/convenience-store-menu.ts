// 便利店菜單資料庫 - 7-11 & 全家常見便當

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
  // 7-11 早餐
  {
    id: '7-11-breakfast-1',
    name: '和風野菜便當',
    store: '7-11',
    category: 'breakfast',
    calories: 280,
    protein_g: 12,
    carbs_g: 35,
    fat_g: 8,
    price: 59,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    description: '日式健康早餐便當，含蔬菜和米飯',
  },
  {
    id: '7-11-breakfast-2',
    name: '蛋白質早餐盒',
    store: '7-11',
    category: 'breakfast',
    calories: 320,
    protein_g: 18,
    carbs_g: 32,
    fat_g: 10,
    price: 69,
    photo_url: 'https://images.unsplash.com/photo-1585238341710-4abb7692202b?w=300&h=300&fit=crop',
    description: '高蛋白早餐組合，含蛋、起司和全麥麵包',
  },
  {
    id: '7-11-breakfast-3',
    name: '燒肉便當',
    store: '7-11',
    category: 'breakfast',
    calories: 350,
    protein_g: 22,
    carbs_g: 38,
    fat_g: 12,
    price: 79,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '日式燒肉便當，含新鮮蔬菜',
  },

  // 7-11 午餐
  {
    id: '7-11-lunch-1',
    name: '銷魂炒飯',
    store: '7-11',
    category: 'lunch',
    calories: 420,
    protein_g: 16,
    carbs_g: 48,
    fat_g: 14,
    price: 89,
    photo_url: 'https://images.unsplash.com/photo-1654080356715-d91a43cbcaee?w=300&h=300&fit=crop',
    description: '鮮蝦炒飯，營養均衡',
  },
  {
    id: '7-11-lunch-2',
    name: '雞肉咖哩飯',
    store: '7-11',
    category: 'lunch',
    calories: 480,
    protein_g: 20,
    carbs_g: 52,
    fat_g: 16,
    price: 99,
    photo_url: 'https://images.unsplash.com/photo-1585518119339-c6b6564fb900?w=300&h=300&fit=crop',
    description: '日式雞肉咖哩飯，含蔬菜',
  },
  {
    id: '7-11-lunch-3',
    name: '牛肉蓋飯',
    store: '7-11',
    category: 'lunch',
    calories: 520,
    protein_g: 28,
    carbs_g: 50,
    fat_g: 18,
    price: 119,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    description: '日式牛肉蓋飯，高蛋白',
  },

  // 7-11 晚餐
  {
    id: '7-11-dinner-1',
    name: '海鮮烏龍麵',
    store: '7-11',
    category: 'dinner',
    calories: 380,
    protein_g: 18,
    carbs_g: 44,
    fat_g: 12,
    price: 85,
    photo_url: 'https://images.unsplash.com/photo-1579954614171-52a2010fb53f?w=300&h=300&fit=crop',
    description: '日式海鮮烏龍麵，清淡健康',
  },
  {
    id: '7-11-dinner-2',
    name: '烤鮭魚便當',
    store: '7-11',
    category: 'dinner',
    calories: 420,
    protein_g: 32,
    carbs_g: 40,
    fat_g: 14,
    price: 109,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    description: '烤鮭魚便當，含綠菜和米飯',
  },
  {
    id: '7-11-dinner-3',
    name: '雞肉沙拉便當',
    store: '7-11',
    category: 'dinner',
    calories: 320,
    protein_g: 28,
    carbs_g: 28,
    fat_g: 10,
    price: 95,
    photo_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop',
    description: '低熱量雞肉沙拉便當，減脂首選',
  },

  // 全家 早餐
  {
    id: 'family-breakfast-1',
    name: '活力早餐',
    store: '全家',
    category: 'breakfast',
    calories: 290,
    protein_g: 14,
    carbs_g: 36,
    fat_g: 9,
    price: 59,
    photo_url: 'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=300&h=300&fit=crop',
    description: '全家活力早餐，含水果和優格',
  },
  {
    id: 'family-breakfast-2',
    name: '肉類蛋白餐',
    store: '全家',
    category: 'breakfast',
    calories: 340,
    protein_g: 20,
    carbs_g: 34,
    fat_g: 11,
    price: 69,
    photo_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=300&fit=crop',
    description: '肉類蛋白早餐，含培根和蛋',
  },
  {
    id: 'family-breakfast-3',
    name: '日式定食',
    store: '全家',
    category: 'breakfast',
    calories: 360,
    protein_g: 24,
    carbs_g: 40,
    fat_g: 10,
    price: 79,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    description: '日式傳統定食早餐',
  },

  // 全家 午餐
  {
    id: 'family-lunch-1',
    name: '石鍋拌飯',
    store: '全家',
    category: 'lunch',
    calories: 450,
    protein_g: 18,
    carbs_g: 50,
    fat_g: 15,
    price: 99,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    description: '石鍋拌飯，香香脆脆',
  },
  {
    id: 'family-lunch-2',
    name: '豚骨拉麵',
    store: '全家',
    category: 'lunch',
    calories: 500,
    protein_g: 22,
    carbs_g: 54,
    fat_g: 18,
    price: 109,
    photo_url: 'https://images.unsplash.com/photo-1579954614171-52a2010fb53f?w=300&h=300&fit=crop',
    description: '濃郁豚骨拉麵',
  },
  {
    id: 'family-lunch-3',
    name: '雞腿飯',
    store: '全家',
    category: 'lunch',
    calories: 480,
    protein_g: 26,
    carbs_g: 52,
    fat_g: 16,
    price: 89,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '香嫩雞腿飯，搭配新鮮蔬菜',
  },

  // 全家 晚餐
  {
    id: 'family-dinner-1',
    name: '鮮蝦便當',
    store: '全家',
    category: 'dinner',
    calories: 400,
    protein_g: 24,
    carbs_g: 42,
    fat_g: 12,
    price: 99,
    photo_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=300&h=300&fit=crop',
    description: '新鮮鮮蝦便當，低脂健康',
  },
  {
    id: 'family-dinner-2',
    name: '日式唐揚雞',
    store: '全家',
    category: 'dinner',
    calories: 440,
    protein_g: 28,
    carbs_g: 38,
    fat_g: 14,
    price: 109,
    photo_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=300&fit=crop',
    description: '日式炸雞，外酥內嫩',
  },
  {
    id: 'family-dinner-3',
    name: '鯖魚便當',
    store: '全家',
    category: 'dinner',
    calories: 380,
    protein_g: 30,
    carbs_g: 36,
    fat_g: 11,
    price: 89,
    photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
    description: '新鮮鯖魚便當，高蛋白',
  },
]

export function getConvenienceItems(category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return convenienceStoreMenu.filter(item => item.category === category)
}

export function getConvenienceItemsByStore(store: '7-11' | '全家', category: 'breakfast' | 'lunch' | 'dinner'): ConvenienceItem[] {
  return convenienceStoreMenu.filter(item => item.store === store && item.category === category)
}
