/**
 * Verify local food image pool + imageCategory classification.
 * Run: npm run food-photo:verify
 */
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { eatOutMenu } from '../src/lib/convenience-store-menu'
import {
  CATEGORY_IMAGE_POOL,
  IMAGE_CATEGORIES,
  type ImageCategory,
} from '../src/lib/food-image-system'
import { classifyMenuItem, foodPhotoForItem, resolveFoodPhotoItem } from '../src/lib/food-photography'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function mandatoryCategory(_store: string, name: string): ImageCategory | null {
  if (/沙拉/.test(name)) return 'salad'
  if (/潛艇堡/i.test(name) && !/沙拉/.test(name)) return 'fried'
  if (/握壽司|軍艦|刺身|生魚片|壽司拼盤/.test(name)) return 'salmon'
  if (/鍋貼|水餃|煎餃/.test(name) && !/壽司/.test(name)) return 'fried'
  if (/蛋餅|蘿蔔糕/.test(name)) return 'breakfast'
  if (/咔啦|炸雞腿/.test(name)) return 'fried'
  if (/披薩|pizza/i.test(name)) return 'fried'
  if (/麻辣鍋|火鍋/.test(name)) return 'hotpot'
  if (/(?:^|[^炸])咖啡|美式咖啡/.test(name) && !/炸|拿鐵/.test(name)) return 'drink'
  if (/珍珠奶茶|鮮奶茶/.test(name)) return 'drink'
  if (/牛肉麵|牛麵/.test(name)) return 'noodles'
  if (/便當|燴飯|雞腿飯|打拋.*飯|.*飯（/.test(name)) return 'bento'
  if (/關東煮/.test(name)) return 'convenience'
  if (/燙青菜/.test(name)) return 'salad'
  return null
}

const COMPAT: Partial<Record<ImageCategory, ImageCategory[]>> = {
  bento: ['restaurant', 'convenience', 'fried', 'salad'],
  fried: ['restaurant', 'snack', 'bento'],
  salmon: ['restaurant', 'salad'],
  noodles: ['restaurant'],
  hotpot: ['restaurant'],
  salad: ['restaurant', 'bento', 'fried'],
  convenience: ['bento', 'snack'],
  breakfast: ['fried', 'restaurant'],
  drink: ['dessert'],
  restaurant: [],
}

function isCategoryCompatible(required: ImageCategory, actual: ImageCategory): boolean {
  if (required === actual) return true
  return COMPAT[required]?.includes(actual) ?? false
}

const GOLDEN: { store: string; name: string; category: ImageCategory }[] = [
  { store: 'Subway', name: '火雞胸燕麥麵包三明治', category: 'fried' },
  { store: '爭鮮迴轉壽司', name: '鮭魚握壽司', category: 'salmon' },
  { store: '肯德基', name: '咔啦雞腿堡', category: 'fried' },
  { store: '麥當勞', name: '大麥克', category: 'fried' },
  { store: '五十嵐', name: '珍珠奶茶', category: 'drink' },
  { store: '星巴克', name: '拿鐵咖啡', category: 'drink' },
  { store: '八方雲集', name: '鍋貼套餐（10顆+酸辣湯）', category: 'fried' },
  { store: '弘爺漢堡', name: '燒肉蛋餅', category: 'breakfast' },
  { store: '7-11', name: '三杯雞燴飯', category: 'bento' },
  { store: '必勝客', name: '夏威夷披薩', category: 'fried' },
  { store: '7-11', name: '關東煮', category: 'convenience' },
  { store: '牛肉麵店', name: '紅燒牛肉麵', category: 'noodles' },
]

