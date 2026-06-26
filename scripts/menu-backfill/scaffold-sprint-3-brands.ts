#!/usr/bin/env npx tsx
/** Scaffold Sprint 3 brands.json — source skeleton only, no nutrition data. */
import fs from 'fs'
import path from 'path'

const OUT = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'sprint-3', 'brands.json')

type BrandRow = { name: string; aliases?: string[]; url?: string; rank?: number; theme: string }

const SPRINT_3: BrandRow[] = [
  { name: '乾杯', theme: 'yakiniku', url: 'https://www.kanpai.com.tw/', rank: 37 },
  { name: '老乾杯', theme: 'yakiniku', url: 'https://www.wowprime.com/', rank: 38 },
  { name: '燒肉同話', theme: 'yakiniku', url: 'https://www.islandgourmet.com.tw/', rank: 39 },
  { name: '胡同燒肉', theme: 'yakiniku', url: 'https://www.hutong.com.tw/', rank: 40 },
  { name: '茶六燒肉堂', theme: 'yakiniku', url: 'https://www.tea6.com.tw/', rank: 41 },
  { name: '牛角日本燒肉', aliases: ['牛角'], theme: 'yakiniku', url: 'https://www.gyukaku.com.tw/', rank: 138 },
  { name: '安安燒肉', theme: 'yakiniku', url: 'https://www.ananbbq.com.tw/', rank: 139 },
  { name: '燒肉眾', theme: 'yakiniku', url: 'https://www.yakiniku-shuzo.com.tw/', rank: 140 },
  { name: '築間', theme: 'yakiniku', url: 'https://www.zhujian.com.tw/', rank: 42 },
  { name: '牧島燒肉', theme: 'yakiniku', rank: 300 },
  { name: '屋馬燒肉', theme: 'yakiniku', rank: 301 },
  { name: '脂板前炭火燒肉', theme: 'yakiniku', rank: 302 },
  { name: '阿角紅燒肉', theme: 'yakiniku', rank: 303 },
  { name: '一風堂', theme: 'ramen', url: 'https://www.ippudo.com.tw/', rank: 155 },
  { name: '一蘭拉麵', aliases: ['一蘭'], theme: 'ramen', url: 'https://www.ichiran.com.tw/', rank: 157 },
  { name: 'Nagi凪拉麵', aliases: ['Nagi', '凪拉麵'], theme: 'ramen', url: 'https://www.nagi-ramen.com/', rank: 158 },
  { name: '鷹流拉麵', theme: 'ramen', rank: 159 },
  { name: '鬼金棒', theme: 'ramen', rank: 160 },
  { name: '博多一幸舍', theme: 'ramen', url: 'https://www.hakataikkousha.com/', rank: 161 },
  { name: '屯京拉麵', theme: 'ramen', url: 'https://www.tonchin.com.tw/', rank: 156 },
  { name: '麵屋一燈', theme: 'ramen', rank: 162 },
  { name: '麵屋壹之穴', theme: 'ramen', rank: 163 },
  { name: '拉麵公子', theme: 'ramen', rank: 164 },
  { name: '大阪王將', theme: 'japanese', url: 'https://www.osaka-ohsho.com.tw/', rank: 153 },
  { name: '京都勝牛', theme: 'japanese', rank: 154 },
  { name: '靜岡勝政', theme: 'japanese', rank: 155 },
  { name: '起家雞', theme: 'korean', url: 'https://www.kyg.com.tw/', rank: 167 },
  { name: 'bb.q CHICKEN', aliases: ['bbq CHICKEN'], theme: 'korean', url: 'https://www.bbqchicken.tw/', rank: 168 },
  { name: 'NENE CHICKEN', theme: 'korean', url: 'https://www.nenechicken.com.tw/', rank: 169 },
  { name: '小韓坊', theme: 'korean', rank: 170 },
  { name: '姜虎東白丁', aliases: ['姜虎東'], theme: 'korean', rank: 171 },
  { name: '八色烤肉', theme: 'korean', rank: 172 },
  { name: '雙月食品社', aliases: ['雙月'], theme: 'taiwanese', rank: 173 },
  { name: '韓虎嘯', theme: 'korean', rank: 174 },
  { name: '合點壽司', theme: 'japanese', url: 'https://www.goten.com.tw/', rank: 35 },
  { name: '金子半之助', theme: 'japanese', url: 'https://www.kanekohannosuke.com/', rank: 36 },
  { name: '藏壽司', theme: 'japanese', url: 'https://www.kurasushi.com.tw/', rank: 32 },
  { name: '壽司郎', theme: 'japanese', url: 'https://www.sushiro.com.tw/', rank: 33 },
  { name: '爭鮮', aliases: ['爭鮮迴轉壽司'], theme: 'japanese', url: 'https://www.sushiexpress.com.tw/', rank: 34 },
  { name: '大戶屋', theme: 'japanese', url: 'https://www.ohtaya.com.tw/', rank: 28 },
  { name: 'YAYOI彌生軒', aliases: ['YAYOI', '彌生軒'], theme: 'japanese', url: 'https://www.yayoik.com.tw/', rank: 29 },
  { name: '丼丼屋', theme: 'japanese', rank: 175 },
  { name: '定食8', theme: 'japanese', rank: 176 },
  { name: '摩斯漢堡', theme: 'fill', url: 'https://www.mos.com.tw/menu', rank: 15 },
  { name: '漢堡王', theme: 'fill_sprint2', url: 'https://www.burgerking.com.tw/menu', rank: 13 },
  { name: '八方雲集', theme: 'fill_sprint2', url: 'https://www.8way.com.tw/', rank: 20 },
  { name: '四海遊龍', theme: 'fill_sprint2', url: 'https://www.seafooddragon.com.tw/', rank: 21 },
  { name: '萊爾富', aliases: ['Hi-Life'], theme: 'fill_sprint2', url: 'https://www.hilife.com.tw/', rank: 3 },
  { name: 'OK mart', aliases: ['OK', 'OK超商'], theme: 'fill_sprint2', url: 'https://www.okmart.com.tw/', rank: 4 },
  { name: '50嵐', aliases: ['五十嵐'], theme: 'fill_sprint2', url: 'https://www.50lan.com/', rank: 200 },
  { name: '清心福全', theme: 'fill_sprint2', url: 'https://www.chingshin.com.tw/', rank: 201 },
]

