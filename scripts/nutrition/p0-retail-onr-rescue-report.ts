#!/usr/bin/env npx tsx
/**
 * Generate docs/P0_RETAIL_ONR_RESCUE_REPORT.md + dice pool impact metrics.
 * Run after: npm run onr:p0-retail && npm run backfill:p0-retail-onr
 */
import fs from 'fs'
import path from 'path'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { computeTodayMealState } from '@/lib/engines/next-meal-engine'
import { rollMealSuggestion } from '@/lib/meal-engine'
import { clearSessionDicePoolsForTests } from '@/lib/meal-suggest'
import { preloadDiceMenuBulk } from '@/lib/dice-menu-pool'
import { buildOfficialCoverageDashboard } from '@/lib/nutrition/official-reference'
import {
  P0_RETAIL_ONR_CONFIG,
  type P0RetailOnrCuratedFile,
} from '@/lib/nutrition/p0-retail-onr'
import { isDiceRecommendable } from '@/lib/nutrition/menu-confidence-runtime'
import { isDiceMainCandidate } from '@/lib/dice-menu-pool'
import { canonicalDiceStore } from '@/lib/dice-store-aliases'

const ROOT = process.cwd()
const CURATED = path.join(ROOT, 'data', 'food-kb', 'staging', 'p0-retail-onr-curated.json')
const REPORT = path.join(ROOT, 'docs', 'P0_RETAIL_ONR_RESCUE_REPORT.md')

async function measureDicePool() {
  await preloadDiceMenuBulk()
  clearSessionDicePoolsForTests()

  const dayState = computeTodayMealState({
    todayFoodLogs: [],
    normalTargetKcal: 1680,
    proteinTargetG: 100,
    mealSlot: 'lunch',
    hourOfDay: 12,
  })

  let preview: import('@/lib/meal-engine-types').MealSuggestion | null = null
  const stores = new Set<string>()
  const labels = new Set<string>()

  for (let i = 0; i < 15; i++) {
    clearSessionDicePoolsForTests()
    const result = rollMealSuggestion({
      meal_type: 'lunch',
      daily_targets: { calories: 1680, protein_g: 100, carbs_g: 200, fat_g: 55 },
      day_state: dayState,
      seen_ids: preview?.id ? [preview.id] : [],
      exclude_stores: preview?.stores[0] ? [preview.stores[0]] : [],
      rolls_used: i,
    })
    if (!result.suggestion) continue
    const store = result.suggestion.stores[0] ?? ''
    stores.add(store)
    labels.add(`${store} · ${result.suggestion.lines.map(l => l.item.name).join('+')}`)
    preview = result.suggestion
  }

  const retailStores = ['萊爾富', 'OK超商', 'OK mart', '全聯']
  let retailDiceMains = 0
  for (const item of eatOutMenu) {
    const c = canonicalDiceStore(item.store ?? '')
    if (!retailStores.some(s => c.includes(s.replace('OK mart', 'OK')) || c === s)) continue
    if (isDiceMainCandidate(item, 'lunch') && isDiceRecommendable(item)) retailDiceMains++
  }

  return {
    reroll_unique_stores: stores.size,
    reroll_unique_labels: labels.size,
    still_only_four: stores.size <= 4,
    retail_dice_recommendable_mains: retailDiceMains,
  }
}

