#!/usr/bin/env npx tsx
/**
 * Class A deterministic repair for the generate-expanded-menu.mjs bug (see
 * that file's moreChains loop) — carbs_g/fat_g were computed as
 * Math.round(cal * 0.48) / Math.round(cal * 0.22): a calorie-share fraction
 * treated directly as a gram value, never converted through the 4 kcal/g
 * (carbs) / 9 kcal/g (fat) energy density. This produced a ~4x energy
 * mismatch on every one of the 175 items that loop generates (35 brands ×
 * 5 items each — the "~5 corrupted items per brand" signature spanning
 * 頂呱呱/拿坡里/必勝客/達美樂/肯德基/IKEA/Costco/鼎泰豐/瓦城 and more).
 *
 * scripts/restaurant-expanded.json has already been regenerated from the
 * fixed generator (`node scripts/generate-expanded-menu.mjs`). This script
 * propagates the correction id-for-id into the live eatOutMenu, patching
 * only calories/protein_g/carbs_g/fat_g/price — matching this generator's
 * only possible corruption surface, same discipline as the two prior
 * repair scripts this session.
 *
 * IMPORTANT — only patches a record that is CURRENTLY verified corrupted
 * (isNutritionCorrupted). An earlier version of this script patched
 * whenever values merely differed from the regenerated source, which
 * silently clobbered two already-hand-verified 冬瓜茶 records: their id
 * happened to collide with an unrelated coincidentally-same-named item this
 * exact generator also produces (清心/老賴紅茶 both appear independently in
 * generate-expanded-menu.mjs's moreChains list). A record that is already
 * correct must never be touched just because some other source disagrees.
 */
import fs from 'fs'
import path from 'path'
import { eatOutMenu, type ConvenienceItem } from '@/lib/convenience-store-menu'
import { isNutritionCorrupted } from '@/lib/nutrition/menu-nutrition-audit'

const FILE_PATH = path.join(process.cwd(), 'src', 'lib', 'convenience-store-menu.ts')
const EXPANDED_PATH = path.join(process.cwd(), 'scripts', 'restaurant-expanded.json')

interface ExpandedItem {
  id: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  price: number
}

function differs(item: ConvenienceItem, fixed: ExpandedItem): boolean {
  return (
    item.calories !== fixed.calories ||
    item.protein_g !== fixed.protein_g ||
    item.carbs_g !== fixed.carbs_g ||
    item.fat_g !== fixed.fat_g ||
    item.price !== fixed.price
  )
}

function main() {
  const expanded: ExpandedItem[] = JSON.parse(fs.readFileSync(EXPANDED_PATH, 'utf8'))
  const fixedById = new Map(expanded.map(i => [i.id, i]))

  const patches: { id: string; before: Pick<ConvenienceItem, 'protein_g' | 'carbs_g' | 'fat_g'>; after: Pick<ExpandedItem, 'protein_g' | 'carbs_g' | 'fat_g'> }[] = []
  let skippedAlreadyCorrect = 0

  for (const item of eatOutMenu) {
    if (!isNutritionCorrupted(item)) {
      if (fixedById.has(item.id) && differs(item, fixedById.get(item.id)!)) skippedAlreadyCorrect++
      continue
    }
    const fixed = fixedById.get(item.id)
    if (!fixed) continue
    if (!differs(item, fixed)) continue
    const patched = { ...item, ...fixed }
    if (isNutritionCorrupted(patched)) continue // fix doesn't actually resolve it — leave rejected, don't guess
    patches.push({
      id: item.id,
      before: { protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g },
      after: { protein_g: fixed.protein_g, carbs_g: fixed.carbs_g, fat_g: fixed.fat_g },
    })
  }

  console.log(`Records with a deterministic correction available: ${patches.length}`)
  if (skippedAlreadyCorrect > 0) {
    console.log(`Skipped (already correct, id happens to collide with a differently-sourced record): ${skippedAlreadyCorrect}`)
  }
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
    applied++
  }

  if (applied !== patches.length) {
    throw new Error(`Applied ${applied} patches but expected ${patches.length} — id mismatch, aborting without writing`)
  }

  fs.writeFileSync(FILE_PATH, header + JSON.stringify(items, null, 2) + footer)
  console.log(`\n✅ Applied ${applied} corrections to ${FILE_PATH}`)

  const outDir = path.join(process.cwd(), 'scripts', 'food-kb', '.audit-output')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'expanded-menu-repair-patches.json'), JSON.stringify(patches, null, 2))
  console.log(`Patch log: ${path.join(outDir, 'expanded-menu-repair-patches.json')}`)
}

main()
