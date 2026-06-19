import type { ConvenienceItem, ItemRole } from './convenience-store-menu'

export type PortionId = 'full' | 'three_quarter' | 'half'

export interface PortionOption {
  id: PortionId
  label: string
  multiplier: number
}

export const PORTION_OPTIONS: PortionOption[] = [
  { id: 'full', label: '全份', multiplier: 1 },
  { id: 'three_quarter', label: '七成五', multiplier: 0.75 },
  { id: 'half', label: '半份', multiplier: 0.5 },
]

export interface SelectedEatOutItem {
  item: ConvenienceItem
  portion: PortionId
}

export interface ComboTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  price: number
}

export interface ComboValidation {
  valid: boolean
  totals: ComboTotals
  issues: string[]
  tips: string[]
}

const MEAL_RATIOS = { breakfast: 0.25, lunch: 0.4, dinner: 0.35 } as const

export function getItemRole(item: ConvenienceItem): ItemRole {
  return item.role ?? 'combo'
}

const BEVERAGE_STORES = new Set(['CoCo', '50嵐', '清心', '迷客夏', '茶湯會', '春水堂', '可不可', '大苑子'])

/** 手搖飲、純茶名（無主食關鍵字） */
const TEA_DRINK_NAMES = /鐵觀音|烏龍|四季春|青茶|紅茶|綠茶|花茶|普洱|金萱|凍頂|阿里山|高山茶|東方美人/

/** 茶飲店裡的固體餐點關鍵字 */
const SOLID_AT_TEA_STORE = /麵|飯|便當|滷|茶葉蛋|豆干|米|雞|牛|豬|排|套餐|點心|蘿蔔糕|抄手|水餃|燻雞/

/** 手搖飲、茶飲（含誤標為 combo 的品項） */
export function isBeverage(item: ConvenienceItem): boolean {
  if (getItemRole(item) === 'drink') return true
  const n = item.name
  if (/茶葉蛋/.test(n)) return false
  if (TEA_DRINK_NAMES.test(n) && !isFullMealName(n)) return true
  if (/響炮|珍奶|珍珠奶茶|奶茶|檸檬|百香|鮮奶|微糖|半糖|波霸|鮮柚|多多/.test(n)) {
    return !isFullMealName(n)
  }
  if (BEVERAGE_STORES.has(item.store)) {
    if (SOLID_AT_TEA_STORE.test(n) || isFullMealName(n)) return false
    if (item.protein_g < 12 && item.calories < 500) return true
  }
  if ((n.includes('咖啡') || n.includes('奶茶')) && !isFullMealName(n)) return true
  if (n.includes('茶') && !n.includes('茶葉蛋') && !isFullMealName(n) && item.calories < 450 && item.protein_g < 12) {
    return true
  }
  return false
}

/** 非飲料的實體食物 */
export function isSolidFood(item: ConvenienceItem): boolean {
  if (isBeverage(item)) return false
  if (isProteinSide(item)) return true
  if (isStarchMain(item)) return true
  if (getItemRole(item) === 'breakfast') return true
  if (isFullMealName(item.name)) return true
  return item.calories >= 100 && item.protein_g >= 4
}

/** 名稱是否為完整主食（飯、便當、麵等） */
export function isFullMealName(name: string): boolean {
  if (/茶葉蛋|滷蛋|糖心蛋|溫泉蛋|水煮蛋/.test(name)) return false
  return /飯|便當|麵|丼|燴飯|定食|拌飯|炒飯|潛艇堡|堡|三明治/.test(name)
}

/** 小份蛋白質配菜（茶葉蛋、雞胸、沙拉等） */
export function isProteinSide(item: ConvenienceItem): boolean {
  const role = getItemRole(item)
  if (role === 'protein' || role === 'side') return true
  if (/茶葉蛋|滷蛋|糖心蛋|溫泉蛋|水煮蛋/.test(item.name)) return true
  if (/雞胸/.test(item.name) && item.calories < 280 && !/飯|便當|麵|丼|餐盒/.test(item.name)) return true
  if (/沙拉/.test(item.name) && item.calories < 320) return true
  if (/青菜|花椰|豆腐|優格|蘋果|香蕉/.test(item.name) && item.calories < 200) return true
  return item.calories < 150 && item.protein_g >= 4 && !isFullMealName(item.name)
}

