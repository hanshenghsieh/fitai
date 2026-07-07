import seed from '../../../../data/recommendation/dish-catalog-seed.json'
import { BRAND_EXTENSIONS } from './brand-extensions'
import { VARIANT_EXTENSIONS } from './variant-factory'
import type { BrandItem, DishCatalogSeed, DishTemplate, DishVariant } from './types'

function normalizeLabel(label: string): string {
  return label
    .replace(/[（(].*?[)）]/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[^\u4e00-\u9fffA-Za-z0-9+]/g, '')
    .trim()
    .toLowerCase()
}

const REQUIRES_VARIANT_TEMPLATE_IDS = new Set([
  'dish_hot_pot',
  'dish_lu_wei',
  'dish_salt_chicken',
  'dish_teppanyaki',
  'dish_buffet_bento',
  'dish_egg_pancake',
  'dish_rice_ball',
  'dish_subway_chicken',
  'dish_cv_chicken_meal',
  'dish_salad_meal',
  'dish_sweet_potato_egg',
  'dish_chicken_breast_bento',
])

function mergeVariants(seedVariants: DishVariant[]): DishVariant[] {
  const byId = new Map<string, DishVariant>()
  for (const v of seedVariants) byId.set(v.id, v)
  for (const v of VARIANT_EXTENSIONS) {
    if (!byId.has(v.id)) byId.set(v.id, v)
  }
  return [...byId.values()]
}

function mergeBrandItems(seedBrands: BrandItem[]): BrandItem[] {
  const byId = new Map<string, BrandItem>()
  for (const b of seedBrands) byId.set(b.id, b)
  for (const b of BRAND_EXTENSIONS) byId.set(b.id, b)
  return [...byId.values()]
}

function patchTemplates(templates: DishTemplate[]): DishTemplate[] {
  return templates.map(t =>
    REQUIRES_VARIANT_TEMPLATE_IDS.has(t.id) ? { ...t, requiresVariant: true } : t
  )
}

function buildCatalog() {
  const data = seed as DishCatalogSeed
  const templates = patchTemplates(data.templates)
  const variants = mergeVariants(data.variants)
  const brandItems = mergeBrandItems(data.brandItems)

  const templatesById = new Map<string, DishTemplate>()
  const variantsById = new Map<string, DishVariant>()
  const brandsById = new Map<string, BrandItem>()
  const variantsByTemplate = new Map<string, DishVariant[]>()
  const brandsByTemplate = new Map<string, BrandItem[]>()
  const labelIndex = new Map<string, { kind: 'template' | 'variant' | 'brand'; id: string }>()

  for (const t of templates) {
    templatesById.set(t.id, t)
    for (const label of [t.name, ...t.aliases]) {
      const norm = normalizeLabel(label)
      if (norm && !labelIndex.has(norm)) labelIndex.set(norm, { kind: 'template', id: t.id })
    }
  }

  for (const v of variants) {
    variantsById.set(v.id, v)
    const list = variantsByTemplate.get(v.templateId) ?? []
    list.push(v)
    variantsByTemplate.set(v.templateId, list)
    for (const label of [v.name, ...v.aliases]) {
      const norm = normalizeLabel(label)
      if (norm && !labelIndex.has(norm)) labelIndex.set(norm, { kind: 'variant', id: v.id })
    }
  }

  for (const b of brandItems) {
    brandsById.set(b.id, b)
    if (b.templateId) {
      const list = brandsByTemplate.get(b.templateId) ?? []
      list.push(b)
      brandsByTemplate.set(b.templateId, list)
    }
    for (const label of [b.brandName + b.itemName, `${b.brandName}${b.itemName}`, ...b.aliases]) {
      const norm = normalizeLabel(label)
      if (norm && !labelIndex.has(norm)) labelIndex.set(norm, { kind: 'brand', id: b.id })
    }
  }

  return {
    templates,
    templatesById,
    variantsById,
    brandsById,
    variantsByTemplate,
    brandsByTemplate,
    labelIndex,
    normalizeLabel,
  }
}

const catalog = buildCatalog()

export function getDishTemplates(): DishTemplate[] {
  return catalog.templates
}

export function getDishTemplateById(id: string): DishTemplate | null {
  return catalog.templatesById.get(id) ?? null
}

export function getDishVariantById(id: string): DishVariant | null {
  return catalog.variantsById.get(id) ?? null
}

export function getBrandItemById(id: string): BrandItem | null {
  return catalog.brandsById.get(id) ?? null
}

export function getVariantsForTemplate(templateId: string): DishVariant[] {
  return catalog.variantsByTemplate.get(templateId) ?? []
}

export function getBrandItemsForTemplate(templateId: string): BrandItem[] {
  return catalog.brandsByTemplate.get(templateId) ?? []
}

export function resolveDishByLabel(label: string): {
  template?: DishTemplate
  variant?: DishVariant
  brandItem?: BrandItem
} {
  const norm = catalog.normalizeLabel(label)
  if (!norm) return {}
  const hit = catalog.labelIndex.get(norm)
  if (!hit) return {}
  if (hit.kind === 'template') return { template: getDishTemplateById(hit.id) ?? undefined }
  if (hit.kind === 'variant') {
    const variant = getDishVariantById(hit.id) ?? undefined
    const template = variant ? getDishTemplateById(variant.templateId) ?? undefined : undefined
    return { template, variant }
  }
  const brandItem = getBrandItemById(hit.id) ?? undefined
  const template = brandItem?.templateId ? getDishTemplateById(brandItem.templateId) ?? undefined : undefined
  const variant = brandItem?.variantId ? getDishVariantById(brandItem.variantId) ?? undefined : undefined
  return { template, variant, brandItem }
}

export { normalizeLabel as normalizeDishLabel }
