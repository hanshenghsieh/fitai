import { normalizeDishLabel } from './catalog'
import { sortBrandItemsByTrust } from './score'
import type { BrandItem, DishTemplate, DishVariant } from './types'

export type BrandDisplayEntry = BrandItem & {
  isSimilar?: boolean
  displayNote?: string
}

export type BrandDisplayGroup = {
  label: string
  variantId?: string
  items: BrandDisplayEntry[]
}

const FRIED_RE = /炸/
const GRILLED_RE = /烤/
const BRAISED_RE = /滷|魯/

function cookingStyle(name: string): 'fried' | 'grilled' | 'braised' | 'other' {
  if (FRIED_RE.test(name)) return 'fried'
  if (GRILLED_RE.test(name)) return 'grilled'
  if (BRAISED_RE.test(name)) return 'braised'
  return 'other'
}

export function inferVariantIdForBrand(
  itemName: string,
  brandName: string,
  variants: DishVariant[]
): string | undefined {
  const labels = [itemName, `${brandName}${itemName}`, brandName + itemName]
  for (const variant of variants) {
    for (const label of [variant.name, ...variant.aliases]) {
      const normLabel = normalizeDishLabel(label)
      if (!normLabel || normLabel.length < 2) continue
      for (const raw of labels) {
        const norm = normalizeDishLabel(raw)
        if (norm.includes(normLabel)) return variant.id
      }
    }
  }

  const style = cookingStyle(itemName + brandName)
  if (style === 'fried') return variants.find(v => FRIED_RE.test(v.name))?.id
  if (style === 'grilled') return variants.find(v => GRILLED_RE.test(v.name))?.id
  if (style === 'braised') return variants.find(v => BRAISED_RE.test(v.name))?.id
  return undefined
}

function enrichBrandVariantId(brand: BrandItem, variants: DishVariant[]): BrandItem {
  if (brand.variantId) return brand
  const inferred = inferVariantIdForBrand(brand.itemName, brand.brandName, variants)
  return inferred ? { ...brand, variantId: inferred } : brand
}

function isCookingMismatch(selected: DishVariant, brand: BrandItem): boolean {
  const selectedStyle = cookingStyle(selected.name)
  const brandStyle = cookingStyle(brand.itemName + brand.brandName)
  if (selectedStyle === 'fried' || selectedStyle === 'grilled' || selectedStyle === 'braised') {
    if (brandStyle !== 'other' && brandStyle !== selectedStyle) return true
  }
  if (selectedStyle === 'grilled' && brandStyle === 'fried') return true
  if (selectedStyle === 'braised' && brandStyle === 'fried') return true
  return false
}

function defaultNoteForBrand(brand: BrandItem, variant: DishVariant | null): string | undefined {
  if (brand.note) return brand.note
  if (!variant) return undefined
  const style = cookingStyle(brand.itemName)
  if (style === 'other' && /雞腿/.test(brand.itemName) && BRAISED_RE.test(variant.name)) {
    return '估算偏滷'
  }
  return undefined
}

export function resolveBrandDisplayGroups(params: {
  template: DishTemplate
  selectedVariant: DishVariant | null
  variants: DishVariant[]
  brandItems: BrandItem[]
}): BrandDisplayGroup[] {
  const { template, selectedVariant, variants, brandItems } = params
  const enriched = brandItems.map(b => enrichBrandVariantId(b, variants))

  if (selectedVariant) {
    const exact = sortBrandItemsByTrust(
      enriched.filter(b => b.variantId === selectedVariant.id)
    ).map(b => ({ ...b, displayNote: defaultNoteForBrand(b, selectedVariant) }))

    const similar = sortBrandItemsByTrust(
      enriched.filter(
        b =>
          b.variantId !== selectedVariant.id &&
          b.templateId === template.id &&
          !isCookingMismatch(selectedVariant, b)
      )
    ).map(b => ({
      ...b,
      isSimilar: true,
      displayNote: defaultNoteForBrand(b, selectedVariant) ?? '相近選項',
    }))

    const groups: BrandDisplayGroup[] = []
    if (exact.length) {
      groups.push({ label: `${selectedVariant.name}可參考`, variantId: selectedVariant.id, items: exact })
    }
    if (similar.length) {
      groups.push({ label: '相近選項', items: similar })
    }
    return groups
  }

  const byVariant = new Map<string, BrandDisplayEntry[]>()
  const general: BrandDisplayEntry[] = []

  for (const brand of sortBrandItemsByTrust(enriched)) {
    if (brand.variantId) {
      const list = byVariant.get(brand.variantId) ?? []
      list.push({ ...brand, displayNote: defaultNoteForBrand(brand, variants.find(v => v.id === brand.variantId) ?? null) })
      byVariant.set(brand.variantId, list)
    } else {
      general.push({ ...brand, displayNote: `一般${template.name}` })
    }
  }

  const groups: BrandDisplayGroup[] = []
  for (const variant of variants) {
    const items = byVariant.get(variant.id)
    if (items?.length) {
      groups.push({ label: variant.name, variantId: variant.id, items })
    }
  }
  if (general.length) {
    groups.push({ label: `一般${template.name}`, items: general })
  }
  return groups
}

export function flattenBrandDisplayGroups(groups: BrandDisplayGroup[]): BrandDisplayEntry[] {
  return groups.flatMap(g => g.items)
}