/** 一餐只能有一份的主食（便當、飯麵、套餐） */
export function isStarchMain(item: ConvenienceItem): boolean {
  if (isBeverage(item)) return false
  const role = getItemRole(item)
  if (role === 'drink' || role === 'side') return false
  if (isProteinSide(item)) return false

  if (role === 'carb' || role === 'main') return true
  if (isFullMealName(item.name)) return true
  if (role === 'combo') {
    return item.calories >= 180 || isFullMealName(item.name)
  }
  if (item.source === 'convenience' && item.calories >= 220) return true
  return item.calories >= 280
}

/** 可與主食搭配的配菜候選 */
export function isSideCandidate(item: ConvenienceItem, mainStore?: string): boolean {
  if (isStarchMain(item)) return false
  if (isBeverage(item)) return false
  if (!isProteinSide(item) && item.protein_g < 4) return false
  if (mainStore && item.source === 'convenience' && item.store !== mainStore) return false
  return true
}

export function isPortionable(item: ConvenienceItem): boolean {
  if (item.portionable) return true
  return (item.tags ?? []).some(t => ['rice', 'noodle', 'starch', 'fries'].includes(t))
}

export function portionMultiplier(portion: PortionId): number {
  return PORTION_OPTIONS.find(p => p.id === portion)?.multiplier ?? 1
}

export function portionLabel(portion: PortionId): string {
  return PORTION_OPTIONS.find(p => p.id === portion)?.label ?? '全份'
}

export function applyPortion(item: ConvenienceItem, portion: PortionId): ConvenienceItem & { displayName: string } {
  const m = portionMultiplier(portion)
  const label = portionLabel(portion)
  const suffix = m === 1 ? '' : `（${label}）`
  return {
    ...item,
    name: `${item.name}${suffix}`,
    displayName: `${item.name}${suffix}`,
    calories: Math.round(item.calories * m),
    protein_g: Math.round(item.protein_g * m * 10) / 10,
    carbs_g: Math.round(item.carbs_g * m * 10) / 10,
    fat_g: Math.round(item.fat_g * m * 10) / 10,
    price: Math.round(item.price * m),
  }
}

export function calcComboTotals(selected: SelectedEatOutItem[]): ComboTotals {
  return selected.reduce(
    (acc, s) => {
      const p = applyPortion(s.item, s.portion)
      return {
        calories: acc.calories + p.calories,
        protein_g: acc.protein_g + p.protein_g,
        carbs_g: acc.carbs_g + p.carbs_g,
        fat_g: acc.fat_g + p.fat_g,
        price: acc.price + p.price,
      }
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, price: 0 }
  )
}

/** 組合規則：套餐不可混搭；其餘依角色限制數量 */
export function canAddItem(selected: SelectedEatOutItem[], candidate: ConvenienceItem): { ok: boolean; reason?: string } {
  if (selected.length >= 6) return { ok: false, reason: '每餐最多 6 項' }
  if (selected.some(s => s.item.id === candidate.id)) return { ok: false, reason: '已在組合中' }

  const roles = selected.map(s => getItemRole(s.item))
  const role = getItemRole(candidate)

  if (isStarchMain(candidate) && selected.some(s => isStarchMain(s.item))) {
    return { ok: false, reason: '主食（便當/飯麵）一餐只能一份' }
  }

  if (roles.includes('combo') || role === 'combo') {
    if (selected.length > 0 && role === 'combo' && isStarchMain(candidate)) {
      return { ok: false, reason: '套餐請單獨選擇，不可與其他品項混搭' }
    }
    if (selected.some(s => getItemRole(s.item) === 'combo' && isStarchMain(s.item)) && selected.length > 0) {
      return { ok: false, reason: '已選套餐，請移除後再搭配其他品項' }
    }
  }

  const countRole = (r: ItemRole) => roles.filter(x => x === r).length
  if ((role === 'main' || role === 'protein') && countRole('main') + countRole('protein') >= 2) {
    return { ok: false, reason: '主餐/蛋白質最多 2 項' }
  }
  if (role === 'carb' && countRole('carb') >= 1) return { ok: false, reason: '主食（飯麵）最多 1 項' }
  if (role === 'drink' && countRole('drink') >= 1) return { ok: false, reason: '飲料最多 1 項' }
  if (role === 'side' && countRole('side') >= 3) return { ok: false, reason: '配菜最多 3 項' }

  // 連鎖店：建議同店（不硬性擋，validate 時提示）
  return { ok: true }
}

