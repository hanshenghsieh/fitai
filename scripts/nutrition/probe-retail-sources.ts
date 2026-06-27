#!/usr/bin/env npx tsx
/** Probe official retail pages for nutrition data (read-only). */
const URLS = [
  'https://www.hilife.com.tw/productInfo_foodList.aspx?cateid=15',
  'https://www.hilife.com.tw/productInfo_foodList.aspx?cateid=13',
  'https://www.okmart.com.tw/hotProducts_purchase?ID=55',
  'https://www.okmart.com.tw/hotProducts_purchase?ID=7',
  'https://www.pxmart.com.tw/exclusive/%E7%BE%8E%E5%91%B3%E5%A0%82',
]

async function main() {
  for (const url of URLS) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 fitness-app-onr-probe' } })
      const text = await res.text()
      const kcal = [...text.matchAll(/(\d+)\s*(?:大卡|kcal|Kcal|Cal)/gi)].slice(0, 8)
      const protein = [...text.matchAll(/(?:蛋白質|protein)[^\d]{0,20}(\d+(?:\.\d+)?)\s*(?:g|公克|克)/gi)].slice(0, 8)
      const detail = [...text.matchAll(/productInfo_foodDetail[^"'\s>]+/gi)].slice(0, 5)
      console.log('\n===', url, 'status', res.status, 'len', text.length)
      console.log('details:', detail.map(m => m[0]))
      console.log('kcal:', kcal.map(m => m[0]))
      console.log('protein:', protein.map(m => m[0]))
    } catch (e) {
      console.error(url, e)
    }
  }
}

main()
