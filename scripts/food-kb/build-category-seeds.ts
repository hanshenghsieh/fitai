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

export interface DrinkStructuralIssue {
  id: string
  message: string
  severity: 'warning' | 'severe'
}

const STRUCTURALLY_CHECKED_ROLES = new Set(['drink', 'side'])

/**
 * Structural/numerical integrity check on freshly generated output — NOT the
 * production trust gate (placeholder/restaurant-allowlist/macro-band checks
 * stay in menu-confidence-core.ts and are not duplicated here; a placeholder
 * item does not need to pass this). This exists so the exact bug class this
 * generator has now produced twice — once in drink()'s old positional
 * overload, once in side()'s calorie-share-treated-as-grams default formula
 * — fails generation loudly instead of silently writing corrupted seeds
 * that surface as a support ticket months later. Scoped to 'drink' and
 * 'side' roles specifically: those are the two helpers with a fallback
 * default formula that can silently produce an implausible value. meal()
 * takes every macro as a required, explicit argument with no fallback, so
 * it isn't at risk of this specific bug class.
 *
 * Two tiers, on purpose: a ratio outside the production energy-balance band
 * ([0.72, 1.28] from menu-confidence-core.ts — reused, not redefined) is
 * flagged as a warning, since some hand-authored recipes are imprecise
 * without being a mapping bug. A ratio this far off (< 0.4 or > 2.2) has no
 * innocent explanation — it's the exact signature of a swapped/misrouted
 * field or a missing energy-density conversion — and blocks generation.
 */
export function validateGeneratedDrinks(items: RuntimeMenuItem[]): DrinkStructuralIssue[] {
  const issues: DrinkStructuralIssue[] = []
  for (const item of items) {
    if (!STRUCTURALLY_CHECKED_ROLES.has(item.role)) continue
    // tweak() floors calories at 1 for a genuinely free item (e.g. plain
    // unsweetened tea whose base calories is 0), which makes the ratio
    // structurally noisy/meaningless below this floor — not a mapping bug.
    if (item.calories < 10) continue
    const implied = item.protein_g * 4 + item.carbs_g * 4 + item.fat_g * 9
    const ratio = implied / item.calories
    if (ratio < 0.72 || ratio > 1.28) {
      const severe = ratio < 0.4 || ratio > 2.2
      issues.push({
        id: item.id,
        message: `${item.name} (${item.store}): declared ${item.calories}kcal but protein/carbs/fat imply ${Math.round(implied)}kcal (ratio ${ratio.toFixed(2)})`,
        severity: severe ? 'severe' : 'warning',
      })
    }
  }
  return issues
}

function main() {
  const args = process.argv.slice(2)
  let categories: KbCategory[] | undefined
  const catIdx = args.indexOf('--category')
  if (catIdx >= 0 && args[catIdx + 1]) {
    categories = args[catIdx + 1]!.split(',').map(s => s.trim()) as KbCategory[]
  }

  const { byCategory, total } = buildAllCategorySeeds(categories)

  const allItems = Object.values(byCategory).flat()
  const issues = validateGeneratedDrinks(allItems)
  const severe = issues.filter(i => i.severity === 'severe')
  const warnings = issues.filter(i => i.severity === 'warning')
  if (warnings.length > 0) {
    console.warn(`\n⚠ ${warnings.length} drink/side item(s) outside the normal energy-balance band (pre-existing recipe imprecision, not blocking):`)
    for (const w of warnings.slice(0, 20)) console.warn(`  - ${w.id}: ${w.message}`)
    if (warnings.length > 20) console.warn(`  ...and ${warnings.length - 20} more`)
  }
  if (severe.length > 0) {
    console.error(`\n❌ ${severe.length} drink/side item(s) have a severe energy-balance mismatch — this is the exact signature of a drink()/side() argument-mapping or default-formula bug. Generation aborted; NOTHING was written.`)
    for (const s of severe) console.error(`  - ${s.id}: ${s.message}`)
    process.exit(1)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
