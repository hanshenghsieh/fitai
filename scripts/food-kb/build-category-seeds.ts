import fs from 'fs'
import path from 'path'
import { brandsByCategory, KB_CATEGORIES, type KbCategory } from '@/lib/food-kb/brand-registry'
import { slugify } from '@/lib/food-kb/normalize'
import { CATEGORY_TEMPLATES } from './seed-templates'
import { BRAND_ITEM_CATALOG } from './catalog'

export interface RuntimeMenuItem {
  id: string
  name: string
  store: string
  source: 'convenience' | 'chain' | 'delivery'
  category: 'breakfast' | 'lunch' | 'dinner'
  role: string
  portionable: boolean
  tags: string[]
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  sugar_g?: number
  fiber_g?: number
  price: number
  photo_url: string
  description: string
  kb_category: string
  aliases?: string[]
}

const OUT_DIR = path.join(process.cwd(), 'scripts', 'food-kb', 'seeds', 'generated')

function inferSource(cat: string): 'convenience' | 'chain' | 'delivery' {
  if (cat === 'convenience') return 'convenience'
  return 'chain'
}

function tplToItem(
  brand: { slug: string; name_zh: string },
  tpl: (typeof CATEGORY_TEMPLATES)[string][number],
  cat: string
): RuntimeMenuItem {
  return {
    id: slugify(`${brand.slug}-${tpl.name}`),
    name: tpl.name,
    store: brand.name_zh,
    source: inferSource(cat),
    category: tpl.meal_category,
    role: tpl.role ?? 'combo',
    portionable: false,
    tags: [...(tpl.tags ?? []), cat],
    calories: tpl.calories,
    protein_g: tpl.protein_g,
    carbs_g: tpl.carbs_g,
    fat_g: tpl.fat_g,
    sugar_g: tpl.sugar_g,
    fiber_g: tpl.fiber_g,
    price: tpl.price,
    photo_url: '',
    description: `${brand.name_zh} · ${tpl.name} · 估計營養（待交叉驗證）`,
    kb_category: cat,
    aliases: tpl.aliases,
  }
}

export function buildCategoryItems(cat: KbCategory): RuntimeMenuItem[] {
  const templates = CATEGORY_TEMPLATES[cat]
  if (!templates) return []

  const brands = brandsByCategory(cat)
  const items: RuntimeMenuItem[] = []
  const seenIds = new Set<string>()

  for (const brand of brands) {
    const catalog = BRAND_ITEM_CATALOG[brand.slug] ?? []
    if (catalog.length > 0) {
      for (const tpl of catalog) {
        const item = tplToItem(brand, tpl, cat)
        if (!seenIds.has(item.id)) {
          items.push(item)
          seenIds.add(item.id)
        }
      }
    } else {
      for (const tpl of templates) {
        const item = tplToItem(brand, tpl, cat)
        if (!seenIds.has(item.id)) {
          items.push(item)
          seenIds.add(item.id)
        }
      }
    }
  }
  return items
}

export function buildAllCategorySeeds(categories?: KbCategory[]): {
  byCategory: Record<string, RuntimeMenuItem[]>
  total: number
} {
  const cats = categories ?? [...KB_CATEGORIES]
  const byCategory: Record<string, RuntimeMenuItem[]> = {}
  let total = 0
  for (const cat of cats) {
    const items = buildCategoryItems(cat)
    byCategory[cat] = items
    total += items.length
  }
  return { byCategory, total }
}

function main() {
  const args = process.argv.slice(2)
  let categories: KbCategory[] | undefined
  const catIdx = args.indexOf('--category')
  if (catIdx >= 0 && args[catIdx + 1]) {
    categories = args[catIdx + 1]!.split(',').map(s => s.trim()) as KbCategory[]
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const { byCategory, total } = buildAllCategorySeeds(categories)

  for (const [cat, items] of Object.entries(byCategory)) {
    const outPath = path.join(OUT_DIR, `${cat}.json`)
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2))
    console.log(`  ✓ ${cat}: ${items.length} items → ${outPath}`)
  }

  const catalogBrands = Object.keys(BRAND_ITEM_CATALOG).length
  const manifest = {
    generated_at: new Date().toISOString(),
    catalog_brands: catalogBrands,
    categories: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, { count: v.length, brands: brandsByCategory(k as KbCategory).length }])
    ),
    total,
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`\n✅ Generated ${total} unique single items (${catalogBrands} brands with dedicated menus)`)
}

main()
