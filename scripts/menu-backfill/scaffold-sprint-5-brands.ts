#!/usr/bin/env npx tsx
/** Scaffold Sprint 5 brands.json — 牛排·西餐 + Sprint 4 draft carryovers. */
import fs from 'fs'
import path from 'path'

const OUT = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'sprint-5', 'brands.json')

type BrandRow = { name: string; aliases?: string[]; url?: string; rank?: number; theme: string }

const SPRINT_5: BrandRow[] = [
  { name: '王品牛排', aliases: ['王品'], theme: 'steak', url: 'https://www.wangsteak.com.tw/', rank: 58 },
  { name: '陶板屋', theme: 'steak', url: 'https://www.tasty.com.tw/', rank: 56 },
  { name: '西堤牛排', theme: 'steak', url: 'https://www.tasty.com.tw/', rank: 55 },
  { name: '夏慕尼', theme: 'steak', url: 'https://www.chamonix.com.tw/', rank: 59 },
  { name: '茹絲葵', aliases: ['茹絲葵經典牛排館'], theme: 'steak', url: 'https://www.ruthschris.tw/', rank: 60 },
  { name: '教父牛排', theme: 'steak', rank: 181 },
  { name: 'Lawry\'s', aliases: ['Lawrys'], theme: 'steak', rank: 182 },
  { name: '金色三麥', theme: 'western', url: 'https://www.lebledor.com.tw/', rank: 57 },
  { name: '饗食天堂', theme: 'buffet', url: 'https://www.eatogether.com.tw/', rank: 51 },
  { name: '欣葉', theme: 'taiwanese', url: 'https://www.shinyeh.com.tw/', rank: 52 },
  { name: '瓦城', theme: 'thai', url: 'https://www.wangroup.com.tw/', rank: 53 },
  { name: '大心', theme: 'thai', url: 'https://www.wangroup.com.tw/', rank: 54 },
  { name: '必勝客', theme: 'fill', url: 'https://www.pizzahut.com.tw/menu', rank: 14 },
  { name: '達美樂', theme: 'fill', url: 'https://www.dominos.com.tw/', rank: 16 },
  { name: '頂呱呱', theme: 'fill', url: 'https://www.tkkinc.com.tw/', rank: 17 },
  { name: '拿坡里', theme: 'fill', url: 'https://www.napoli.com.tw/', rank: 18 },
  { name: '丹堤咖啡', theme: 'fill', url: 'https://www.dante.com.tw/', rank: 22 },
  { name: '一芳水果茶', theme: 'fill', url: 'https://www.yifangtea.com/', rank: 202 },
  { name: '金峰魯肉飯', theme: 'fill', url: 'https://www.jinfeng.com.tw/', rank: 23 },
  { name: '大埔鐵板燒', theme: 'fill', url: 'https://www.dapu.com.tw/', rank: 24 },
  { name: '貴族世家', theme: 'fill', url: 'https://www.noblevip.com.tw/', rank: 25 },
  { name: '漢堡王', theme: 'fill_sprint4', url: 'https://www.burgerking.com.tw/menu', rank: 13 },
  { name: '八方雲集', theme: 'fill_sprint4', url: 'https://www.8way.com.tw/', rank: 20 },
  { name: '四海遊龍', theme: 'fill_sprint4', url: 'https://www.seafooddragon.com.tw/', rank: 21 },
  { name: '辛殿麻辣鍋', aliases: ['辛殿'], theme: 'fill_sprint4', url: 'https://www.shindian.com.tw/', rank: 43 },
  { name: '無老鍋', theme: 'fill_sprint4', url: 'https://www.wowlao.com.tw/', rank: 44 },
  { name: '老四川', theme: 'fill_sprint4', url: 'https://www.oldsichuan.com.tw/', rank: 45 },
  { name: '肉多多', theme: 'fill_sprint4', url: 'https://www.rododo.com.tw/', rank: 46 },
  { name: '鼎王', theme: 'fill_sprint4', url: 'https://www.dingwang.com.tw/', rank: 47 },
  { name: '石二鍋', theme: 'fill_sprint4', url: 'https://www.12hotpot.com.tw/', rank: 48 },
  { name: '這一鍋', theme: 'fill_sprint4', url: 'https://www.pot.com.tw/', rank: 49 },
  { name: '馬辣', theme: 'fill_sprint4', url: 'https://www.mala.com.tw/', rank: 50 },
  { name: '撈王', theme: 'fill_sprint4', rank: 177 },
  { name: '青花驕', theme: 'fill_sprint4', rank: 178 },
  { name: '老先覺', theme: 'fill_sprint4', url: 'https://www.laosense.com.tw/', rank: 179 },
  { name: '鍋賣局', theme: 'fill_sprint4', rank: 180 },
  { name: '乾杯', theme: 'fill_sprint3', url: 'https://www.kanpai.com.tw/', rank: 37 },
  { name: '一風堂', theme: 'fill_sprint3', url: 'https://www.ippudo.com.tw/', rank: 155 },
  { name: '一蘭拉麵', aliases: ['一蘭'], theme: 'fill_sprint3', url: 'https://www.ichiran.com.tw/', rank: 157 },
  { name: '起家雞', theme: 'fill_sprint3', url: 'https://www.kyg.com.tw/', rank: 167 },
  { name: '藏壽司', theme: 'fill_sprint3', url: 'https://www.kurasushi.com.tw/', rank: 32 },
  { name: '壽司郎', theme: 'fill_sprint3', url: 'https://www.sushiro.com.tw/', rank: 33 },
  { name: '爭鮮', aliases: ['爭鮮迴轉壽司'], theme: 'fill_sprint3', url: 'https://www.sushiexpress.com.tw/', rank: 34 },
  { name: '大戶屋', theme: 'fill_sprint3', url: 'https://www.ohtaya.com.tw/', rank: 28 },
  { name: 'YAYOI彌生軒', aliases: ['YAYOI', '彌生軒'], theme: 'fill_sprint3', url: 'https://www.yayoik.com.tw/', rank: 29 },
  { name: '萊爾富', aliases: ['Hi-Life'], theme: 'fill_sprint3', url: 'https://www.hilife.com.tw/', rank: 3 },
  { name: 'OK mart', aliases: ['OK', 'OK超商'], theme: 'fill_sprint3', url: 'https://www.okmart.com.tw/', rank: 4 },
  { name: '50嵐', aliases: ['五十嵐'], theme: 'fill_sprint3', url: 'https://www.50lan.com/', rank: 200 },
  { name: '清心福全', theme: 'fill_sprint3', url: 'https://www.chingshin.com.tw/', rank: 201 },
]

