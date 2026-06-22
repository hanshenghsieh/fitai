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
  { pattern: /麻辣鍋|石頭火鍋|涮涮鍋|個人鍋/, allowedKb: new Set(['hotpot', 'japanese']) },
  { pattern: /瑪格麗特|夏威夷披薩|披薩（/, allowedKb: new Set(['fastfood']) },
  { pattern: /蛋餅|蘿蔔糕/, allowedKb: new Set(['breakfast', 'fastfood']) },
  { pattern: /牛肉麵|排骨飯|滷肉飯|麻醬麵/, allowedKb: new Set(['noodles', 'bento', 'chinese', 'nightmarket', 'convenience', 'supermarket']) },
]

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

  if (rejectsCafeteriaArchetype(name, kb)) return false

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
