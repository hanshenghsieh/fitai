#!/usr/bin/env node
/**
 * Builds recommendation v2 food database (official + standard estimate + merged + report)
 * Run: node scripts/food-kb/build-recommendation-foods-v2.mjs
 */
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildOfficialItems } from './recommendation-v2/official-import.mjs'
import { buildStandardEstimateItems } from './recommendation-v2/standard-estimate-templates.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KB_DIR = join(__dirname, '../../data/food-kb')
const TODAY = '2026-06-18'

const { items: officialItems, report: officialReport } = buildOfficialItems()
const standardItems = buildStandardEstimateItems()

// Deduplicate merged by id
const byId = new Map()
for (const item of [...officialItems, ...standardItems]) {
  if (!byId.has(item.id)) byId.set(item.id, item)
}
const merged = [...byId.values()]

const officialPayload = {
  version: '2.1.0',
  updated_at: TODAY,
  description: 'BetterBit 官方可驗證營養資料（連鎖、超商官方標示）',
  items: officialItems,
}

const standardPayload = {
  version: '2.1.0',
  updated_at: TODAY,
  description: 'BetterBit 台灣外食標準份量估算資料（主力推薦池）',
  items: standardItems,
}

const mergedPayload = {
  version: '2.1.0',
  updated_at: TODAY,
  description: 'BetterBit v2 整合推薦資料 = official-foods-v2 + standard-estimate-foods-v2',
  items: merged,
}

const isMainPool = i =>
  i.is_recommendable &&
  ['main_meal', 'light_meal'].includes(i.meal_role) &&
  ['single_main', 'combo'].includes(i.portion_type) &&
  ['official', 'estimated'].includes(i.confidence_level)

const reportPayload = {
  version: '2.1.0',
  updated_at: TODAY,
  sources: [
    ...officialReport,
    {
      brand: 'standard_estimate_templates',
      source_type: 'standard_estimate',
      imported_count: standardItems.filter(isMainPool).length,
      skipped_count: standardItems.filter(i => !isMainPool(i)).length,
      skip_reason: 'addons,blocked_roles,low_estimate',
      last_updated: TODAY,
    },
  ],
  summary: {
    official_items: officialItems.length,
    standard_estimate_items: standardItems.length,
    merged_total: merged.length,
    main_pool: merged.filter(isMainPool).length,
    addon_blocked: merged.filter(i => !isMainPool(i)).length,
    official_recommendable: merged.filter(i => i.confidence_level === 'official' && isMainPool(i)).length,
    estimated_recommendable: merged.filter(i => i.confidence_level === 'estimated' && isMainPool(i)).length,
    low_estimate: merged.filter(i => i.confidence_level === 'low_estimate').length,
  },
}

writeFileSync(join(KB_DIR, 'official-foods-v2.json'), JSON.stringify(officialPayload, null, 2) + '\n')
writeFileSync(join(KB_DIR, 'standard-estimate-foods-v2.json'), JSON.stringify(standardPayload, null, 2) + '\n')
writeFileSync(join(KB_DIR, 'recommendation-foods-v2.json'), JSON.stringify(mergedPayload, null, 2) + '\n')
writeFileSync(join(KB_DIR, 'recommendation-source-report-v2.json'), JSON.stringify(reportPayload, null, 2) + '\n')

console.log('Recommendation v2 build complete')
console.log(reportPayload.summary)
