import fs from 'fs'
import path from 'path'
import type { OfficialBrandReference, OfficialMenuItem, OfficialReferenceIndex } from './types'

const ONR_DIR = path.join(process.cwd(), 'data', 'food-kb', 'official-reference')

export function normOnrName(name: string): string {
  return name.replace(/\s+/g, '').replace(/（.*?）/g, '').toLowerCase()
}

export function listOnrBrandFiles(dir = ONR_DIR): string[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .sort()
}

export function loadOfficialBrandReference(
  brandIdOrFile: string,
  dir = ONR_DIR
): OfficialBrandReference | null {
  const file = brandIdOrFile.endsWith('.json') ? brandIdOrFile : `${brandIdOrFile}.json`
  const full = path.join(dir, file)
  if (!fs.existsSync(full)) return null
  return JSON.parse(fs.readFileSync(full, 'utf8')) as OfficialBrandReference
}

export function loadOfficialReferenceIndex(dir = ONR_DIR): OfficialReferenceIndex | null {
  const indexPath = path.join(dir, 'index.json')
  if (!fs.existsSync(indexPath)) return null
  return JSON.parse(fs.readFileSync(indexPath, 'utf8')) as OfficialReferenceIndex
}

export function loadAllOfficialReferences(dir = ONR_DIR): OfficialBrandReference[] {
  return listOnrBrandFiles(dir)
    .map(f => loadOfficialBrandReference(f, dir))
    .filter((b): b is OfficialBrandReference => b !== null)
}

export function findOfficialMenuItem(
  store: string,
  name: string,
  refs?: OfficialBrandReference[]
): { brand: OfficialBrandReference; item: OfficialMenuItem } | null {
  const all = refs ?? loadAllOfficialReferences()
  const n = normOnrName(name)
  for (const brand of all) {
    const aliases = brand.metadata.store_aliases
    const canonical = brand.metadata.canonical_name
    if (store !== canonical && !aliases.includes(store)) continue
    for (const item of brand.menu) {
      if (normOnrName(item.name) === n) return { brand, item }
      for (const alias of item.aliases ?? []) {
        if (normOnrName(alias) === n) return { brand, item }
      }
    }
  }
  return null
}

export function officialMenuItemToMacros(item: OfficialMenuItem) {
  return {
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
    fiber: item.fiber ?? null,
    sugar: item.sugar ?? null,
    sodium: item.sodium ?? null,
  }
}

export function buildOfficialMenuIndex(): Map<string, OfficialMenuItem & { brand_id: string; canonical_name: string }> {
  const index = new Map<string, OfficialMenuItem & { brand_id: string; canonical_name: string }>()
  for (const brand of loadAllOfficialReferences()) {
    for (const item of brand.menu) {
      const base = {
        ...item,
        brand_id: brand.metadata.brand_id,
        canonical_name: brand.metadata.canonical_name,
      }
      index.set(`${brand.metadata.canonical_name}::${normOnrName(item.name)}`, base)
      for (const alias of item.aliases ?? []) {
        index.set(`${brand.metadata.canonical_name}::${normOnrName(alias)}`, base)
      }
    }
  }
  return index
}
