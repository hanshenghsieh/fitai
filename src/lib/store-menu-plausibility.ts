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
]

const VEG_OK_KB = new Set(['convenience', 'bento', 'japanese', 'healthy', 'hotpot', 'supermarket', 'nightmarket', 'chinese'])

/** 連鎖品牌是否可能賣燙青菜／沙拉 */
function fastFoodAllowsVeg(store: string): boolean {
  return /Subway|摩斯|麥當勞|肯德基|漢堡王/i.test(store)
}

/**
 * 過濾 bulk 腳本誤標：Subway 不賣煎餃、Texas Roadhouse 不賣味噌湯等。
 */
export function isPlausibleBrandItem(item: ConvenienceItem): boolean {
  const kb = brandKbForStore(item.store)
  if (!kb) return true

  const name = item.name

  if (/燙青菜|燙時蔬|時蔬/.test(name)) {
    if (kb === 'fastfood') return fastFoodAllowsVeg(item.store)
    return VEG_OK_KB.has(kb)
  }

  if (/沙拉/.test(name) && kb === 'fastfood') {
    return fastFoodAllowsVeg(item.store)
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
