import { brandsByCategory } from './food-kb/brand-registry'

/** 手搖飲 / 咖啡品牌 — 與 brand-registry 同步 */
export const DRINK_STORE_NAMES = new Set([
  ...brandsByCategory('bubbletea').map(b => b.name_zh),
  ...brandsByCategory('coffee').map(b => b.name_zh),
  'CoCo', '50嵐', '清心', '迷客夏', '茶湯會', '可不可', '大苑子', '春水堂',
])

export function isDrinkStore(store: string): boolean {
  if (DRINK_STORE_NAMES.has(store)) return true
  for (const name of DRINK_STORE_NAMES) {
    if (store.includes(name) || name.includes(store)) return true
  }
  return false
}
