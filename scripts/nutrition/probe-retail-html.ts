#!/usr/bin/env npx tsx
import fs from 'fs'

async function probe(url: string, out: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  const text = await res.text()
  fs.writeFileSync(out, text)
  console.log(url, 'len', text.length)
  const jsonLike = [...text.matchAll(/\{[^{}]{20,500}\}/g)].slice(0, 3)
  console.log('json snippets', jsonLike.length)
  if (text.includes('214')) console.log('found 214')
  if (text.includes('kcal') || text.includes('大卡')) {
    console.log('has kcal markers')
    const idx = text.search(/kcal|大卡/)
    console.log(text.slice(Math.max(0, idx - 80), idx + 120))
  }
}

async function main() {
  await probe('https://www.okmart.com.tw/hotProducts_purchase?ID=7', 'tmp-ok-hot7.html')
  await probe('https://www.hilife.com.tw/productInfo_food.aspx', 'tmp-hilife-food.html')
}

main()