function enc(s: string) {
  return encodeURIComponent(s)
}

function main() {
  const brands = SPRINT_5.map(row => ({
    canonical_name: row.name,
    store_aliases: row.aliases ?? [row.name],
    group: row.theme,
    sprint5_theme: row.theme,
    allowlist_rank: row.rank ?? null,
    restaurant_sources: [
      {
        priority: 'A' as const,
        source_type: 'official_website' as const,
        source_url: row.url ?? `https://www.google.com/search?q=${enc(row.name + ' 台灣 官網')}`,
        source_name: row.url ? `${row.name} 官網` : `${row.name} 官網待確認`,
        observed_at: new Date().toISOString(),
      },
      {
        priority: 'B' as const,
        source_type: 'google_maps' as const,
        source_url: `https://www.google.com/maps/search/${enc(row.name)}`,
        source_name: `Google Maps ${row.name}`,
        observed_at: new Date().toISOString(),
      },
    ],
    nutrition_source_url: row.url ?? null,
    target_items: 20,
    sprint: 5,
    status: 'draft',
  }))

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      { sprint: 5, theme: '牛排·西餐', generated_at: new Date().toISOString(), policy: 'zero_hallucination', brands },
      null,
      2
    )
  )
  console.log(`Sprint 5 brands: ${brands.length}`)
  console.log(`Written: ${OUT}`)
}

main()
