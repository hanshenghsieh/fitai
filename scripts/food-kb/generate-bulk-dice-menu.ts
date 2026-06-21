#!/usr/bin/env npx tsx
/**
 * 產生骰子專用大菜單（目標 5 萬品項）— 品牌 archetype × 尺寸/口味變體
 * 輸出 JSON，runtime 由 dice-menu-pool 載入（不塞進 convenience-store-menu.ts）
 */
import fs from 'fs'
import path from 'path'
import { BRAND_REGISTRY } from '@/lib/food-kb/brand-registry'
import { BRAND_ITEM_CATALOG } from './catalog'
import type { RuntimeMenuItem } from './build-category-seeds'

const OUT = path.join(process.cwd(), 'data', 'food-kb', 'dice-menu-bulk.json')
const TARGET = 50_000

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72)
}

const SIZE_VARIANTS: Array<{ suffix: string; scale: number; priceScale: number }> = [
  { suffix: '', scale: 1, priceScale: 1 },
  { suffix: '（大）', scale: 1.18, priceScale: 1.12 },
  { suffix: '（中）', scale: 0.88, priceScale: 1 },
  { suffix: '（小）', scale: 0.72, priceScale: 0.9 },
]

const FLAVOR_VARIANTS = ['', '·微辣', '·少油', '·少鹽', '·加蛋', '·加菜']

function variantItem(base: RuntimeMenuItem, brandSlug: string, suffix: string, scale: number, priceScale: number, flavor = ''): RuntimeMenuItem | null {
  const name = `${base.name.replace(/（大）|（中）|（小）|（大杯）|（中杯）|（小杯）/g, '')}${suffix}${flavor}`
  if (name === base.name && scale === 1 && !flavor) return null
  const id = slugify(`${brandSlug}-${name}`)
  const h = hash(id)
  const jitter = ((h % 9) - 4) / 100
  const s = scale * (1 + jitter)
  return {
    ...base,
    id,
    name,
    calories: Math.max(1, Math.round(base.calories * s)),
    protein_g: Math.max(0, Math.round(base.protein_g * s)),
    carbs_g: Math.max(0, Math.round(base.carbs_g * s)),
    fat_g: Math.max(0, Math.round(base.fat_g * s)),
    price: Math.max(10, Math.round(base.price * priceScale * (1 + (h % 5) / 100))),
    description: `${base.store} · ${name} · 骰子變體（交叉配對用）`,
    role: base.role,
    tags: [...(base.tags ?? []), 'dice_variant'],
  }
}

function main() {
  const rows: RuntimeMenuItem[] = []
  const seen = new Set<string>()

  for (const brand of BRAND_REGISTRY) {
    const bases = BRAND_ITEM_CATALOG[brand.slug] ?? []
    for (const base of bases) {
      const core: RuntimeMenuItem = {
        id: slugify(`${brand.slug}-${base.name}`),
        name: base.name,
        store: brand.name_zh,
        source: brand.kb_category === 'convenience' ? 'convenience' : 'chain',
        category: base.meal_category ?? 'lunch',
        role: base.role ?? 'combo',
        portionable: false,
        tags: base.tags ?? [brand.kb_category],
        calories: base.calories,
        protein_g: base.protein_g,
        carbs_g: base.carbs_g,
        fat_g: base.fat_g,
        sugar_g: base.sugar_g,
        price: base.price,
        photo_url: '',
        description: `${brand.name_zh} · ${base.name}`,
        kb_category: brand.kb_category,
        aliases: base.aliases,
      }

      const push = (item: RuntimeMenuItem | null) => {
        if (!item || seen.has(item.id)) return
        seen.add(item.id)
        rows.push(item)
      }

      push(core)

      const isDrink = base.role === 'drink' || /茶|咖啡|奶茶|汁|飲/.test(base.name)
      const sizeVars = isDrink ? SIZE_VARIANTS : SIZE_VARIANTS.slice(0, 3)
      const flavorVars = isDrink ? ['', '·半糖', '·微糖', '·無糖'] : FLAVOR_VARIANTS.slice(0, 4)

      for (const sz of sizeVars) {
        for (const fv of flavorVars) {
          if (rows.length >= TARGET) break
          push(variantItem(core, brand.slug, sz.suffix, sz.scale, sz.priceScale, fv))
        }
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(rows))
  const stores = new Set(rows.map(r => r.store))
  console.log(`✅ 骰子 bulk 菜單: ${rows.length} 品項 · ${stores.size} 品牌 → ${OUT}`)
}

main()