function enc(s: string) {
  return encodeURIComponent(s)
}

function main() {
  const brands = SPRINT_3.map(row => ({
    canonical_name: row.name,
    store_aliases: row.aliases ?? [row.name],
    group: row.theme,
    sprint3_theme: row.theme,
    allowlist_rank: row.rank ?? null,
    restaurant_sources: [
      {
        priority: 'A' as const,
        source_type: 'official_website' as const,
        source_url: row.url ?? `https://www.google.com/search?q=${enc(row.name + ' 台灣 官網')}`,
        source_name: row.url ? `${row.name} 官網` : `${row.name} 官網待確認`,
      },
      {
        priority: 'B' as const,
        source_type: 'google_maps' as const,
        source_url: `https://www.google.com/maps/search/${enc(row.name)}`,
        source_name: `Google Maps ${row.name}`,
      },
    ],
    nutrition_source_url: row.url ?? null,
    nutrition_source_status: row.url ? 'pending_page_discovery' : 'pending_manual_discovery',
    target_items: row.name.includes('爾富') || row.name.includes('OK') ? 200 : 20,
    bdgs_required: true,
  }))

  const doc = {
    version: '3.0.0',
    policy: 'zero_hallucination',
    verified_by: 'menu-backfill-sprint-3',
    sprint: 3,
    batch_size: 50,
    theme: 'yakiniku_ramen_korean',
    status: 'source_skeleton',
    bdgs_freeze_lifted: true,
    notes:
      'Sprint 3 燒肉·拉麵·韓式集群 + Sprint 2 draft 殘留。僅來源骨架；所有品項須走 BDGS Promotion Pipeline。',
    brands,
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2))
  console.log(`Sprint 3 brands: ${brands.length}`)
  console.log(`Written: ${OUT}`)
}

main()
