import { allTargetBrandNames } from './food-kb/brand-registry'

let cached: string[] | null = null

/** 品牌名（長名優先匹配）— 從 log 文案解析店名 */
export function diceStoreNames(): string[] {
  if (!cached) cached = allTargetBrandNames().sort((a, b) => b.length - a.length)
  return cached
}

export function storesInText(text: string): string[] {
  const found: string[] = []
  for (const name of diceStoreNames()) {
    if (text.includes(name)) found.push(name)
  }
  return found
}
