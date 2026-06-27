import type { ConvenienceItem } from './convenience-store-menu'
import { BRAND_REGISTRY } from './food-kb/brand-registry'

function brandKbForStore(store: string): string | null {
  const hit = BRAND_REGISTRY.find(b => b.name_zh === store)
  return hit?.kb_category ?? null
}

/** Mega-expand 模板菜 — 只應出現在特定菜系品牌 */
const DISH_FAMILY_RULES: { pattern: RegExp; allowedKb: Set<string> }[] = [
  { pattern: /煎餃|鍋貼|水餃|餃子|小籠包/, allowedKb: new Set(['breakfast', 'japanese', 'nightmarket', 'chinese', 'bento']) },
  { pattern: /溫泉蛋|味噌|泡菜|溫野菜|茶碗蒸|丼飯/, allowedKb: new Set(['japanese', 'hotpot', 'bento']) },
  { pattern: /握壽司|壽司拼盤|軍艦|刺身|生魚片|壽司郎/, allowedKb: new Set(['japanese']) },
  { pattern: /潛艇堡/, allowedKb: new Set(['fastfood']) },
  { pattern: /(?:經典|雙層)?牛肉堡|雞腿堡|咔啦脆雞堡|脆雞堡|麥香雞/, allowedKb: new Set(['fastfood', 'breakfast']) },
  { pattern: /雞塊（\d+塊）|^蛋塔/, allowedKb: new Set(['fastfood']) },
  { pattern: /(?:豚骨|味噌|醬油|鹽味|沾)拉麵|拉麵（/, allowedKb: new Set(['noodles', 'japanese']) },
  { pattern: /^(?:牛|親子|海鮮|燒肉|滑)丼|丼（中）/, allowedKb: new Set(['japanese']) },
  { pattern: /石鍋拌飯/, allowedKb: new Set(['korean']) },
  { pattern: /麻辣鍋|石頭火鍋|涮涮鍋|個人鍋/, allowedKb: new Set(['hotpot', 'japanese']) },
  { pattern: /瑪格麗特|夏威夷披薩|披薩（/, allowedKb: new Set(['fastfood']) },
  { pattern: /蛋餅|蘿蔔糕/, allowedKb: new Set(['breakfast', 'fastfood']) },
  { pattern: /牛肉麵|排骨飯|滷肉飯|麻醬麵/, allowedKb: new Set(['noodles', 'bento', 'chinese', 'nightmarket', 'convenience', 'supermarket']) },
  { pattern: /咖哩(?:豬排|雞)飯/, allowedKb: new Set(['japanese', 'fastfood']) },
  { pattern: /烤雞沙拉碗/, allowedKb: new Set(['fastfood', 'healthy']) },
]

/** 日式炸豬排專賣 — 不賣漢堡、拉麵、丼飯等 bulk 模板 */
const TONKATSU_BRANDS = new Set(['福勝亭', '勝博殿', '杏子豬排'])

function isTonkatsuPlausibleName(name: string): boolean {
  return (
    /豬排|猪排|定食|炸蝦|腰內|里肌|海老|唐揚|味噌|高麗菜|溫野菜|茶碗蒸|咖哩/.test(name) ||
    CAFETERIA_SIDE.test(name) ||
    /沙拉|飲|茶|咖啡|可樂|豆漿|果汁|牛奶|拿鐵|無糖|泡菜|燙/.test(name)
  )
}

const VEG_OK_KB = new Set(['convenience', 'bento', 'japanese', 'healthy', 'hotpot', 'supermarket', 'nightmarket', 'chinese'])

/** bulk 腳本套用到所有品牌的自助餐配菜名稱 */
const CAFETERIA_SIDE = /^白飯|^滷蛋|^燙青菜|^燙時蔬|^凱薩沙拉|^蒜香麵包/

/** 麵食品牌不該出現的速食配菜 */
const FASTFOOD_SIDE_ON_NOODLES = /雞塊（\d+塊）|^蛋塔|^凱薩沙拉|上校雞塊|麥克雞塊|咔啦脆雞（\d+塊）/

/** 早餐店專屬品項誤標到咖啡廳 */
const BREAKFAST_ARCHETYPE = /^薯餅|^油條|^燒餅|^蛋餅|^蘿蔔糕|^米漿/

/** 連鎖 bulk 鹹味變體（手搖甜度 ·半糖 等不在此列） */
function hasSavoryBulkSuffix(name: string): boolean {
  return /\s*·\s*(微辣|少油|少鹽|加蛋|加菜)$/.test(name)
}

/** 品項只屬於特定品牌（bulk 誤標） */
const DISH_EXCLUSIVE_STORE: { pattern: RegExp; stores: Set<string> }[] = [
  { pattern: /^酸辣湯$|鍋貼套餐.*酸辣湯/, stores: new Set(['八方雲集', '鼎泰豐', '非常泰', '泰愛泰']) },
  { pattern: /^鍋貼（\d+顆）$|^水餃（\d+顆）$/, stores: new Set(['八方雲集', '八方雲集 Dumplings', '三商巧福']) },
]