export function validateEatOutCombo(
  selected: SelectedEatOutItem[],
  mealType: 'breakfast' | 'lunch' | 'dinner',
  dailyTargets: { calories: number; protein_g: number }
): ComboValidation {
  const issues: string[] = []
  const tips: string[] = []

  if (selected.length === 0) {
    return {
      valid: false,
      totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, price: 0 },
      issues: ['請至少選擇 1 項'],
      tips: ['可先選系統推薦，再微調份量'],
    }
  }

  const totals = calcComboTotals(selected)
  const targetCal = Math.round(dailyTargets.calories * MEAL_RATIOS[mealType])
  const targetPro = Math.round(dailyTargets.protein_g * MEAL_RATIOS[mealType])

  const stores = [...new Set(selected.map(s => s.item.store))]
  if (stores.length > 2 && !stores.includes('自助餐組件')) {
    tips.push('建議同一餐盡量同一店家，較符合實際外食情境')
  }

  const calRatio = totals.calories / targetCal
  if (calRatio > 1.1) {
    issues.push(`熱量超出目標約 ${totals.calories - targetCal} kcal`)
    for (const s of selected) {
      if (isPortionable(s.item) && s.portion === 'full') {
        const half = applyPortion(s.item, 'half')
        const saved = totals.calories - half.calories
        if (saved > 30) {
          tips.push(`${s.item.name} 改半份約可少 ${Math.round(s.item.calories * 0.5)} kcal`)
        }
      }
    }
    const drink = selected.find(s => getItemRole(s.item) === 'drink')
    if (drink) tips.push('飲料改無糖茶或白水可再降熱量')
    const carb = selected.find(s => getItemRole(s.item) === 'carb' || (s.item.tags?.includes('rice') ?? false))
    if (carb && carb.portion === 'full') tips.push('白飯吃半碗是外食減脂最常見做法')
  } else if (calRatio < 0.8) {
    issues.push(`熱量低於目標約 ${targetCal - totals.calories} kcal`)
    tips.push('可加茶葉蛋、滷蛋或燙青菜補蛋白質與飽足感')
    tips.push('若運動日可適度加一份主食')
  }

  if (totals.protein_g < targetPro * 0.75) {
    tips.push(`蛋白質偏低（目標約 ${targetPro}g），建議加雞胸、茶葉蛋或豆腐`)
  }

  const fried = selected.filter(s => s.item.name.includes('炸') || s.item.name.includes('咔啦'))
  if (fried.length >= 2) tips.push('同一餐炸物較多，建議去皮或改烤製品項')

  const valid = issues.length === 0 || (calRatio >= 0.85 && calRatio <= 1.1 && totals.protein_g >= targetPro * 0.7)

  return { valid, totals, issues, tips }
}

export function selectedToDisplayItems(selected: SelectedEatOutItem[]) {
  return selected.map(s => applyPortion(s.item, s.portion))
}

export function serializeCustomCombo(selected: SelectedEatOutItem[]) {
  return selected.map(s => ({ id: s.item.id, portion: s.portion }))
}

export function deserializeCustomCombo(
  raw: { id: string; portion: PortionId }[],
  menu: ConvenienceItem[]
): SelectedEatOutItem[] {
  return raw
    .map(r => {
      const item = menu.find(m => m.id === r.id)
      return item ? { item, portion: r.portion ?? 'full' } : null
    })
    .filter((x): x is SelectedEatOutItem => x !== null)
}

/** 外食顯示店名：外送品項附平台，其餘顯示品牌 */
export function formatEatOutStoreLine(item: Pick<ConvenienceItem, 'store' | 'source' | 'description'>): string {
  if (item.source === 'delivery') {
    const via = item.description?.includes('Uber') ? 'Uber Eats' : item.description?.includes('foodpanda') ? 'foodpanda' : '外送'
    return `${item.store}（${via}）`
  }
  return item.store
}
