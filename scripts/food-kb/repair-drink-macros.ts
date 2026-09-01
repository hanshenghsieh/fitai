#!/usr/bin/env npx tsx
/**
 * Class A deterministic repair for drink()/side()-sourced corruption
 * (see catalog/helpers.ts). Covers every kb_category, not just bubbletea,
 * because a single bad row — 米漿/可樂/味噌湯/白飯, etc. — gets rotated by
 * fillBrandCatalog() into many different brands across up to 11 categories.
 * Also covers 'side' role since side()'s calorie-share-as-grams default
 * formula (phase 3 audit) and several copy-pasted literal errors (味噌湯
 * carbs, 白飯 fat) produced the same class of corruption.
 *
 * Scope: for every category, regenerate via the now-fixed generator and
 * compare id-for-id against the live eatOutMenu.
 *
 * IMPORTANT — id collisions are real: two independently-authored sources
 * can slugify to the exact same id for an unrelated item (confirmed: 清心
 * and 老賴紅茶 both legitimately sell their own "冬瓜茶", and
 * generate-expanded-menu.mjs's moreChains list *also* independently
 * generates a same-brand, same-name "冬瓜茶" via a totally different
 * formula — same id, different record). A prior version of this script
 * treated "differs from regenerated source" as license to patch, which
 * clobbered two already-hand-verified 冬瓜茶 records with the wrong
 * formulaic values. The rule now: only trust the regenerated source for a
 * given id if EITHER (a) its macros already match the live record exactly
 * (strong evidence it's genuinely the same record, not a collision), or
 * (b) the live record is currently verified corrupted AND applying the
 * regenerated macros provably resolves that corruption. A record that is
 * already correct is never overwritten just because some other source for
 * the same id disagrees.
 *
 * Never touches: id, name, store, description, source, tags, aliases, or
 * anything the drink() argument-mapping bug could not have corrupted.
 */
import fs from 'fs'
import path from 'path'
import { eatOutMenu, type ConvenienceItem } from '@/lib/convenience-store-menu'
import { buildAllCategorySeeds, type RuntimeMenuItem } from './build-category-seeds'
import { isNutritionCorrupted } from '@/lib/nutrition/menu-nutrition-audit'

const FILE_PATH = path.join(process.cwd(), 'src', 'lib', 'convenience-store-menu.ts')

function differs(item: ConvenienceItem, fixed: RuntimeMenuItem): boolean {
  return (
    item.protein_g !== fixed.protein_g ||
    item.carbs_g !== fixed.carbs_g ||
    item.fat_g !== fixed.fat_g ||
    item.price !== fixed.price ||
    item.category !== fixed.category
  )
}

function macrosMatch(item: ConvenienceItem, fixed: RuntimeMenuItem): boolean {
  return item.protein_g === fixed.protein_g && item.carbs_g === fixed.carbs_g && item.fat_g === fixed.fat_g && item.price === fixed.price
}

function main() {
  const { byCategory } = buildAllCategorySeeds()
  const fixedById = new Map<string, RuntimeMenuItem>()
  for (const items of Object.values(byCategory)) {
    for (const item of items) fixedById.set(item.id, item)
  }

  const patches: {
    id: string
    before: Pick<ConvenienceItem, 'protein_g' | 'carbs_g' | 'fat_g' | 'price' | 'category'>
    after: Pick<ConvenienceItem, 'protein_g' | 'carbs_g' | 'fat_g' | 'price' | 'category'>
  }[] = []
  let skippedPossibleCollision = 0

  for (const item of eatOutMenu) {
    if (item.role !== 'drink' && item.role !== 'side') continue
    const fixed = fixedById.get(item.id)
    if (!fixed) continue
    if (!differs(item, fixed)) continue

    if (macrosMatch(item, fixed)) {
      // Macros already agree — only meal_category differs. Safe: strong
      // evidence this is genuinely the same record, not a collision.
    } else if (isNutritionCorrupted(item)) {
      const patchedMacros = { ...item, protein_g: fixed.protein_g, carbs_g: fixed.carbs_g, fat_g: fixed.fat_g, price: fixed.price }
      if (isNutritionCorrupted(patchedMacros)) continue // doesn't resolve it — don't guess
    } else {
      // Macros differ AND the live record isn't corrupted — this id is
      // most likely a collision between two unrelated sources. Do not
      // trust this "fixed" record for ANY field.
      skippedPossibleCollision++
      continue
    }

    patches.push({
      id: item.id,
      before: { protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g, price: item.price, category: item.category },
      after: { protein_g: fixed.protein_g, carbs_g: fixed.carbs_g, fat_g: fixed.fat_g, price: fixed.price, category: fixed.category },
    })
  }

  if (skippedPossibleCollision > 0) {
    console.log(`Skipped (likely id collision with an unrelated, already-correct record): ${skippedPossibleCollision}`)
  }

  console.log(`Drink records with a deterministic correction available: ${patches.length}`)
  if (patches.length === 0) {
    console.log('Nothing to repair.')
    return
  }

  const patchById = new Map(patches.map(p => [p.id, p.after]))
  const raw = fs.readFileSync(FILE_PATH, 'utf8')
  const marker = 'export const eatOutMenu: ConvenienceItem[] = '
  const arrayStart = raw.indexOf(marker)
  if (arrayStart === -1) throw new Error('Could not locate eatOutMenu array start')
  const jsonStart = raw.indexOf('[', arrayStart + marker.length)
  const footerMarker = '\n\n/** 向後相容別名 */'
  const footerIdx = raw.indexOf(footerMarker)
  if (footerIdx === -1) throw new Error('Could not locate file footer marker')

  const header = raw.slice(0, jsonStart)
  const arrayJson = raw.slice(jsonStart, footerIdx)
  const footer = raw.slice(footerIdx)

  const items: ConvenienceItem[] = JSON.parse(arrayJson)
  let applied = 0
  for (const item of items) {
    const patch = patchById.get(item.id)
    if (!patch) continue
    item.protein_g = patch.protein_g
    item.carbs_g = patch.carbs_g
    item.fat_g = patch.fat_g
    item.price = patch.price
    item.category = patch.category
    applied++
  }

  if (applied !== patches.length) {
    throw new Error(`Applied ${applied} patches but expected ${patches.length} — id mismatch, aborting without writing`)
  }

  fs.writeFileSync(FILE_PATH, header + JSON.stringify(items, null, 2) + footer)
  console.log(`\n✅ Applied ${applied} deterministic drink() corrections to ${FILE_PATH}`)

  const outDir = path.join(process.cwd(), 'scripts', 'food-kb', '.audit-output')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'drink-repair-patches.json'), JSON.stringify(patches, null, 2))
  console.log(`Patch log: ${path.join(outDir, 'drink-repair-patches.json')}`)

  const categoryFlips = patches.filter(p => p.before.category !== p.after.category).length
  const macroOrPriceFixes = patches.filter(
    p => p.before.protein_g !== p.after.protein_g || p.before.carbs_g !== p.after.carbs_g || p.before.fat_g !== p.after.fat_g || p.before.price !== p.after.price
  ).length
  console.log(`  of which meal_category corrected: ${categoryFlips}`)
  console.log(`  of which macro/price corrected: ${macroOrPriceFixes}`)
}

main()
