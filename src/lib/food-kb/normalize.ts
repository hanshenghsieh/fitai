/** Normalize Taiwan food names for clustering & search */

const SIZE_TOKENS = ['特大', '超大', '大杯', '中杯', '小杯', '大碗', '中碗', '小碗', '大份', '中份', '小份', '大', '中', '小']
const ICE_TOKENS = ['去冰', '微冰', '少冰', '正常冰', '多冰', '熱', '溫', '常溫', '冰', '熱飲', '冰飲']
const NOISE_TOKENS = ['加料', '少糖', '半糖', '微糖', '無糖', '全糖', '正常甜', '少甜', '去糖', '套餐', '單點', '特製']

/** Explicit synonym groups → canonical token */
const SYNONYM_GROUPS: string[][] = [
  ['冰奶茶', '冰奶', '奶茶', '奶綠', '鮮奶茶'],
  ['珍珠奶茶', '波霸奶茶', '粉圓奶茶'],
  ['紅茶', '阿薩姆', '錫蘭紅茶'],
  ['綠茶', '青茶', '茉莉綠茶'],
  ['咖啡', '美式', '美式咖啡'],
  ['拿鐵', 'latte', '那提'],
  ['蛋餅', '蛋煎餅'],
  ['飯糰', '御飯糰', '三角飯糰'],
  ['便當', '盒餐', '餐盒'],
  ['滷肉飯', '魯肉飯'],
  ['雞腿便當', '雞腿飯', '香雞便當'],
  ['牛肉麵', '紅燒牛肉麵', '清燉牛肉麵'],
  ['滷味', '滷味拼盤'],
  ['鹹酥雞', '酥炸雞'],
  ['地瓜球', '甜不辣', '雞排'],
]

const SYNONYM_MAP = new Map<string, string>()
for (const group of SYNONYM_GROUPS) {
  const canonical = group[0]!
  for (const term of group) {
    SYNONYM_MAP.set(normalizeToken(term), canonical)
  }
}

const BRAND_ALIASES: Record<string, string> = {
  '7-11': '7-11',
  '711': '7-11',
  'seveneleven': '7-11',
  '統一超商': '7-11',
  '全家': '全家',
  'familymart': '全家',
  '萊爾富': '萊爾富',
  'hi-life': '萊爾富',
  'ok超商': 'OK超商',
  'okmart': 'OK超商',
  '麥當勞': '麥當勞',
  'mcdonalds': '麥當勞',
  '肯德基': '肯德基',
  'kfc': '肯德基',
  '摩斯': '摩斯漢堡',
  'mosburger': '摩斯漢堡',
  '星巴克': '星巴克',
  'starbucks': '星巴克',
  '五十嵐': '五十嵐',
  '清心福全': '清心福全',
  '迷客夏': '迷客夏',
  '可不可': '可不可',
  '一芳': '一芳水果茶',
  '老虎堂': '老虎堂',
  '鼎泰豐': '鼎泰豐',
  '王品': '王品',
  '瓦城': '瓦城',
  '三商巧福': '三商巧福',
  '八方雲集': '八方雲集',
  '梁社漢': '梁社漢',
  '鬍鬚張': '鬍鬚張',
  'subway': 'Subway',
  '爭鮮': '爭鮮迴轉壽司',
  '爭鮮迴轉壽司': '爭鮮迴轉壽司',
  '爭鮮plus': '爭鮮PLUS',
  '點點心': '點點心',
  '新光三越': '新光三越美食街',
  '微風': '微風廣場美食街',
  'sogo': 'SOGO美食街',
  '京站': '京站美食街',
  '遠東百貨': '遠東百貨美食街',
  '誠品': '誠品生活美食街',
  '四海遊龍': '四海遊龍',
  '丹丹': '丹丹漢堡',
  '路易莎': '路易莎咖啡',
  'cama': 'cama咖啡',
  '85度c': '85度C',
}

function normalizeToken(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '').trim()
}

export function normalizeBrandName(brand?: string): string {
  if (!brand) return 'unknown'
  const key = normalizeToken(brand)
  return BRAND_ALIASES[key] ?? brand.trim()
}

export function normalizeFoodName(name: string): string {
  let s = name
    .replace(/[（(].*?[)）]/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[^\u4e00-\u9fffA-Za-z0-9+]/g, '')
    .trim()

  for (const token of [...SIZE_TOKENS, ...ICE_TOKENS, ...NOISE_TOKENS]) {
    s = s.replace(new RegExp(token, 'g'), '')
  }

  for (const [alias, canonical] of SYNONYM_MAP) {
    if (s.includes(alias)) {
      s = s.replace(alias, canonical)
    }
  }

  return s || name.replace(/\s+/g, '')
}

export function extractSizeVariant(name: string): string | undefined {
  for (const token of SIZE_TOKENS) {
    if (name.includes(token)) return token
  }
  return undefined
}

export function extractIceLevel(name: string): string | undefined {
  for (const token of ICE_TOKENS) {
    if (name.includes(token)) return token
  }
  return undefined
}

/** Stable key for clustering same food across aliases */
export function clusterKey(brand: string, name: string): string {
  const b = normalizeBrandName(brand)
  const n = normalizeFoodName(name)
  return `${b}::${n}`
}

export function expandAliases(name: string, extra: string[] = []): string[] {
  const set = new Set<string>([name, normalizeFoodName(name), ...extra])
  const normalized = normalizeFoodName(name)
  for (const [alias, canonical] of SYNONYM_MAP) {
    if (normalized.includes(canonical) || normalized.includes(alias)) {
      for (const term of SYNONYM_GROUPS.find(g => g.includes(canonical)) ?? []) {
        set.add(term)
        set.add(normalizeFoodName(term))
      }
    }
  }
  return [...set].filter(Boolean)
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function inferBrandType(store: string): import('./types').BrandType {
  const s = store.toLowerCase()
  if (['7-11', '全家', '萊爾富', 'ok超商'].some(b => s.includes(b.toLowerCase()))) return 'convenience'
  if (['五十嵐', '清心', '迷客夏', '可不可', '一芳', '老虎堂', '茶湯', '麻古', '大苑子', 'CoCo'].some(b => store.includes(b))) return 'bubble_tea'
  if (['星巴克', '路易莎', 'cama', '85度', '伯朗'].some(b => store.includes(b))) return 'coffee'
  if (['麥當勞', '肯德基', '摩斯', '丹丹', '漢堡王'].some(b => store.includes(b))) return 'fast_food'
  if (['王品', '瓦城', '三商', '八方', '鬍鬚張', '四海', '梁社漢', '鼎泰豐'].some(b => store.includes(b))) return 'chain_restaurant'
  if (store.includes('自助餐')) return 'buffet'
  if (['uber', 'foodpanda', '熊貓'].some(b => s.includes(b))) return 'delivery_platform'
  return 'other'
}

export function contentHash(obs: {
  source_type: string
  source_name: string
  name: string
  store?: string
  nutrition?: { calories?: number; protein_g?: number }
}): string {
  const payload = [
    obs.source_type,
    obs.source_name,
    obs.store ?? '',
    obs.name,
    obs.nutrition?.calories ?? '',
    obs.nutrition?.protein_g ?? '',
  ].join('|')
  let h = 0
  for (let i = 0; i < payload.length; i++) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0
  }
  return `h${Math.abs(h).toString(36)}`
}
