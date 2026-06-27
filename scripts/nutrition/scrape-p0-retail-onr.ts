#!/usr/bin/env npx tsx
/**
 * Scrape official retail fresh-food pages (Priority A) via headless browser.
 * Output: data/food-kb/staging/p0-retail-onr-scrape.json (raw, for human QA)
 */
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer'

const OUT = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'p0-retail-onr-scrape.json')

interface ScrapedItem {
  brand: string
  name: string
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  sodium: number | null
  source_url: string
  raw_text: string
}

function parseMacros(text: string): Pick<ScrapedItem, 'calories' | 'protein' | 'fat' | 'carbs' | 'sodium'> {
  const cal =
    text.match(/(?:熱量|總熱量|Calories?)[:：]?\s*(\d+(?:\.\d+)?)\s*(?:大卡|kcal|Kcal)/i)?.[1] ??
    text.match(/(\d+(?:\.\d+)?)\s*(?:大卡|kcal|Kcal)/i)?.[1]
  const protein = text.match(/(?:蛋白質|Protein)[:：]?\s*(\d+(?:\.\d+)?)\s*(?:g|公克|克)/i)?.[1]
  const fat = text.match(/(?:脂肪|Fat)[:：]?\s*(\d+(?:\.\d+)?)\s*(?:g|公克|克)/i)?.[1]
  const carbs = text.match(/(?:碳水化合物|Carbs?)[:：]?\s*(\d+(?:\.\d+)?)\s*(?:g|公克|克)/i)?.[1]
  const sodium = text.match(/(?:鈉|Sodium)[:：]?\s*(\d+(?:\.\d+)?)\s*(?:mg|毫克)/i)?.[1]
  return {
    calories: cal ? Number(cal) : null,
    protein: protein ? Number(protein) : null,
    fat: fat ? Number(fat) : null,
    carbs: carbs ? Number(carbs) : null,
    sodium: sodium ? Number(sodium) : null,
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function scrapeHiLife(page: import('puppeteer').Page): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = []
  const categories = [
    { url: 'https://www.hilife.com.tw/productInfo_foodList.aspx?cateid=15', label: '飯香糰聚' },
    { url: 'https://www.hilife.com.tw/productInfo_foodList.aspx?cateid=13', label: '能量主餐' },
    { url: 'https://www.hilife.com.tw/productInfo_foodList.aspx?cateid=17', label: '微調滿足' },
  ]

  for (const cat of categories) {
    await page.goto(cat.url, { waitUntil: 'networkidle2', timeout: 60000 })
    await sleep(2500)
    const cards = await page.evaluate(() => {
      const out: Array<{ name: string; href: string; text: string }> = []
      document.querySelectorAll('a[href]').forEach(a => {
        const href = (a as HTMLAnchorElement).href
        const text = (a.textContent ?? '').replace(/\s+/g, ' ').trim()
        if (href.includes('foodDetail') || href.includes('productInfo')) {
          out.push({ name: text.slice(0, 80), href, text })
        }
      })
      return out.slice(0, 40)
    })
    console.log(`Hi-Life ${cat.label}: ${cards.length} links`)
    for (const card of cards.slice(0, 15)) {
      if (!card.href || card.href === cat.url) continue
      try {
        await page.goto(card.href, { waitUntil: 'networkidle2', timeout: 45000 })
        await sleep(1500)
        const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim())
        const macros = parseMacros(body)
        if (macros.calories && macros.protein != null && macros.fat != null && macros.carbs != null) {
          const name =
            (await page.evaluate(() => {
              const h = document.querySelector('h1,h2,h3,.product-name,.title')
              return (h?.textContent ?? '').trim()
            })) || card.name
          items.push({
            brand: '萊爾富',
            name,
            ...macros,
            source_url: card.href,
            raw_text: body.slice(0, 500),
          })
        }
      } catch {
        /* skip timeout pages */
      }
    }
  }
  return items
}

async function scrapeOkmart(page: import('puppeteer').Page): Promise<ScrapedItem[]> {
  const items: ScrapedItem[] = []
  const ids = [15, 20, 19, 55]
  for (const id of ids) {
    const url = `https://www.okmart.com.tw/hotProducts_purchase?ID=${id}`
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
    await sleep(2000)
    const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim())
    const chunks = body.split(/(?=\d+\s*(?:kcal|大卡|Kcal))/i)
    for (const chunk of chunks.slice(0, 30)) {
      const macros = parseMacros(chunk)
      if (!macros.calories) continue
      const nameMatch = chunk.match(/^(.{4,40}?)(?:熱量|kcal|大卡)/i)
      items.push({
        brand: 'OK mart',
        name: nameMatch?.[1]?.trim() || `OKmart-${id}`,
        ...macros,
        source_url: url,
        raw_text: chunk.slice(0, 300),
      })
    }
    console.log(`OK mart ID ${id}: parsed ${items.length} cumulative`)
  }
  return items
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const hilife = await scrapeHiLife(page)
  const okmart = await scrapeOkmart(page)

  await browser.close()

  const all = [...hilife, ...okmart]
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), items: all }, null, 2))
  console.log(`\nScraped ${all.length} items with full macros`)
  console.log(`  Hi-Life: ${hilife.length}`)
  console.log(`  OK mart: ${okmart.length}`)
  console.log(`Output: ${OUT}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
