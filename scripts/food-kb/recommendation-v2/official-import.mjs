import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ONR_DIR = join(__dirname, '../../../data/food-kb/official-reference')

const DRINK_PATTERN = /飲料|咖啡|可樂|雪碧|紅茶|綠茶|奶茶|拿鐵|美式|瑪奇朵|果汁|豆漿杯|鮮乳|牛奶杯|冰炫風|聖代|蛋塔|薯條|蘋果派|玉米濃湯|湯$|湯（/
const SNACK_PATTERN = /雞塊（|麥克雞塊|上校雞塊|小份薯條|甜心|蛋捲冰淇淋/

const VENUE_BY_BRAND = {
  '7eleven': 'convenience_store',
  familymart: 'convenience_store',
  hilife: 'convenience_store',
  okmart: 'convenience_store',
  subway: 'chain_restaurant',
  mcdonald: 'chain_restaurant',
  mos: 'chain_restaurant',
  kfc: 'chain_restaurant',
  yoshinoya: 'chain_restaurant',
  sukiya: 'chain_restaurant',
  marugame: 'chain_restaurant',
  sunright: 'chain_restaurant',
  huzhang: 'chain_restaurant',
  dandan: 'chain_restaurant',
  starbucks: 'chain_restaurant',
  louisa: 'chain_restaurant',
  cama: 'chain_restaurant',
  '85c': 'chain_restaurant',
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function classifyOfficialMenuItem(brandId, name, macros) {
  if (DRINK_PATTERN.test(name) || SNACK_PATTERN.test(name)) {
    return { recommendable: false, meal_role: DRINK_PATTERN.test(name) ? 'drink' : 'snack', skip: 'drink_or_snack' }
  }
  if (macros.calories < 120) {
    return { recommendable: false, meal_role: 'side', skip: 'too_small' }
  }
  const isBurger = /堡|潛艇|三明治|飯$|麵$|定食|套餐/.test(name)
  const isLight = macros.calories <= 350 && macros.protein >= 15
  return {
    recommendable: true,
    meal_role: isLight && !isBurger ? 'light_meal' : 'main_meal',
    skip: null,
  }
}

function mealTimesForBrand(brandId, name) {
  const times = ['lunch', 'dinner']
  if (['mcdonald', 'mos', 'kfc', 'subway', 'dandan'].includes(brandId)) return times
  if (/早餐|蛋餅|吐司|晨間/.test(name)) return ['breakfast', 'lunch']
  if (brandId === '7eleven' || brandId === 'familymart') return ['breakfast', 'lunch', 'dinner', 'late_night']
  return times
}

export function buildOfficialItems() {
  const items = []
  const report = []
  const files = readdirSync(ONR_DIR).filter(f => f.endsWith('.json') && f !== 'index.json')

  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(ONR_DIR, file), 'utf8'))
    const brandId = raw.metadata?.brand_id ?? file.replace('.json', '')
    const brand = raw.metadata?.canonical_name ?? brandId
    const sourceUrl = raw.metadata?.nutrition_source_url ?? raw.menu?.[0]?.source_url
    let imported = 0
    let skipped = 0
    const skipReasons = {}

    for (const row of raw.menu ?? []) {
      const name = row.name?.trim()
      if (!name) continue
      const macros = {
        calories: row.calories ?? 0,
        protein: row.protein ?? 0,
        fat: row.fat ?? 0,
        carbs: row.carbs ?? 0,
      }
      const cls = classifyOfficialMenuItem(brandId, name, macros)
      if (cls.skip) {
        skipped++
        skipReasons[cls.skip] = (skipReasons[cls.skip] ?? 0) + 1
        if (!cls.recommendable) {
          // still include non-recommendable official for reference? User wants official-foods-v2 for official only recommendable mains + we can include blocked for completeness in merged file separately
          // Put blocked official in official file with is_recommendable false
        }
      }

      const portion_type = /套餐|＋|\+/.test(name) ? 'combo' : 'single_main'
      const item = {
        id: `off-${brandId}-${slug(name)}`,
        brand,
        name,
        item_type: portion_type === 'combo' ? 'combo' : 'single',
        calories: macros.calories,
        protein: macros.protein,
        fat: macros.fat,
        carbs: macros.carbs,
        meal_role: cls.meal_role,
        portion_type,
        meal_time: mealTimesForBrand(brandId, name),
        venue_type: VENUE_BY_BRAND[brandId] ?? 'chain_restaurant',
        is_recommendable: cls.recommendable && ['main_meal', 'light_meal'].includes(cls.meal_role),
        confidence_level: 'official',
        source_type: 'official',
        source_url: row.source_url ?? sourceUrl,
        source_note: `${brand} 官方營養標示`,
        tags: ['連鎖', 'official', macros.protein >= 24 ? 'high_protein' : 'balanced'],
        recommendation_copy: {
          short_reason: '官方營養資料，適合直接對照今天剩餘熱量',
          benefit_points: ['來源可驗證', '比亂猜安全'],
        },
      }
      items.push(item)
      if (item.is_recommendable) imported++
      else skipped++
    }

    report.push({
      brand,
      brand_id: brandId,
      source_type: 'official',
      imported_count: imported,
      skipped_count: skipped,
      skip_reason: Object.entries(skipReasons)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ') || 'none',
      last_updated: new Date().toISOString().slice(0, 10),
    })
  }

  return { items, report }
}
