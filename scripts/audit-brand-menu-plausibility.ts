#!/usr/bin/env npx tsx
/**
 * 全品牌菜單合理性稽核 — 檢查 bulk 誤標是否仍漏進骰子池
 */
import { BRAND_REGISTRY } from '@/lib/food-kb/brand-registry'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { isPlausibleBrandItem } from '@/lib/store-menu-plausibility'
import { isSanitizedMenuItem } from '@/lib/meal-combo-validity'
import { preloadDiceMenuBulk, getDiceMenuPool, getDiceMainPool } from '@/lib/dice-menu-pool'
import { enumerateStoreComboVariants } from '@/lib/meal-combo-engine'
import { isValidMealLines } from '@/lib/meal-combo-validity'
import type { PortionId } from '@/lib/eat-out-builder'

const CAFETERIA = /^白飯|^滷蛋|^燙青菜|^燙時蔬|^凱薩沙拉|^蒜香麵包/
const FASTFOOD_JUNK = /雞塊（\d+塊）|^蛋塔|^凱薩沙拉|上校雞塊|麥克雞塊/
const DISH_FAMILY_CHECKS: { label: string; pattern: RegExp; badKb: Set<string> }[] = [
  { label: '煎餃/鍋貼', pattern: /煎餃|鍋貼|水餃|餃子|小籠包/, badKb: new Set(['fastfood', 'coffee', 'bubbletea', 'desserts', 'bbq', 'thai', 'korean', 'american', 'healthy', 'hotpot']) },
  { label: '壽司', pattern: /握壽司|壽司拼盤|軍艦|刺身|生魚片/, badKb: new Set(['fastfood', 'coffee', 'bubbletea', 'noodles', 'bento', 'thai', 'korean', 'american', 'healthy', 'hotpot', 'bbq']) },
  { label: '潛艇堡', pattern: /潛艇堡/, badKb: new Set(['japanese', 'noodles', 'bento', 'coffee', 'bubbletea', 'hotpot', 'bbq', 'thai', 'korean', 'healthy', 'desserts']) },
  { label: '披薩', pattern: /瑪格麗特|夏威夷披薩|披薩（/, badKb: new Set(['japanese', 'noodles', 'bento', 'coffee', 'bubbletea', 'hotpot', 'bbq', 'thai', 'korean', 'healthy', 'desserts']) },
  { label: '麻辣鍋', pattern: /麻辣鍋|石頭火鍋|涮涮鍋|個人鍋/, badKb: new Set(['fastfood', 'coffee', 'bubbletea', 'desserts', 'bbq', 'thai', 'korean', 'american', 'healthy', 'noodles']) },
  { label: '蛋餅', pattern: /蛋餅|蘿蔔糕/, badKb: new Set(['japanese', 'hotpot', 'bbq', 'thai', 'korean', 'american', 'healthy', 'desserts', 'noodles']) },
]
const FLAVOR_SUFFIX = /\s*·\s*(微辣|少油|少鹽|加蛋|加菜)$/
const SOLID_MEAL = /飯|麵|堡|排|鍋|便當|套餐|沙拉碗|丼|壽司|披薩|炸雞/

function kbMap() {
  return new Map(BRAND_REGISTRY.map(b => [b.name_zh, b.kb_category]))
}

function passesFilter(item: typeof eatOutMenu[0]) {
  return (
    item.category === 'lunch' &&
    isSanitizedMenuItem(item, { allowBeverages: true }) &&
    isPlausibleBrandItem(item)
  )
}