/** 品牌專屬禁止品項（官方菜單沒有、bulk 模板誤植） */
const BRAND_DENY_PATTERNS: Record<string, RegExp[]> = {
  肯德基: [
    /香雞飯|雞腿飯|原味雞腿飯|卡洛卡羅|牛肉麵|排骨飯|滷肉飯|麻醬|炸醬|水餃|鍋貼|粥|丼|拉麵|親子丼|咖哩|炸豬排|紅燒/,
  ],
  三商巧福: [
    /酸辣湯|漢堡|咔啦|蛋塔|薯條|雞塊|上校|麥克|披薩|握壽司|壽司拼盤|海鮮丼|夏威夷|親子丼|咖哩豬排|炸豬排定食|可樂（中杯）|拿鐵（中杯）/,
  ],
  麥當勞: [/牛肉麵|排骨飯|滷肉飯|麻醬|炸醬|水餃|鍋貼|拉麵|親子丼|咖哩豬排|紅燒牛肉麵/],
  摩斯漢堡: [/牛肉麵|排骨飯|滷肉飯|麻醬|炸醬|水餃|鍋貼|拉麵|親子丼|香雞飯/],
}

const FASTFOOD_RICE_NOODLE =
  /香雞飯|雞腿飯|牛肉麵|排骨飯|滷肉飯|麻醬麵|炸醬麵|水餃|鍋貼|皮蛋瘦肉粥|雞肉粥|燒餅油條|親子丼|牛丼|咖哩豬排|炸豬排定食|紅燒牛肉麵/

function rejectsExclusiveStore(name: string, store: string): boolean {
  for (const rule of DISH_EXCLUSIVE_STORE) {
    if (!rule.pattern.test(name)) continue
    return !rule.stores.has(store)
  }
  return false
}

function rejectsBrandDenylist(name: string, store: string): boolean {
  const patterns = BRAND_DENY_PATTERNS[store]
  if (!patterns?.length) return false
  return patterns.some(re => re.test(name))
}

function rejectsCafeteriaArchetype(name: string, kb: string): boolean {
  if (!CAFETERIA_SIDE.test(name)) return false
  if (kb === 'bento' || kb === 'chinese' || kb === 'convenience' || kb === 'supermarket') return false
  return true
}

/**
 * 過濾 bulk 腳本誤標：肯德基不賣白飯配菜、甜點店不賣牛肉麵等。
 */
export function isPlausibleBrandItem(item: ConvenienceItem): boolean {
  if (item.store === '自助餐組件') return true

  const kb = brandKbForStore(item.store)
  if (!kb) return true

  const name = item.name

  if (rejectsExclusiveStore(name, item.store)) return false
  if (rejectsBrandDenylist(name, item.store)) return false

  if (kb === 'fastfood' && FASTFOOD_RICE_NOODLE.test(name)) return false

  if (TONKATSU_BRANDS.has(item.store) && !isTonkatsuPlausibleName(name)) return false

  if (rejectsCafeteriaArchetype(name, kb) && !TONKATSU_BRANDS.has(item.store)) return false

  if (kb === 'fastfood' && CAFETERIA_SIDE.test(name)) return false

  if (kb === 'noodles' && FASTFOOD_SIDE_ON_NOODLES.test(name)) return false

  if (item.source === 'chain' && hasSavoryBulkSuffix(name)) return false

  if (kb === 'coffee' && (BREAKFAST_ARCHETYPE.test(name) || /雞排便當|排骨便當|牛肉麵/.test(name))) {
    return false
  }

  if (kb === 'desserts' && /牛肉麵|排骨|便當|堡|披薩|鍋|炸雞|咔啦/.test(name)) return false

  if (/燙青菜|燙時蔬|時蔬/.test(name)) {
    if (kb === 'fastfood') return false
    return VEG_OK_KB.has(kb)
  }

  if (/沙拉/.test(name) && kb === 'fastfood') {
    return /沙拉碗|烤雞沙拉/.test(name)
  }

  for (const rule of DISH_FAMILY_RULES) {
    if (!rule.pattern.test(name)) continue
    return rule.allowedKb.has(kb)
  }

  return true
}

/** 同一餐所有固體食物應來自同一品牌（飲料可例外便利商店） */
export function isSameStoreMeal(items: ConvenienceItem[]): boolean {
  if (items.length <= 1) return true
  const solids = items.filter(i => !/可樂|雪碧|紅茶|綠茶|咖啡|豆漿|奶茶|鮮奶|飲料/.test(i.name) || i.calories > 30)
  const stores = [...new Set(solids.map(i => i.store))]
  return stores.length <= 1
}
