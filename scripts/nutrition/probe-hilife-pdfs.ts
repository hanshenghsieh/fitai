#!/usr/bin/env npx tsx
import fs from 'fs'

async function main() {
  const res = await fetch('https://www.hilife.com.tw/productInfo_edms.aspx', {
    headers: { 'User-Agent': 'Mozilla/5.0 fitness-app-onr-probe' },
  })
  const html = await res.text()
  const pdfs = [...html.matchAll(/href=\"([^\"]+\.pdf)\"/gi)].map(m => m[1])
  const titles = [...html.matchAll(/>([^<]{4,80})<\/a>/g)].map(m => m[1].trim())
  console.log('pdf count', pdfs.length)
  pdfs.slice(0, 30).forEach((p, i) => console.log(i + 1, p))
  console.log('\ntitles sample:', titles.filter(t => /鮮食|便當|飯糰|茶葉|蛋白|主餐|熟食/.test(t)).slice(0, 20))
}

main()