async function main() {
  let bulk: typeof eatOutMenu = []
  const bulkPath = join(ROOT, 'data/food-kb/dice-menu-bulk.json')
  if (existsSync(bulkPath)) {
    bulk = JSON.parse(readFileSync(bulkPath, 'utf8'))
  }

  const allItems = [...eatOutMenu, ...bulk]
  const seen = new Set<string>()
  const unique: typeof eatOutMenu = []
  for (const item of allItems) {
    const key = `${item.store}::${item.name}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }

  console.log('\n=== Food Image System Verify ===')
  console.log(`Menu items: ${unique.length}`)

  const fileFails: string[] = []
  for (const cat of IMAGE_CATEGORIES) {
    for (const webPath of CATEGORY_IMAGE_POOL[cat]) {
      const local = join(ROOT, 'public', webPath.replace(/^\//, ''))
      if (!existsSync(local)) {
        fileFails.push(`missing ${webPath} (${cat})`)
      }
    }
  }

  const categoryFails: Array<{ store: string; name: string; required: string; actual: string }> = []

  for (const g of GOLDEN) {
    const actual = classifyMenuItem(g.name, g.store)
    if (actual !== g.category && !isCategoryCompatible(g.category, actual)) {
      categoryFails.push({ store: g.store, name: g.name, required: g.category, actual })
    }
  }

  for (const item of unique) {
    const required = mandatoryCategory(item.store, item.name)
    if (!required) continue
    const actual = classifyMenuItem(item.name, item.store)
    if (actual !== required && !isCategoryCompatible(required, actual)) {
      categoryFails.push({ store: item.store, name: item.name, required, actual })
    }
  }

  const r = rng(50042)
  const sampleItems: typeof eatOutMenu = []
  for (let user = 1; user <= 500; user++) {
    const picks = Math.floor(2 + r() * 4)
    for (let p = 0; p < picks; p++) {
      sampleItems.push(unique[Math.floor(r() * unique.length)]!)
    }
  }

  for (const item of sampleItems) {
    const required = mandatoryCategory(item.store, item.name)
    if (!required) continue
    const actual = classifyMenuItem(item.name, item.store)
    if (actual !== required && !isCategoryCompatible(required, actual)) {
      categoryFails.push({ store: item.store, name: item.name, required, actual })
    }
  }

  const remoteFails: string[] = []
  for (const item of unique.slice(0, 5000)) {
    const resolved = resolveFoodPhotoItem({
      name: item.name,
      store: item.store,
      officialBrandImage: item.photo_url || undefined,
    })
    if (resolved.src.startsWith('http')) {
      remoteFails.push(`${item.store} · ${item.name} -> ${resolved.src}`)
    }
    if (!resolved.src.startsWith('/food-images/') && !resolved.src.startsWith('data:')) {
      if (resolved.source === 'category') {
        remoteFails.push(`bad category src: ${item.name} -> ${resolved.src}`)
      }
    }
  }

  console.log(`500-user sample: ${sampleItems.length} picks`)
  console.log(`Local pool files: ${IMAGE_CATEGORIES.length} categories`)

  if (fileFails.length > 0) {
    console.log(`\n❌ Missing local files (${fileFails.length}):`)
    fileFails.slice(0, 20).forEach(f => console.log(`  ${f}`))
  }

  if (remoteFails.length > 0) {
    console.log(`\n❌ Remote/category URL failures (${remoteFails.length}):`)
    remoteFails.slice(0, 15).forEach(f => console.log(`  ${f}`))
  }

  if (categoryFails.length > 0) {
    console.log(`\n❌ Category failures (${categoryFails.length}):`)
    categoryFails.slice(0, 25).forEach(f =>
      console.log(`  [${f.store}] ${f.name} need=${f.required} got=${f.actual}`)
    )
    if (categoryFails.length > 25) console.log(`  ... +${categoryFails.length - 25} more`)
  }

  const pass = fileFails.length === 0 && categoryFails.length === 0 && remoteFails.length === 0
  console.log(
    pass
      ? '\n✅ PASS — local pool complete, categories OK, no runtime remote URLs'
      : '\n❌ FAIL — run: npm run food-images:setup'
  )
  process.exit(pass ? 0 : 1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