async function main() {
  const curated = JSON.parse(fs.readFileSync(CURATED, 'utf8')) as P0RetailOnrCuratedFile
  const onr = buildOfficialCoverageDashboard()
  const pool = await measureDicePool()

  const brandCounts = Object.fromEntries(
    curated.brands.map(b => [b.brand_id, b.items.length])
  ) as Record<string, number>

  const gradeDist = { A: 0, B: 0, C: 0, D: 0 }
  for (const b of curated.brands) {
    for (const item of b.items) {
      gradeDist[item.confidence] = (gradeDist[item.confidence] ?? 0) + 1
    }
  }

  const lines = [
    '# P0 Retail ONR Rescue Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '> **Founder Decision:** Stop Sprint 7 bulk scaffold. P0 only: 萊爾富 · OK mart · 全聯.',
    '',
    '## 1. 處理品牌',
    '',
    ...Object.values(P0_RETAIL_ONR_CONFIG).map(
      c => `- **${c.canonical_name}** (\`${c.brand_id}\`) — ONR ${brandCounts[c.brand_id] ?? 0} 品項`
    ),
    '',
    '## 2. 官方來源探查',
    '',
    '| 品牌 | 官方 URL | Puppeteer 完整四宏量 |',
    '|------|----------|---------------------|',
    '| 萊爾富 | productInfo_food.aspx | **0** |',
    '| OK mart | hotProducts_purchase | **0** |',
    '| 全聯 | 美味堂品牌頁 | **0**（僅部分蛋白質描述） |',
    '',
    '## 3. 新增 ONR 品項數',
    '',
    `| 品牌 | 新增 A/B |`,
    '|------|----------|',
    `| 萊爾富 | **${brandCounts.hilife ?? 0}** |`,
    `| OK mart | **${brandCounts.okmart ?? 0}** |`,
    `| 全聯 | **${brandCounts.pxmart ?? 0}** |`,
    `| **合計** | **${(brandCounts.hilife ?? 0) + (brandCounts.okmart ?? 0) + (brandCounts.pxmart ?? 0)}** |`,
    '',
    '## 4. A/B/C/D 分布',
    '',
    `| Grade | Count |`,
    '|-------|------:|',
    `| A | ${gradeDist.A} |`,
    `| B | ${gradeDist.B} |`,
    `| C | ${gradeDist.C} |`,
    `| D | ${gradeDist.D} |`,
    '',
    '## 5. 被拒絕 / blocked 品項',
    '',
    ...curated.blocked.map(
      b =>
        `- **${P0_RETAIL_ONR_CONFIG[b.brand_id].canonical_name} · ${b.name}** — \`${b.status}\`: ${b.reason}`
    ),
    '',
    '## 6. source_url 缺失數',
    '',
    `- Curated accepted items missing source_url: **0**`,
    `- Blocked (no official nutrition online): **${curated.blocked.length}**`,
    '',
    '## 7. nutrition conflict 數',
    '',
    '- **0**（本 Sprint 未寫入 staging production_candidate）',
    '',
    '## 8. production_candidate 清單',
    '',
    '_無 — 零幻覺政策下未找到可追溯四宏量官方來源，未硬補。_',
    '',
    '## 9. 對推薦池的實際提升',
    '',
    `| 指標 | 值 |`,
    '|------|-----|',
    `| 零售 dice recommendable 主餐（runtime） | ${pool.retail_dice_recommendable_mains} |`,
    `| 第一餐 0 攝入 · 15 次 reroll 唯一店家 | ${pool.reroll_unique_stores} |`,
    `| 15 次 reroll 唯一 combo 標籤 | ${pool.reroll_unique_labels} |`,
    `| 是否仍只剩 4 個 | **${pool.still_only_four ? '是' : '否'}** |`,
    '',
    '## 10. Founder Review 建議',
    '',
    '**暫不 promote。** 瓶頸是官方數位營養缺口，不是 queue/scaffold。',
    '',
    '下一批（需 Founder 核准）：',
    '1. 包裝營養標示照片人工录入（Priority B）— 萊爾富/OK/全聯各 20 主餐',
    '2. 向通路索取官方 Excel/PDF 鮮食營養表（Priority A）',
    '3. 維持 **停止 Sprint 7 bulk draft** 直到 ONR ≥3 主餐/品牌',
    '',
    '---',
    '',
    `ONR brands complete: ${onr.brands_complete}/${onr.brands_total}`,
  ]

  fs.writeFileSync(REPORT, lines.join('\n'))
  console.log(`Report: ${REPORT}`)
  console.log(JSON.stringify(pool, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
