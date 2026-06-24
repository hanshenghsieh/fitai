#!/usr/bin/env node
/**
 * Food Source False Negative Audit — recover brands wrongly quarantined in Phase 1.
 * Does NOT delete, merge, migrate, or update production.
 *
 * Usage: node scripts/food-source-false-negative-audit.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const PRIORITY_SPOTCHECK = [
  '鼎泰豐', '丸龜製麵', '春水堂', '夏慕尼', '西堤牛排', '陶板屋', 'IKEA',
  '星巴克', '路易莎', '藏壽司', '壽司郎', '爭鮮迴轉壽司', '麥當勞', '肯德基', '全聯', '家樂福',
]

const PRIORITY_CATEGORIES = [
  'healthy', 'chain_restaurant', 'convenience_store', 'cafe', 'drink_shop',
  'mall_food_court', 'night_market', 'street_food', 'supermarket',
]

function loadTop300Allowlist() {
  const primary = path.join(ROOT, 'data/food-kb/food-source-allowlist.json')
  const legacy = path.join(ROOT, 'data/food-kb/top300-allowlist.json')
  const fp = fs.existsSync(primary) ? primary : legacy
  if (!fs.existsSync(fp)) return { index: {}, entries: [] }
  return JSON.parse(fs.readFileSync(fp, 'utf8'))
}

function resolveAllowlist(name, allowlist) {
  const key = normalizeKey(name)
  const canonical = allowlist.index?.[key]
  if (!canonical) return null
  return allowlist.entries?.find(e => e.canonical_name === canonical) ?? null
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const header = lines[0].split(',')
  return lines.slice(1).map(line => {
    const cols = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ; continue }
      if (c === ',' && !inQ) { cols.push(cur); cur = ''; continue }
      cur += c
    }
    cols.push(cur)
    const row = {}
    header.forEach((h, i) => { row[h] = cols[i] ?? '' })
    return row
  })
}

function loadBrandRegistry() {
  const text = fs.readFileSync(path.join(ROOT, 'src/lib/food-kb/brand-registry.ts'), 'utf8')
  const brands = []
  const re = /\{\s*slug:\s*'([^']+)',\s*name_zh:\s*(?:'((?:\\'|[^'])*)'|"([^"]*)"),\s*category:\s*'([^']+)',\s*kb_category:\s*'([^']+)'(?:,\s*website:\s*'([^']*)')?[^}]*priority:\s*(\d+)/g
  let m
  while ((m = re.exec(text)) !== null) {
    brands.push({
      slug: m[1],
      name_zh: (m[2] ?? m[3] ?? '').replace(/\\'/g, "'"),
      category: m[4],
      kb_category: m[5],
      website: m[6] || null,
      priority: Number(m[7]),
    })
  }
  return brands
}

function loadMenuDeliverySignals() {
  const files = [
    'final-menu.json', 'restaurant-chains.json', 'restaurant-expanded.json',
  ]
  const byStore = new Map()
  for (const file of files) {
    const fp = path.join(__dirname, file)
    if (!fs.existsSync(fp)) continue
    const items = JSON.parse(fs.readFileSync(fp, 'utf8'))
    for (const item of items) {
      const store = item.store
      if (!store) continue
      const cur = byStore.get(store) ?? { uber: false, foodpanda: false, deliveryCount: 0, total: 0 }
      cur.total++
      if (item.source === 'delivery') {
        cur.deliveryCount++
        const desc = (item.description ?? '').toLowerCase()
        if (desc.includes('uber')) cur.uber = true
        if (desc.includes('foodpanda') || desc.includes('panda')) cur.foodpanda = true
      }
      byStore.set(store, cur)
    }
  }
  return byStore
}

function normalizeKey(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '')
}

function buildAnchorIndex(anchorsData) {
  const byKey = new Map()
  for (const a of anchorsData.anchors) {
    const keys = [a.name, ...(a.aliases ?? [])]
    if (a.parent_registry) keys.push(a.parent_registry)
    for (const k of keys) {
      byKey.set(normalizeKey(k), a)
    }
  }
  return byKey
}

function findAnchor(name, anchorIndex, registryByName) {
  const key = normalizeKey(name)
  if (anchorIndex.has(key)) return { anchor: anchorIndex.get(key), match: 'exact' }

  for (const [k, a] of anchorIndex.entries()) {
    if (key.includes(k) || k.includes(key)) {
      if (Math.min(key.length, k.length) >= 2) return { anchor: a, match: 'partial' }
    }
  }

  const reg = registryByName.get(name)
  if (reg) return { anchor: { name: reg.name_zh, tier: 'registry', parent_registry: reg.name_zh, website: reg.website, category: reg.category }, match: 'registry' }

  for (const b of registryByName.values()) {
    if (name.includes(b.name_zh) && b.name_zh.length >= 2) {
      return { anchor: { name: b.name_zh, tier: 'registry_subbrand', parent_registry: b.name_zh, website: b.website, category: b.category }, match: 'registry_subbrand' }
    }
  }
  return null
}

function isJunk(name, anchorsData) {
  for (const p of anchorsData.junk_patterns) {
    if (new RegExp(p, 'i').test(name)) {
      return anchorsData.junk_notes?.[name] ?? `pattern:${p}`
    }
  }
  return null
}

function deliveryMatch(val, corpus, field) {
  if (val === 'confirmed_offline' || val === 'confirmed_offline') return val
  if (field === 'uber_eats' && corpus?.uber) return 'corpus_delivery'
  if (field === 'foodpanda' && corpus?.foodpanda) return 'corpus_delivery'
  if (field === 'uber_eats' && corpus?.deliveryCount > 0 && val === 'likely') return 'likely'
  if (field === 'foodpanda' && corpus?.deliveryCount > 0 && val === 'likely') return 'likely'
  return val ?? 'no'
}

function reasonForLowScore(row) {
  const parts = []
  const sources = row.verification_sources || ''
  if (!sources.includes('brand_registry')) parts.push('missing_brand_registry')
  if (!sources.includes('google_maps')) parts.push('missing_google_maps_signal')
  if (!sources.includes('official_website')) parts.push('missing_official_website')
  if (!sources.includes('delivery_platform') && !sources.includes('xval_validated')) {
    parts.push('no_delivery_or_xval')
  }
  if (Number(row.item_count) < 3) parts.push('sparse_menu')
  if (row.confidence_level === 'D') parts.push('phase1_score_below_40')
  if (row.keep_status === 'quarantine') parts.push('auto_quarantine')
  if (row.keep_status === 'manual_review') parts.push('flagged_manual_review')
  return parts.join('; ') || 'phase1_offline_gap'
}

function estimateConfidence(row, anchorHit, registryHit, delivery, junk) {
  if (junk) return { level: 'low', score: 15, label: 'likely_junk' }

  let score = 30
  if (registryHit) score += 35
  if (anchorHit?.anchor) {
    const tier = anchorHit.anchor.tier
    if (tier === 'international_chain' || tier === 'national_chain') score += 40
    else if (tier === 'regional_chain' || tier === 'mall_anchor') score += 30
    else if (tier === 'local_famous' || tier === 'delivery_brand') score += 25
    else if (tier === 'registry' || tier === 'registry_subbrand') score += 35
    else score += 20
  }
  if (delivery?.deliveryCount > 0) score += 15
  if (delivery?.uber || delivery?.foodpanda) score += 10
  if (row.verification_sources?.includes('xval_validated')) score += 10
  if (Number(row.item_count) >= 5) score += 5

  score = Math.min(100, score)
  let label = 'unknown'
  if (score >= 85) label = 'very_high'
  else if (score >= 70) label = 'high'
  else if (score >= 50) label = 'medium'
  else label = 'low'
  return { level: label, score, label }
}

function recommendedAction(row, anchorHit, registryHit, est, junk, allowlistEntry) {
  if (allowlistEntry?.quarantine_exempt) return 'restore_keep'
  if (junk) return 'confirm_quarantine'
  if (est.score >= 85 && (anchorHit || registryHit)) return 'restore_keep'
  if (est.score >= 70) return 'add_registry_and_keep'
  if (est.score >= 50 || deliveryHasSignal(row)) return 'manual_verify_keep'
  if (row.keep_status === 'quarantine' && est.score < 40) return 'confirm_quarantine'
  return 'manual_verify'
}

function deliveryHasSignal(row) {
  return row.verification_sources?.includes('delivery_platform') ||
    row.verification_sources?.includes('xval_validated')
}

function isFalseNegative(row, est, junk, anchorHit, registryHit, allowlistEntry) {
  if (allowlistEntry?.quarantine_exempt) return true
  if (junk) return false
  if (row.keep_status === 'keep' || row.keep_status === 'merge') return false
  if (est.score >= 50) return true
  if (anchorHit || registryHit) return true
  if (deliveryHasSignal(row) && Number(row.item_count) >= 3) return true
  return false
}

function isScanned(row) {
  return row.confidence_level === 'D' ||
    row.keep_status === 'quarantine' ||
    row.keep_status === 'manual_review'
}

function csvEscape(v) {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
}

function main() {
  const phase1Path = path.join(ROOT, 'food_source_truth_review.csv')
  if (!fs.existsSync(phase1Path)) {
    console.error('Missing food_source_truth_review.csv — run food-source-truth-audit.mjs first')
    process.exit(1)
  }

  const phase1 = parseCsv(fs.readFileSync(phase1Path, 'utf8'))
  const registry = loadBrandRegistry()
  const registryByName = new Map(registry.map(b => [b.name_zh, b]))
  const anchorsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/real-brand-anchors.json'), 'utf8'))
  const allowlist = loadTop300Allowlist()
  const anchorIndex = buildAnchorIndex(anchorsData)
  const deliveryByStore = loadMenuDeliverySignals()

  const scanned = phase1.filter(isScanned)
  const results = []

  for (const row of scanned) {
    const name = row.original_name
    const junk = isJunk(name, anchorsData)
    const anchorHit = junk ? null : findAnchor(name, anchorIndex, registryByName)
    const registryHit = registryByName.get(name) ??
      (anchorHit?.anchor?.parent_registry ? registryByName.get(anchorHit.anchor.parent_registry) : null)
    const delivery = deliveryByStore.get(name)
    const allowlistEntry = resolveAllowlist(name, allowlist)
    const est = estimateConfidence(row, anchorHit, registryHit, delivery, junk)
    const fn = isFalseNegative(row, est, junk, anchorHit, registryHit, allowlistEntry)

    const anchor = anchorHit?.anchor
    const platform = (field) => {
      const base = anchor?.[field] ?? (registryHit?.website && field === 'official_website' ? 'proxy_registry' : 'no')
      return deliveryMatch(base, delivery, field)
    }

    results.push({
      brand_name: name,
      truth_score: row.truth_score,
      current_status: row.keep_status,
      confidence_level: row.confidence_level,
      source_type: row.source_type,
      item_count: row.item_count,
      reason_for_low_score: reasonForLowScore(row),
      estimated_real_world_confidence: `${est.score} (${est.label})`,
      google_maps_match: platform('google_maps') === 'no' && est.score >= 70 ? 'likely' : (anchor?.google_maps ?? (est.score >= 70 ? 'likely' : 'no')),
      uber_eats_match: platform('uber_eats'),
      foodpanda_match: platform('foodpanda'),
      official_website_match: platform('official_website'),
      wikipedia_match: anchor?.wikipedia ?? (est.score >= 80 ? 'likely' : 'no'),
      false_negative: fn ? 'yes' : 'no',
      anchor_match: anchorHit?.match ?? '',
      anchor_group: anchor?.group ?? registryHit?.name_zh ?? '',
      recommended_action: recommendedAction(row, anchorHit, registryHit, est, junk, allowlistEntry),
      junk_reason: junk ?? '',
    })
  }

  results.sort((a, b) => {
    if (a.false_negative !== b.false_negative) return a.false_negative === 'yes' ? -1 : 1
    const sa = Number(a.estimated_real_world_confidence)
    const sb = Number(b.estimated_real_world_confidence)
    return sb - sa || a.brand_name.localeCompare(b.brand_name, 'zh-TW')
  })

  const falseNegatives = results.filter(r => r.false_negative === 'yes')
  const trueJunk = results.filter(r => r.junk_reason)
  const shouldKeep = results.filter(r =>
    r.recommended_action === 'restore_keep' ||
    r.recommended_action === 'add_registry_and_keep' ||
    r.recommended_action === 'manual_verify_keep'
  )

  const allRealBrands = [
    ...phase1.filter(r => r.confidence_level === 'A' || r.confidence_level === 'B'),
    ...falseNegatives.map(r => ({ original_name: r.brand_name, truth_score: r.estimated_real_world_confidence, restored: 'yes' })),
  ]

  const top300 = [
    ...phase1
      .filter(r => (r.confidence_level === 'A' || r.confidence_level === 'B') && r.keep_status !== 'delete_candidate')
      .map(r => ({
        brand_name: r.original_name,
        truth_score: r.truth_score,
        confidence_level: r.confidence_level,
        source_type: r.source_type,
        keep_status: r.keep_status,
        restored: 'no',
      })),
    ...falseNegatives
      .filter(r => r.recommended_action === 'restore_keep' || r.recommended_action === 'add_registry_and_keep')
      .map(r => ({
        brand_name: r.brand_name,
        truth_score: r.estimated_real_world_confidence.split(' ')[0],
        confidence_level: 'A-restored',
        source_type: r.source_type,
        keep_status: r.recommended_action,
        restored: 'yes',
      })),
  ]
    .sort((a, b) => Number(b.truth_score) - Number(a.truth_score))
    .slice(0, 300)

  const phase2Retention = scanned.length > 0
    ? (shouldKeep.length / scanned.length * 100).toFixed(1)
    : '0'

  const csvHeader = [
    'brand_name', 'truth_score', 'current_status', 'reason_for_low_score',
    'estimated_real_world_confidence', 'google_maps_match', 'uber_eats_match',
    'foodpanda_match', 'official_website_match', 'wikipedia_match', 'recommended_action',
  ]
  const csvLines = [csvHeader.join(',')]
  for (const r of results) {
    csvLines.push(csvHeader.map(h => csvEscape(r[h])).join(','))
  }

  const csvPath = path.join(ROOT, 'false_negative_review.csv')
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8')

  const spotcheck = PRIORITY_SPOTCHECK.map(name => {
    const hit = results.find(r => r.brand_name === name) ??
      phase1.find(r => r.original_name === name)
    return { name, ...(hit ?? { status: 'not_in_scan_set' }) }
  })

  const md = buildReport({
    scanned: scanned.length,
    total: phase1.length,
    falseNegatives,
    trueJunk,
    shouldKeep,
    top300,
    phase2Retention,
    spotcheck,
    results,
    phase1,
  })

  const mdPath = path.join(ROOT, 'docs/FOOD_SOURCE_FALSE_NEGATIVE_AUDIT.md')
  fs.writeFileSync(mdPath, md, 'utf8')

  console.log('Food Source False Negative Audit complete')
  console.log(JSON.stringify({
    scanned: scanned.length,
    false_negative: falseNegatives.length,
    true_junk: trueJunk.length,
    should_keep: shouldKeep.length,
    phase2_retention_pct: phase2Retention,
    top300: top300.length,
  }, null, 2))
  console.log('CSV:', csvPath)
  console.log('Report:', mdPath)
}

function buildReport(ctx) {
  const { scanned, total, falseNegatives, trueJunk, shouldKeep, top300, phase2Retention, spotcheck, results, phase1 } = ctx
  const now = new Date().toISOString()

  return `# Food Source False Negative Audit

**Generated:** ${now}  
**Phase 2 status:** PAUSED — no live API, no delete/merge/migration  
**Input:** \`food_source_truth_review.csv\` (Phase 1) + offline brand anchors + menu delivery corpus

---

## Principle

寧可人工審核 500 筆，不要誤刪 1 個真實品牌。

本報告專門找出 Phase 1 **誤殺（False Negative）**：被標為 D / quarantine / manual_review，但離線交叉驗證顯示為真實品牌。

---

## Summary

| Metric | Count |
|--------|------:|
| Phase 1 總品牌數 | ${total} |
| 本次掃描（D + quarantine + manual_review） | ${scanned} |
| **誤殺品牌（False Negative）** | **${falseNegatives.length}** |
| **真正垃圾資料** | **${trueJunk.length}** |
| **應保留品牌（掃描範圍內）** | **${shouldKeep.length}** |
| **Phase 2 預估保留率** | **${phase2Retention}%** |

> 預估保留率 = 應保留品牌 / 掃描數。代表 Phase 1 低信任品牌中，離線復原後仍建議保留的比例。

---

## 誤殺原因（Phase 1 系統性缺陷）

1. **brand-registry 未收錄** — 鼎泰豐、丸龜製麵、春水堂、王品旗下品牌等不在 registry，離線分數上限約 20–30
2. **別名未合併** — 50嵐↔五十嵐、清心↔清心福全、梁社漢↔梁社漢排骨
3. **子品牌未繼承** — 爭鮮PLUS、好市多熟食↔Costco
4. **外送品牌低估** — 有 Uber Eats / foodpanda corpus 但無 registry 加分
5. **百貨美食街** — 京站/遠東百貨美食街被當一般 chain 且分數過低

---

## 特別檢查（Founder 指定品牌）

| 品牌 | Phase 1 狀態 | 誤殺？ | 建議 |
|------|-------------|--------|------|
${spotcheck.map(s => {
  const r = results.find(x => x.brand_name === s.name)
  const p1 = phase1.find(x => x.original_name === s.name)
  const status = p1?.keep_status ?? s.status ?? '—'
  const fn = r?.false_negative ?? (p1?.confidence_level === 'A' ? 'no (already A)' : '—')
  const action = r?.recommended_action ?? (p1?.keep_status === 'keep' ? 'already_keep' : '—')
  return `| ${s.name} | ${status} | ${fn} | ${action} |`
}).join('\n')}

---

## 真正垃圾資料（確認可 quarantine）

| 品牌 | 原因 |
|------|------|
${trueJunk.filter(r => r.junk_reason).map(r => `| ${r.brand_name} | ${r.junk_reason} |`).join('\n') || '| — | — |'}

---

## 高優先恢復（restore_keep / add_registry_and_keep）

| 品牌 | Phase 1 分數 | 估計真實信心 | 建議 |
|------|------------:|-------------|------|
${falseNegatives
  .filter(r => r.recommended_action === 'restore_keep' || r.recommended_action === 'add_registry_and_keep')
  .slice(0, 50)
  .map(r => `| ${r.brand_name} | ${r.truth_score} | ${r.estimated_real_world_confidence} | ${r.recommended_action} |`)
  .join('\n')}

---

## 健康餐盒掃描（manual_review + quarantine）

| 品牌 | 狀態 | 誤殺 | 外送 corpus | 建議 |
|------|------|------|-------------|------|
${results
  .filter(r => /健康|餐盒|肌|蛋白|低卡|輕食|野宴|盒子/i.test(r.brand_name))
  .map(r => `| ${r.brand_name} | ${r.current_status} | ${r.false_negative} | ${r.uber_eats_match}/${r.foodpanda_match} | ${r.recommended_action} |`)
  .join('\n')}

---

## Top 300 真實品牌

| # | 品牌 | 分數 | 等級 | 類型 | 狀態 |
|---|------|-----:|------|------|------|
${top300.map((r, i) => `| ${i + 1} | ${r.brand_name} | ${r.truth_score} | ${r.confidence_level} | ${r.source_type} | ${r.restored === 'yes' ? '**待恢復**' : r.keep_status} |`).join('\n')}

---

## 輸出檔案

- \`false_negative_review.csv\` — 全掃描結果（${results.length} rows）
- 本報告

---

## Next Steps（需 Founder 確認，仍不執行 production 變更）

1. 將 \`restore_keep\` / \`add_registry_and_keep\` 品牌加入 brand-registry
2. 修正 Phase 1 評分：子品牌繼承、別名合併、外送 corpus 加分
3. 僅對 \`confirm_quarantine\` 的 ${trueJunk.length} 筆考慮隔離
4. Phase 2 恢復後再評估是否啟用 live API 驗證

`
}

main()