async function main() {
  await preloadDiceMenuBulk()
  const pool = getDiceMenuPool('lunch')
  const kb = kbMap()

  const issues: { severity: 'error' | 'warn'; brand: string; kb: string; kind: string; samples: string[] }[] = []

  for (const brand of BRAND_REGISTRY) {
    const store = brand.name_zh
    const cat = brand.kb_category
    const raw = eatOutMenu.filter(i => i.store === store && i.category === 'lunch')
    const blocked = raw.filter(i => !isPlausibleBrandItem(i))
    const inPool = pool.filter(i => i.store === store)
    const mains = getDiceMainPool('lunch').filter(i => i.store === store)

    // 1. 自助餐配菜仍在池中
    if (!['bento', 'chinese', 'convenience', 'supermarket'].includes(cat)) {
      const cafeteriaInPool = inPool.filter(i => CAFETERIA.test(i.name))
      if (cafeteriaInPool.length) {
        issues.push({
          severity: 'error',
          brand: store,
          kb: cat,
          kind: 'cafeteria_in_pool',
          samples: cafeteriaInPool.slice(0, 4).map(i => i.name),
        })
      }
    }

    // 2. 速食 junk 在麵食品牌池中
    if (cat === 'noodles') {
      const junk = inPool.filter(i => FASTFOOD_JUNK.test(i.name))
      if (junk.length) {
        issues.push({
          severity: 'error',
          brand: store,
          kb: cat,
          kind: 'fastfood_junk_on_noodles',
          samples: junk.slice(0, 4).map(i => i.name),
        })
      }
    }

    // 3. 菜系規則違反仍在池中
    for (const check of DISH_FAMILY_CHECKS) {
      const bad = inPool.filter(i => check.pattern.test(i.name) && check.badKb.has(cat))
      if (bad.length) {
        issues.push({
          severity: 'error',
          brand: store,
          kb: cat,
          kind: `dish_family_${check.label}`,
          samples: bad.slice(0, 4).map(i => i.name),
        })
      }
    }

    // 4. 口味變體在非飲料連鎖
    if (!['bubbletea', 'coffee'].includes(cat)) {
      const flavors = inPool.filter(
        i => i.source === 'chain' && FLAVOR_SUFFIX.test(i.name) && !/茶|咖啡|奶茶|汁/.test(i.name)
      )
      if (flavors.length) {
        issues.push({
          severity: 'error',
          brand: store,
          kb: cat,
          kind: 'flavor_variant_in_pool',
          samples: flavors.slice(0, 4).map(i => i.name),
        })
      }
    }

    // 5. 飲料店出現固體主餐
    if (['coffee', 'bubbletea'].includes(cat)) {
      const solids = inPool.filter(i => SOLID_MEAL.test(i.name) && !/飲|茶|咖啡/.test(i.name))
      if (solids.length) {
        issues.push({
          severity: 'error',
          brand: store,
          kb: cat,
          kind: 'solid_meal_on_drink_brand',
          samples: solids.slice(0, 4).map(i => i.name),
        })
      }
    }

    // 6. 甜點店出現正餐
    if (cat === 'desserts') {
      const meals = inPool.filter(i => /牛肉麵|排骨|便當|鍋|堡|披薩/.test(i.name))
      if (meals.length) {
        issues.push({
          severity: 'error',
          brand: store,
          kb: cat,
          kind: 'main_meal_on_dessert_brand',
          samples: meals.slice(0, 4).map(i => i.name),
        })
      }
    }

    // 7. 過濾後無主餐（骰子無法組合）
    if (mains.length === 0 && inPool.length > 0 && !['bubbletea', 'coffee'].includes(cat)) {
      issues.push({
        severity: 'warn',
        brand: store,
        kb: cat,
        kind: 'no_mains_after_filter',
        samples: inPool.slice(0, 3).map(i => i.name),
      })
    }

    // 8. 大量品項被擋（可能過嚴）
    const blockRate = raw.length ? blocked.length / raw.length : 0
    if (raw.length >= 20 && blockRate > 0.85) {
      issues.push({
        severity: 'warn',
        brand: store,
        kb: cat,
        kind: `high_block_rate_${Math.round(blockRate * 100)}%`,
        samples: blocked.slice(0, 3).map(i => i.name),
      })
    }
  }

  // 9. 抽樣組合有效性 — 每 kb 抽 1 品牌
  const comboIssues: string[] = []
  const seenKb = new Set<string>()
  for (const brand of BRAND_REGISTRY) {
    if (seenKb.has(brand.kb_category)) continue
    if (['bubbletea', 'coffee', 'convenience', 'supermarket'].includes(brand.kb_category)) continue
    seenKb.add(brand.kb_category)
    const combos = enumerateStoreComboVariants(
      brand.name_zh,
      'lunch',
      pool,
      700,
      35,
      42,
      new Set(),
      8
    )
    for (const combo of combos) {
      const lines = combo.items.map(item => ({ item, portion: 'full' as PortionId }))
      if (!isValidMealLines(lines)) {
        comboIssues.push(
          `${brand.name_zh}(${brand.kb_category}): invalid combo [${combo.items.map(i => i.name).join(', ')}]`
        )
        break
      }
      const cafeteria = combo.items.filter(i => CAFETERIA.test(i.name))
      if (cafeteria.length && !['bento', 'chinese', 'convenience', 'supermarket'].includes(brand.kb_category)) {
        comboIssues.push(
          `${brand.name_zh}: combo has cafeteria [${combo.items.map(i => i.name).join(', ')}]`
        )
        break
      }
    }
  }

  const errors = issues.filter(i => i.severity === 'error')
  const warns = issues.filter(i => i.severity === 'warn')

  console.log('\n=== 全品牌菜單合理性稽核 ===\n')
  console.log(`品牌數: ${BRAND_REGISTRY.length}`)
  console.log(`午餐骰子池品項: ${pool.length}`)
  console.log(`錯誤: ${errors.length} · 警告: ${warns.length} · 組合問題: ${comboIssues.length}\n`)

  if (errors.length) {
    console.log('── 錯誤（池中不該出現）──')
    const byKind = new Map<string, typeof errors>()
    for (const e of errors) {
      const list = byKind.get(e.kind) ?? []
      list.push(e)
      byKind.set(e.kind, list)
    }
    for (const [kind, list] of byKind) {
      console.log(`\n[${kind}] × ${list.length}`)
      for (const e of list.slice(0, 8)) {
        console.log(`  · ${e.brand} (${e.kb}): ${e.samples.join(' | ')}`)
      }
      if (list.length > 8) console.log(`  … 另有 ${list.length - 8} 個品牌`)
    }
  } else {
    console.log('✅ 池中無已知誤標類型')
  }

  if (warns.length) {
    console.log('\n── 警告 ──')
    for (const w of warns.slice(0, 15)) {
      console.log(`  · ${w.brand} (${w.kb}) [${w.kind}]: ${w.samples.join(' | ')}`)
    }
    if (warns.length > 15) console.log(`  … 另有 ${warns.length - 15} 則`)
  }

  if (comboIssues.length) {
    console.log('\n── 組合抽樣問題 ──')
    for (const c of comboIssues) console.log(`  · ${c}`)
  } else {
    console.log('\n✅ 各菜系抽樣組合通過有效性檢查')
  }

  // Summary by kb
  console.log('\n── 各菜系過濾後主餐數（中位數）──')
  const mainsByKb = new Map<string, number[]>()
  for (const brand of BRAND_REGISTRY) {
    const n = getDiceMainPool('lunch').filter(i => i.store === brand.name_zh).length
    const list = mainsByKb.get(brand.kb_category) ?? []
    list.push(n)
    mainsByKb.set(brand.kb_category, list)
  }
  for (const [cat, counts] of [...mainsByKb.entries()].sort()) {
    counts.sort((a, b) => a - b)
    const med = counts[Math.floor(counts.length / 2)]!
    const zero = counts.filter(c => c === 0).length
    console.log(`  ${cat}: 品牌 ${counts.length} · 主餐中位數 ${med} · 零主餐 ${zero}`)
  }

  process.exit(errors.length || comboIssues.length ? 1 : 0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
