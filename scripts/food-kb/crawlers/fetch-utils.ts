/**
 * HTTP fetch + HTML / markdown parsers for nutrition cross-validation
 */
import type { NutritionFacts } from '@/lib/food-kb/types'

const UA = 'BetterBit-FoodKB/1.0 (Taiwan nutrition research)'

export async function safeFetch(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

export interface ParsedNutritionRow {
  name: string
  size?: string
  nutrition: NutritionFacts
  price_twd?: number
}

/** 星巴克產品頁：解析各杯型熱量（HTML table 或 markdown） */
export function parseStarbucksProductPage(html: string): ParsedNutritionRow[] {
  const title =
    html.match(/<h1[^>]*>([^<]+)</)?.[1]?.trim() ||
    html.match(/#\s*([^\n#]+)/)?.[1]?.trim() ||
    ''

  const sizes = [...html.matchAll(/<li><a[^>]*>(小杯|中杯|大杯|特大杯|Solo|Doppio)<\/a>/g)].map(
    m => m[1]!
  )
  const tables = [...html.matchAll(/<div id="tabs-\d+">([\s\S]*?)<\/div>/g)]
  const rows: ParsedNutritionRow[] = []

  for (let i = 0; i < tables.length; i++) {
    const block = tables[i]![1]!
    const size = sizes[i] ?? `杯型${i + 1}`
    const cal = block.match(/熱量\(大卡\)<\/th>\s*<td>\s*(\d+)/)?.[1]
    const sugar = block.match(/糖\(公克\)<\/th>\s*<td>\s*([\d.]+)/)?.[1]
    const price = block.match(/價格<\/th>\s*<td>\s*\$?\s*(\d+)/)?.[1]
    if (!cal) continue
    rows.push({
      name: title,
      size,
      price_twd: price ? parseInt(price, 10) : undefined,
      nutrition: {
        calories: parseInt(cal, 10),
        sugar_g: sugar ? parseFloat(sugar) : undefined,
        carbs_g: sugar ? Math.round(parseFloat(sugar) * 1.1) : undefined,
        protein_g: 8,
        fat_g: Math.round(parseInt(cal, 10) * 0.2),
      },
    })
  }

  if (rows.length) return rows.filter(r => r.name && r.nutrition.calories)

  // Fallback: split by size headers
  const blocks = html.split(/>\s*(小杯|中杯|大杯|特大杯|Solo|Doppio)\s*</)
  for (let i = 1; i < blocks.length; i += 2) {
    const size = blocks[i]!
    const block = blocks[i + 1] ?? ''
    const cal = block.match(/熱量\(大卡\)<\/th>\s*<td>\s*(\d+)/)?.[1]
    const sugar = block.match(/糖\(公克\)<\/th>\s*<td>\s*([\d.]+)/)?.[1]
    const price = block.match(/價格<\/th>\s*<td>\s*\$?\s*(\d+)/)?.[1]
    if (!cal) continue
    rows.push({
      name: title,
      size,
      price_twd: price ? parseInt(price, 10) : undefined,
      nutrition: {
        calories: parseInt(cal, 10),
        sugar_g: sugar ? parseFloat(sugar) : undefined,
        carbs_g: sugar ? Math.round(parseFloat(sugar) * 1.1) : undefined,
        protein_g: 8,
        fat_g: Math.round(parseInt(cal, 10) * 0.2),
      },
    })
  }

  if (rows.length) return rows.filter(r => r.name && r.nutrition.calories)

  // Fallback: markdown 表格
  const calBlocks = [
    ...html.matchAll(/\| 價格 \|\s*\$\s*(\d+)[\s\S]*?熱量\(大卡\)\s*\|\s*(\d+)[\s\S]*?糖\(公克\)\s*\|\s*([\d.]+)/g),
  ]
  for (let i = 0; i < calBlocks.length; i++) {
    const m = calBlocks[i]!
    const size = sizes[i] ?? (i === 0 ? '中杯' : `杯型${i + 1}`)
    rows.push({
      name: title,
      size,
      price_twd: parseInt(m[1]!, 10),
      nutrition: {
        calories: parseInt(m[2]!, 10),
        sugar_g: parseFloat(m[3]!),
        carbs_g: Math.round(parseFloat(m[3]!) * 1.1),
        protein_g: 8,
        fat_g: Math.round(parseInt(m[2]!, 10) * 0.2),
      },
    })
  }
  return rows.filter(r => r.name && r.nutrition.calories)
}

/** 部落格 HTML 表格（WordPress 營養師站） */
export function parseBlogHtmlTables(
  html: string,
  brand: string,
  opts?: { preferSize?: '大杯' | '中杯' }
): ParsedNutritionRow[] {
  const preferSize = opts?.preferSize ?? '大杯'
  const rows: ParsedNutritionRow[] = []
  const trBlocks = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]

  for (const tr of trBlocks) {
    const cells = [...tr[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m =>
      m[1]!.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    )
    if (cells.length < 3) continue
    const name = cells[0]!
    if (!name || name === '品項名稱' || /^-+$/.test(name)) continue

    // 常見欄位：名稱 | 中杯熱 | 中杯糖 | 大杯熱 | 大杯糖
    let cal: number
    let sugar: number | undefined
    if (cells.length >= 5) {
      if (preferSize === '大杯') {
        cal = parseInt(cells[3]!, 10)
        sugar = parseInt(cells[4]!, 10)
      } else {
        cal = parseInt(cells[1]!, 10)
        sugar = parseInt(cells[2]!, 10)
      }
    } else {
      cal = parseInt(cells[1]!, 10)
      sugar = cells[2] ? parseInt(cells[2], 10) : undefined
    }
    if (!Number.isFinite(cal) || cal <= 0) continue

    rows.push({
      name: normalizeBlogItemName(name, brand),
      size: preferSize,
      nutrition: {
        calories: cal,
        sugar_g: Number.isFinite(sugar!) ? sugar : undefined,
        carbs_g: sugar ? Math.round(sugar * 1.15) : Math.round(cal * 0.55),
        protein_g: name.includes('奶茶') || name.includes('拿鐵') ? 4 : 1,
        fat_g: name.includes('奶茶') ? Math.round(cal * 0.12) : 0,
      },
    })
  }
  return rows
}

/** 部落格 markdown 表格：品項 | 大杯 熱量 | ... */
export function parseBlogMarkdownTables(
  text: string,
  brand: string,
  opts?: { preferSize?: '大杯' | '中杯' }
): ParsedNutritionRow[] {
  const preferSize = opts?.preferSize ?? '大杯'
  const rows: ParsedNutritionRow[] = []
  const lines = text.split('\n')
  let header: string[] = []

  for (const line of lines) {
    if (!line.includes('|')) continue
    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)
    if (!cells.length) continue

    if (cells[0] === '品項名稱' || cells[0].includes('品項')) {
      header = cells
      continue
    }
    if (cells.every(c => /^-+$/.test(c.replace(/\s/g, '')))) continue
    if (!header.length || cells[0] === '---') continue

    const name = cells[0]!
    let calIdx = header.findIndex(h => h.includes(`${preferSize}`) && h.includes('熱量'))
    if (calIdx < 0) calIdx = header.findIndex(h => h.includes('熱量') && h.includes('kcal'))
    if (calIdx < 0) calIdx = header.findIndex(h => h.includes('熱量'))
    const sugarIdx = header.findIndex(h => h.includes('糖') && (h.includes(preferSize) || !h.includes('中杯')))

    const calRaw = cells[calIdx]
    const cal = calRaw ? parseInt(calRaw.replace(/[^\d]/g, ''), 10) : NaN
    if (!name || !Number.isFinite(cal) || cal <= 0) continue

    const sugarRaw = sugarIdx >= 0 ? cells[sugarIdx] : undefined
    const sugar = sugarRaw ? parseInt(sugarRaw.replace(/[^\d]/g, ''), 10) : undefined

    rows.push({
      name: normalizeBlogItemName(name, brand),
      size: preferSize,
      nutrition: {
        calories: cal,
        sugar_g: Number.isFinite(sugar!) ? sugar : undefined,
        carbs_g: sugar ? Math.round(sugar * 1.15) : Math.round(cal * 0.55),
        protein_g: name.includes('奶茶') || name.includes('拿鐵') ? 4 : 1,
        fat_g: name.includes('奶茶') ? Math.round(cal * 0.12) : 0,
      },
    })
  }
  return rows
}

function normalizeBlogItemName(name: string, brand: string): string {
  let n = name.trim()
  if (brand === '五十嵐') {
    if (n === '珍珠奶茶/奶綠') return '珍珠奶茶（大杯）'
    if (n === '波霸奶茶/奶綠') return '波霸奶茶（大杯）'
    if (n === '奶茶/奶綠') return '奶綠（大杯）'
    if (n === '四季春青茶') return '四季春青茶（中杯）'
    if (n === '8冰茶') return '8冰茶（大杯）'
    if (n === '檸檬綠') return '檸檬綠茶（大杯）'
    if (n === '阿華田') return '阿華田（中杯）'
    if (n === '冰淇淋紅茶') return '冰淇淋紅茶（大杯）'
    if (n.includes('大杯') || n.includes('中杯')) return n
    if (n.includes('珍珠奶茶')) return '珍珠奶茶（大杯）'
    if (n.includes('波霸奶茶')) return '波霸奶茶（大杯）'
  }
  return n
}

export function nameMatchScore(a: string, b: string): number {
  const na = a.replace(/\s/g, '').toLowerCase()
  const nb = b.replace(/\s/g, '').toLowerCase()
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const strip = (s: string) => s.replace(/[（(].*?[）)]/g, '').replace(/大杯|中杯|全糖|微糖/g, '')
  const sa = strip(na)
  const sb = strip(nb)
  if (sa === sb) return 0.9
  if (sa.includes(sb) || sb.includes(sa)) return 0.75
  return 0
}
