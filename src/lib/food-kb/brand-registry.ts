import type { BrandType } from './types'

export interface BrandEntry {
  slug: string
  name_zh: string
  category: BrandType
  /** KB category key for pipeline filtering */
  kb_category: string
  website?: string
  priority: number
}

/** Master Taiwan brand registry — expand toward 1000+ brands incrementally */
export const BRAND_REGISTRY: BrandEntry[] = [
  // ── convenience ──
  { slug: '7-11', name_zh: '7-11', category: 'convenience', kb_category: 'convenience', priority: 10 },
  { slug: 'familymart', name_zh: '全家', category: 'convenience', kb_category: 'convenience', priority: 10 },
  { slug: 'hilife', name_zh: '萊爾富', category: 'convenience', kb_category: 'convenience', priority: 9 },
  { slug: 'okmart', name_zh: 'OK超商', category: 'convenience', kb_category: 'convenience', priority: 9 },

  // ── breakfast ──
  { slug: 'mcdonald-breakfast', name_zh: '麥味登', category: 'breakfast', kb_category: 'breakfast', priority: 8 },
  { slug: 'qburger', name_zh: 'Q Burger', category: 'breakfast', kb_category: 'breakfast', priority: 7 },
  { slug: 'hongye', name_zh: '弘爺漢堡', category: 'breakfast', kb_category: 'breakfast', priority: 7 },
  { slug: 'laya', name_zh: '拉亞漢堡', category: 'breakfast', kb_category: 'breakfast', priority: 7 },
  { slug: 'goodmorning-moz', name_zh: '早安美芝城', category: 'breakfast', kb_category: 'breakfast', priority: 8 },
  { slug: 'morning-kitchen', name_zh: '晨間廚房', category: 'breakfast', kb_category: 'breakfast', priority: 6 },
  { slug: 'meirumei', name_zh: '美而美', category: 'breakfast', kb_category: 'breakfast', priority: 8 },
  { slug: 'xiashangbao', name_zh: '呷尚寶', category: 'breakfast', kb_category: 'breakfast', priority: 6 },
  { slug: 'morning-hill', name_zh: '早安山丘', category: 'breakfast', kb_category: 'breakfast', priority: 6 },
  { slug: 'julin-meirumei', name_zh: '巨林美而美', category: 'breakfast', kb_category: 'breakfast', priority: 5 },

  // ── coffee ──
  { slug: 'starbucks', name_zh: '星巴克', category: 'coffee', kb_category: 'coffee', priority: 10 },
  { slug: 'louisa', name_zh: '路易莎', category: 'coffee', kb_category: 'coffee', priority: 9 },
  { slug: '85c', name_zh: '85度C', category: 'coffee', kb_category: 'coffee', priority: 8 },
  { slug: 'cama', name_zh: 'cama', category: 'coffee', kb_category: 'coffee', priority: 8 },
  { slug: 'mr-brown', name_zh: '伯朗咖啡', category: 'coffee', kb_category: 'coffee', priority: 6 },
  { slug: 'cheng-zhen', name_zh: '成真咖啡', category: 'coffee', kb_category: 'coffee', priority: 6 },
  { slug: 'black-water', name_zh: '黑沃咖啡', category: 'coffee', kb_category: 'coffee', priority: 6 },
  { slug: 'dante', name_zh: '丹堤咖啡', category: 'coffee', kb_category: 'coffee', priority: 6 },
  { slug: 'donutes', name_zh: '多那之', category: 'coffee', kb_category: 'coffee', priority: 7 },
  { slug: 'cafein', name_zh: 'CAFE!N', category: 'coffee', kb_category: 'coffee', priority: 7 },

  // ── bubble tea ──
  { slug: '50lan', name_zh: '五十嵐', category: 'bubble_tea', kb_category: 'bubbletea', priority: 10 },
  { slug: 'ching-shin', name_zh: '清心福全', category: 'bubble_tea', kb_category: 'bubbletea', priority: 9 },
  { slug: 'coco-tea', name_zh: 'CoCo都可', category: 'bubble_tea', kb_category: 'bubbletea', priority: 9 },
  { slug: 'kebu-ke', name_zh: '可不可', category: 'bubble_tea', kb_category: 'bubbletea', priority: 9 },
  { slug: 'mago', name_zh: '麻古茶坊', category: 'bubble_tea', kb_category: 'bubbletea', priority: 8 },
  { slug: 'milkshop', name_zh: '迷客夏', category: 'bubble_tea', kb_category: 'bubbletea', priority: 9 },
  { slug: 'dayung', name_zh: '大苑子', category: 'bubble_tea', kb_category: 'bubbletea', priority: 7 },
  { slug: 'tea-top', name_zh: '茶湯會', category: 'bubble_tea', kb_category: 'bubbletea', priority: 7 },
  { slug: 'woolong', name_zh: '烏弄', category: 'bubble_tea', kb_category: 'bubbletea', priority: 7 },
  { slug: 'dezheng', name_zh: '得正', category: 'bubble_tea', kb_category: 'bubbletea', priority: 7 },
  { slug: 'yimu', name_zh: '一沐日', category: 'bubble_tea', kb_category: 'bubbletea', priority: 8 },
  { slug: 'guiji', name_zh: '龜記', category: 'bubble_tea', kb_category: 'bubbletea', priority: 7 },
  { slug: 'wanpo', name_zh: '萬波', category: 'bubble_tea', kb_category: 'bubbletea', priority: 7 },
  { slug: 'zhenzhu', name_zh: '珍煮丹', category: 'bubble_tea', kb_category: 'bubbletea', priority: 7 },
  { slug: 'comebuy', name_zh: 'COMEBUY', category: 'bubble_tea', kb_category: 'bubbletea', priority: 6 },
  { slug: 'xianhe', name_zh: '先喝道', category: 'bubble_tea', kb_category: 'bubbletea', priority: 6 },
  { slug: 'teapost', name_zh: '茶聚', category: 'bubble_tea', kb_category: 'bubbletea', priority: 6 },
  { slug: 'laolai', name_zh: '老賴茶棧', category: 'bubble_tea', kb_category: 'bubbletea', priority: 6 },
  { slug: 'nap-5min', name_zh: '再睡五分鐘', category: 'bubble_tea', kb_category: 'bubbletea', priority: 8 },
  { slug: 'yayoi-tea', name_zh: '八曜和茶', category: 'bubble_tea', kb_category: 'bubbletea', priority: 7 },
  { slug: 'hecha', name_zh: '鶴茶樓', category: 'bubble_tea', kb_category: 'bubbletea', priority: 6 },
  { slug: 'shuixiang', name_zh: '水巷茶弄', category: 'bubble_tea', kb_category: 'bubbletea', priority: 6 },
  { slug: 'sunrise-tea', name_zh: '日出茶太', category: 'bubble_tea', kb_category: 'bubbletea', priority: 6 },

  // ── fast food ──
  { slug: 'mcdonalds', name_zh: '麥當勞', category: 'fast_food', kb_category: 'fastfood', priority: 10 },
  { slug: 'kfc', name_zh: '肯德基', category: 'fast_food', kb_category: 'fastfood', priority: 10 },
  { slug: 'burger-king', name_zh: '漢堡王', category: 'fast_food', kb_category: 'fastfood', priority: 9 },
  { slug: 'mos', name_zh: '摩斯漢堡', category: 'fast_food', kb_category: 'fastfood', priority: 9 },
  { slug: 'subway', name_zh: 'Subway', category: 'fast_food', kb_category: 'fastfood', priority: 9 },
  { slug: 'napoli', name_zh: '拿坡里', category: 'fast_food', kb_category: 'fastfood', priority: 7 },
  { slug: 'pizzahut', name_zh: '必勝客', category: 'fast_food', kb_category: 'fastfood', priority: 8 },
  { slug: 'dominos', name_zh: '達美樂', category: 'fast_food', kb_category: 'fastfood', priority: 8 },
  { slug: 'texas-chicken', name_zh: '德州美墨炸雞', category: 'fast_food', kb_category: 'fastfood', priority: 7 },
  { slug: 'tkk', name_zh: '頂呱呱', category: 'fast_food', kb_category: 'fastfood', priority: 7 },
  { slug: 'jiguang', name_zh: '繼光香香雞', category: 'fast_food', kb_category: 'fastfood', priority: 7 },

  // ── japanese ──
  { slug: 'sushiro', name_zh: '壽司郎', category: 'chain_restaurant', kb_category: 'japanese', priority: 9 },
  { slug: 'kura', name_zh: '藏壽司', category: 'chain_restaurant', kb_category: 'japanese', priority: 9 },
  { slug: 'sushi-express', name_zh: '爭鮮迴轉壽司', category: 'chain_restaurant', kb_category: 'japanese', priority: 9 },
  { slug: 'magic-touch', name_zh: 'Magic Touch', category: 'chain_restaurant', kb_category: 'japanese', priority: 7 },
  { slug: 'hamasushi', name_zh: '浜壽司', category: 'chain_restaurant', kb_category: 'japanese', priority: 7 },
  { slug: 'yoshinoya', name_zh: '吉野家', category: 'chain_restaurant', kb_category: 'japanese', priority: 9 },
  { slug: 'sukiya', name_zh: 'SUKIYA', category: 'chain_restaurant', kb_category: 'japanese', priority: 8 },
  { slug: 'matsuya', name_zh: '松屋', category: 'chain_restaurant', kb_category: 'japanese', priority: 7 },
  { slug: 'coco-ichibanya', name_zh: 'CoCo壹番屋', category: 'chain_restaurant', kb_category: 'japanese', priority: 8 },
  { slug: 'katsuya', name_zh: '勝博殿', category: 'chain_restaurant', kb_category: 'japanese', priority: 8 },
  { slug: 'kyoani', name_zh: '杏子豬排', category: 'chain_restaurant', kb_category: 'japanese', priority: 7 },
  { slug: 'ootoya', name_zh: '大戶屋', category: 'chain_restaurant', kb_category: 'japanese', priority: 8 },
  { slug: 'yayoi', name_zh: 'YAYOI彌生軒', category: 'chain_restaurant', kb_category: 'japanese', priority: 7 },

  // ── bento ──
  { slug: 'bdf', name_zh: '八方雲集', category: 'bento', kb_category: 'bento', priority: 9 },
  { slug: 'lsh', name_zh: '梁社漢排骨', category: 'bento', kb_category: 'bento', priority: 9 },
  { slug: 'hsz', name_zh: '鬍鬚張', category: 'bento', kb_category: 'bento', priority: 9 },
  { slug: 'sunright', name_zh: '三商巧福', category: 'bento', kb_category: 'bento', priority: 8 },
  { slug: 'wutao', name_zh: '悟饕池上便當', category: 'bento', kb_category: 'bento', priority: 8 },
  { slug: 'zhengzhong', name_zh: '正忠排骨飯', category: 'bento', kb_category: 'bento', priority: 7 },
  { slug: 'chishang', name_zh: '池上木片便當', category: 'bento', kb_category: 'bento', priority: 7 },
  { slug: 'dongchi', name_zh: '東池飯包', category: 'bento', kb_category: 'bento', priority: 7 },
  { slug: 'fukusho', name_zh: '福勝亭', category: 'chain_restaurant', kb_category: 'japanese', priority: 7 },

  // ── hot pot ──
  { slug: 'shierguo', name_zh: '石二鍋', category: 'hot_pot', kb_category: 'hotpot', priority: 9 },
  { slug: 'zhujian', name_zh: '築間', category: 'hot_pot', kb_category: 'hotpot', priority: 8 },
  { slug: 'shabu-yo', name_zh: '涮乃葉', category: 'hot_pot', kb_category: 'hotpot', priority: 7 },
  { slug: 'juhokkaido', name_zh: '聚北海道鍋物', category: 'hot_pot', kb_category: 'hotpot', priority: 7 },
  { slug: 'roduoduo', name_zh: '肉多多', category: 'hot_pot', kb_category: 'hotpot', priority: 7 },
  { slug: 'qiandu', name_zh: '錢都', category: 'hot_pot', kb_category: 'hotpot', priority: 7 },
  { slug: 'xiaomengniu', name_zh: '小蒙牛', category: 'hot_pot', kb_category: 'hotpot', priority: 7 },
  { slug: 'qianye', name_zh: '千葉火鍋', category: 'hot_pot', kb_category: 'hotpot', priority: 7 },
  { slug: 'laoxianjue', name_zh: '老先覺', category: 'hot_pot', kb_category: 'hotpot', priority: 7 },
  { slug: 'guotaiming', name_zh: '鍋台銘', category: 'hot_pot', kb_category: 'hotpot', priority: 6 },
  { slug: 'shierduan', name_zh: '十二段', category: 'hot_pot', kb_category: 'hotpot', priority: 6 },
  { slug: 'wagyu-shabu', name_zh: '和牛涮', category: 'hot_pot', kb_category: 'hotpot', priority: 8 },
  { slug: 'haidilao', name_zh: '海底撈', category: 'hot_pot', kb_category: 'hotpot', priority: 9 },

  // ── bbq ──
  { slug: 'yakiniku-like', name_zh: '燒肉LIKE', category: 'chain_restaurant', kb_category: 'bbq', priority: 8 },
  { slug: 'kanpai', name_zh: '乾杯', category: 'chain_restaurant', kb_category: 'bbq', priority: 8 },
  { slug: 'laokanpai', name_zh: '老乾杯', category: 'chain_restaurant', kb_category: 'bbq', priority: 8 },
  { slug: 'roucifang', name_zh: '肉次方', category: 'chain_restaurant', kb_category: 'bbq', priority: 7 },
  { slug: 'yakiniku-smile', name_zh: '燒肉Smile', category: 'chain_restaurant', kb_category: 'bbq', priority: 6 },
  { slug: 'yuma', name_zh: '屋馬', category: 'chain_restaurant', kb_category: 'bbq', priority: 8 },
  { slug: 'cha6', name_zh: '茶六', category: 'chain_restaurant', kb_category: 'bbq', priority: 7 },

  // ── noodles ──
  { slug: 'duan-chunzhen', name_zh: '段純貞', category: 'chain_restaurant', kb_category: 'noodles', priority: 8 },
  { slug: 'laodong', name_zh: '老董牛肉麵', category: 'chain_restaurant', kb_category: 'noodles', priority: 7 },
  { slug: 'lindongfang', name_zh: '林東芳', category: 'chain_restaurant', kb_category: 'noodles', priority: 8 },
  { slug: 'huangjia', name_zh: '皇家傳承牛肉麵', category: 'chain_restaurant', kb_category: 'noodles', priority: 7 },
  { slug: 'tianxia', name_zh: '天下三絕', category: 'chain_restaurant', kb_category: 'noodles', priority: 7 },
  { slug: 'ichiran', name_zh: '一蘭', category: 'chain_restaurant', kb_category: 'noodles', priority: 8 },
  { slug: 'tonchin', name_zh: '屯京拉麵', category: 'chain_restaurant', kb_category: 'noodles', priority: 7 },
  { slug: 'musashi', name_zh: '麵屋武藏', category: 'chain_restaurant', kb_category: 'noodles', priority: 7 },
  { slug: 'kagetsu', name_zh: '花月嵐', category: 'chain_restaurant', kb_category: 'noodles', priority: 7 },
  { slug: 'raumenya', name_zh: '樂麵屋', category: 'chain_restaurant', kb_category: 'noodles', priority: 6 },
  { slug: 'shantouhuo', name_zh: '山頭火', category: 'chain_restaurant', kb_category: 'noodles', priority: 6 },
  { slug: 'wuhuama', name_zh: '五花馬', category: 'chain_restaurant', kb_category: 'noodles', priority: 6 },
  { slug: 'sihai', name_zh: '四海遊龍', category: 'chain_restaurant', kb_category: 'noodles', priority: 8 },
  { slug: 'qiaozhiwei', name_zh: '巧之味', category: 'chain_restaurant', kb_category: 'noodles', priority: 6 },

  // ── thai ──
  { slug: 'wangcheng', name_zh: '瓦城', category: 'chain_restaurant', kb_category: 'thai', priority: 9 },
  { slug: 'daxin', name_zh: '大心', category: 'chain_restaurant', kb_category: 'thai', priority: 8 },
  { slug: 'verythai', name_zh: '非常泰', category: 'chain_restaurant', kb_category: 'thai', priority: 7 },
  { slug: 'xiangtaiduo', name_zh: '饗泰多', category: 'chain_restaurant', kb_category: 'thai', priority: 7 },

  // ── korean ──
  { slug: 'juan-tofu', name_zh: '涓豆腐', category: 'chain_restaurant', kb_category: 'korean', priority: 8 },
  { slug: 'liangbanjia', name_zh: '兩班家', category: 'chain_restaurant', kb_category: 'korean', priority: 7 },
  { slug: 'hankang', name_zh: '韓姜熙', category: 'chain_restaurant', kb_category: 'korean', priority: 6 },
  { slug: 'beicun', name_zh: '北村豆腐家', category: 'chain_restaurant', kb_category: 'korean', priority: 7 },
  { slug: 'doufucun', name_zh: '豆腐村', category: 'chain_restaurant', kb_category: 'korean', priority: 6 },

  // ── american ──
  { slug: 'texas-roadhouse', name_zh: 'Texas Roadhouse', category: 'chain_restaurant', kb_category: 'american', priority: 8 },
  { slug: 'tgi', name_zh: 'TGI Fridays', category: 'chain_restaurant', kb_category: 'american', priority: 7 },
  { slug: 'chilis', name_zh: "Chili's", category: 'chain_restaurant', kb_category: 'american', priority: 7 },
  { slug: 'lezi', name_zh: '樂子', category: 'chain_restaurant', kb_category: 'american', priority: 8 },
  { slug: 'second-floor', name_zh: '貳樓', category: 'chain_restaurant', kb_category: 'american', priority: 8 },

  // ── healthy ──
  { slug: '72c', name_zh: '72度C舒肥健康餐', category: 'chain_restaurant', kb_category: 'healthy', priority: 8 },
  { slug: 'leka', name_zh: '樂卡餐盒', category: 'chain_restaurant', kb_category: 'healthy', priority: 7 },
  { slug: 'miss-energy', name_zh: 'Miss Energy', category: 'chain_restaurant', kb_category: 'healthy', priority: 7 },
  { slug: 'jianren', name_zh: '健人餐廚', category: 'chain_restaurant', kb_category: 'healthy', priority: 8 },
  { slug: 'xiangjiankang', name_zh: '享健康', category: 'chain_restaurant', kb_category: 'healthy', priority: 6 },
  { slug: 'yecanri', name_zh: '野餐日', category: 'chain_restaurant', kb_category: 'healthy', priority: 6 },
  { slug: 'fitbox', name_zh: 'FitBox', category: 'chain_restaurant', kb_category: 'healthy', priority: 7 },
  { slug: 'muscle-beach', name_zh: '肌肉海灘', category: 'chain_restaurant', kb_category: 'healthy', priority: 7 },
  { slug: 'yeshou', name_zh: '野瘦派', category: 'chain_restaurant', kb_category: 'healthy', priority: 6 },
  { slug: 'chumi', name_zh: '初米好食', category: 'chain_restaurant', kb_category: 'healthy', priority: 6 },

  // ── desserts ──
  { slug: 'annick', name_zh: '亞尼克', category: 'dessert', kb_category: 'desserts', priority: 8 },
  { slug: 'fujiya', name_zh: '不二家', category: 'dessert', kb_category: 'desserts', priority: 7 },
  { slug: 'cold-stone', name_zh: 'COLD STONE', category: 'dessert', kb_category: 'desserts', priority: 8 },
  { slug: 'haagen', name_zh: '哈根達斯', category: 'dessert', kb_category: 'desserts', priority: 8 },

  // ── supermarket ──
  { slug: 'pxmart', name_zh: '全聯', category: 'supermarket', kb_category: 'supermarket', priority: 10 },
  { slug: 'carrefour', name_zh: '家樂福', category: 'supermarket', kb_category: 'supermarket', priority: 9 },
  { slug: 'amart', name_zh: '愛買', category: 'supermarket', kb_category: 'supermarket', priority: 8 },
  { slug: 'rtmart', name_zh: '大潤發', category: 'supermarket', kb_category: 'supermarket', priority: 8 },
  { slug: 'costco', name_zh: 'Costco', category: 'supermarket', kb_category: 'supermarket', priority: 9 },
  { slug: 'miacb', name_zh: "Mia C'bon", category: 'supermarket', kb_category: 'supermarket', priority: 7 },
  { slug: 'jasons', name_zh: "Jason's", category: 'supermarket', kb_category: 'supermarket', priority: 7 },

  // ── night market (food items, single virtual brand) ──
  { slug: 'night-market-tw', name_zh: '台灣夜市', category: 'night_market', kb_category: 'night_market', priority: 9 },
]

export const KB_CATEGORIES = [
  'convenience', 'breakfast', 'coffee', 'bubbletea', 'fastfood', 'japanese',
  'bento', 'hotpot', 'bbq', 'noodles', 'thai', 'korean', 'american',
  'healthy', 'desserts', 'supermarket', 'night_market',
] as const

export type KbCategory = (typeof KB_CATEGORIES)[number]

export function brandsByCategory(cat: KbCategory): BrandEntry[] {
  return BRAND_REGISTRY.filter(b => b.kb_category === cat)
}

export function allTargetBrandNames(): string[] {
  return BRAND_REGISTRY.map(b => b.name_zh)
}
