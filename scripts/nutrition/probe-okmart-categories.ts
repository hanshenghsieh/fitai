#!/usr/bin/env npx tsx
const IDS = [4, 15, 17, 19, 20, 21, 55, 7]

async function main() {
  for (const id of IDS) {
    const url = `https://www.okmart.com.tw/hotProducts_purchase?ID=${id}`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const text = await res.text()
    const kcal = [...text.matchAll(/(\d+)\s*(?:kcal|大卡|Kcal)/gi)]
    const protein = [...text.matchAll(/(?:蛋白質|protein)[^\d]{0,15}(\d+(?:\.\d+)?)\s*(?:g|公克|克)/gi)]
    const names = [...text.matchAll(/<h[1-6][^>]*>([^<]{2,40})<\/h[1-6]>/gi)].map(m => m[1].trim())
    console.log('\nID', id, 'len', text.length, 'kcal', kcal.length, 'protein', protein.length)
    if (kcal.length) console.log(' kcal sample', kcal.slice(0, 5).map(m => m[0]))
    if (protein.length) console.log(' protein sample', protein.slice(0, 5).map(m => m[0]))
    const td = [...text.matchAll(/<td[^>]*>([^<]{2,60})<\/td>/gi)].map(m => m[1].trim()).filter(s => /熱量|蛋白|脂肪|碳水|kcal|大卡/.test(s))
    if (td.length) console.log(' td nutrition', td.slice(0, 10))
  }
}

main()
