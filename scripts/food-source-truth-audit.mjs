#!/usr/bin/env node
/**
 * Food Source Truth Audit — cross-source scoring (offline heuristics + existing xval).
 * Does NOT delete or modify production data.
 *
 * Usage: node scripts/food-source-truth-audit.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const DELETE_PATTERNS = [
  /^test$/i, /^demo$/i, /^sample$/i, /^restaurant_test$/i, /^abc$/i, /^123$/,
  /^undefined$/i, /^null$/i, /^fake$/i, /^placeholder$/i,
  /^未命名$/, /^商家名稱$/, /^餐廳名稱$/, /^測試店家$/, /^隨機店$/,
  /^自助餐組件$/,
]
const DELETE_SUBSTRINGS = ['test_', '_test', 'demo_', 'placeholder', 'lorem', 'xxx']

const PROTECTED_CONVENIENCE = ['7-11', '7-ELEVEN', '全家', '萊爾富', 'OK超商', 'OK mart', 'OK Mart', '美廉社']
const PROTECTED_SUPERMARKET = ['全聯', '家樂福', '愛買', 'Costco', '大潤發', "Mia C'bon", "Jason's"]
const PROTECTED_MALL = [
  '新光三越', 'SOGO', '遠東SOGO', '微風', '台北101', '台北 101', '誠品', '誠品生活',
  '遠百', '環球購物中心', '環球', '南紡', '夢時代', 'LaLaport', 'lalaport',
]

const CANONICAL_ALIASES = {
  'mcdonalds': '麥當勞', "mcdonald's": '麥當勞', mcdonald: '麥當勞',
  '7-eleven': '7-11', '7-ELEVEN': '7-11',
  'ok mart': 'OK超商', 'okmart': 'OK超商',
  '路易莎咖啡': '路易莎', 'cama café': 'cama', 'cama咖啡': 'cama',
  'fitbox': 'FitBox', 'FITBOX': 'FitBox',
  'subway': 'Subway', 'costco': 'Costco',
}

function loadMenuItems() {
  const convenience = JSON.parse(fs.readFileSync(path.join(__dirname, 'final-menu.json'), 'utf8'))
  const chains = JSON.parse(fs.readFileSync(path.join(__dirname, 'restaurant-chains.json'), 'utf8'))
  const expanded = JSON.parse(fs.readFileSync(path.join(__dirname, 'restaurant-expanded.json'), 'utf8'))
  const chainExpansionPath = path.join(__dirname, 'food-kb/seeds/chain-expansion.json')
  const chainExpansion = fs.existsSync(chainExpansionPath)
    ? JSON.parse(fs.readFileSync(chainExpansionPath, 'utf8'))
    : []

  const generatedDir = path.join(__dirname, 'food-kb/seeds/generated')
  const generatedSeeds = []
  if (fs.existsSync(generatedDir)) {
    for (const file of fs.readdirSync(generatedDir)) {
      if (!file.endsWith('.json') || file === 'manifest.json') continue
      generatedSeeds.push(...JSON.parse(fs.readFileSync(path.join(generatedDir, file), 'utf8')))
    }
  }

  const seen = new Set()
  const merged = []
  for (const item of [...convenience, ...chains, ...expanded, ...chainExpansion, ...generatedSeeds]) {
    const id = item.id ?? `${item.store}-${item.name}`
    if (seen.has(id)) continue
    seen.add(id)
    merged.push({
      ...item,
      source: item.source ?? (item.store?.includes('7-11') || item.store === '全家' ? 'convenience' : 'chain'),
    })
  }
  return merged
}

function loadBrandRegistry() {
  const text = fs.readFileSync(path.join(ROOT, 'src/lib/food-kb/brand-registry.ts'), 'utf8')
  const brands = []
  const re = /\{\s*slug:\s*'([^']+)',\s*name_zh:\s*'([^']+)',\s*category:\s*'([^']+)',\s*kb_category:\s*'([^']+)'(?:,\s*website:\s*'([^']*)')?[^}]*priority:\s*(\d+)/g
  let m
  while ((m = re.exec(text)) !== null) {
    brands.push({
      slug: m[1], name_zh: m[2], category: m[3], kb_category: m[4],
      website: m[5] || null, priority: Number(m[6]),
    })
  }
  return brands
}

function loadXvalByStore() {
  const fp = path.join(ROOT, 'data/food-kb/xval-report.json')
  if (!fs.existsSync(fp)) return new Map()
  const report = JSON.parse(fs.readFileSync(fp, 'utf8'))
  const byStore = new Map()
  const all = [
    ...(report.validated_samples ?? []),
    ...(report.conflict_samples ?? []),
    ...(report.insufficient_samples ?? []),
  ]
  for (const row of all) {
    const store = row.store
    if (!store) continue
    const cur = byStore.get(store) ?? {
      validated: 0, conflicts: 0, insufficient: 0,
      hasOfficial: false, hasBlog: false, hasLegacy: false, sourceTypes: new Set(),
    }
    if (row.status === 'validated') cur.validated++
    else if (row.status === 'conflict') cur.conflicts++
    else cur.insufficient++
    for (const s of row.source_types ?? []) {
      cur.sourceTypes.add(s)
      if (s === 'official_website') cur.hasOfficial = true
      if (s === 'blog' || s === 'news') cur.hasBlog = true
      if (s === 'legacy_import') cur.hasLegacy = true
    }
    byStore.set(store, cur)
  }
  return byStore
}

function normalizeKey(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '')
}

function parseCanonicalBranch(original, registryBrands) {
  let name = original.trim()
  let branch = ''

  const branchPatterns = [
    /^(.+?)[\s\-—](台北|台中|高雄|新北|桃園|台南|板橋|西門|信義|車站|百貨).+店$/,
    /^(.+?)\s*[（(](Uber Eats|foodpanda|外送)[)）]$/,
  ]
  for (const re of branchPatterns) {
    const m = name.match(re)
    if (m) {
      name = m[1].trim()
      branch = original.replace(m[1], '').trim().replace(/^[\s\-—]+/, '')
    }
  }

  // Map to registry canonical when store name contains registry name
  for (const b of registryBrands) {
    if (name.includes(b.name_zh) && b.name_zh.length >= 2) {
      if (b.name_zh.length >= name.length || name.startsWith(b.name_zh)) {
        name = b.name_zh
      }
    }
  }

  const aliasKey = normalizeKey(name)
  if (CANONICAL_ALIASES[aliasKey]) name = CANONICAL_ALIASES[aliasKey]

  // Strip trailing branch markers
  const branchMatch = name.match(/^(.+?)(台北|台中|高雄|台南|新北|桃園|板橋|信義|西門|車站).+店$/)
  if (branchMatch) {
    name = branchMatch[1].trim()
    branch = branch || original.slice(branchMatch[1].length).trim()
  }

  return { canonical: name, branch }
}

function isDeleteCandidate(name) {
  if (!name || name.length < 2) return 'name_too_short'
  if (/^\d+$/.test(name)) return 'numeric_only'
  if (/^[\x00-\x1f\uFFFD]+$/.test(name)) return 'garbled'
  for (const p of DELETE_PATTERNS) {
    if (p.test(name)) return `pattern:${p}`
  }
  const lower = name.toLowerCase()
  for (const s of DELETE_SUBSTRINGS) {
    if (lower.includes(s)) return `substring:${s}`
  }
  if (name.includes('精選')) return 'template_junk'
  return null
}

function inferSourceType(store, meta, registry) {
  if (PROTECTED_CONVENIENCE.some(p => store.includes(p) || p.includes(store))) return 'convenience_store'
  if (PROTECTED_SUPERMARKET.some(p => store.includes(p))) return 'supermarket'
  if (PROTECTED_MALL.some(p => store.includes(p))) return 'mall_food_court'
  if (store === '台灣夜市' || meta.kb_category === 'night_market') return 'night_market'
  if (meta.deliveryOnly) return 'delivery_only'
  if (registry?.category === 'coffee') return 'cafe'
  if (registry?.category === 'bubble_tea') return 'drink_shop'
  if (registry?.category === 'breakfast') return 'street_food'
  if (registry?.category === 'convenience') return 'convenience_store'
  if (registry?.category === 'supermarket') return 'supermarket'
  if (registry?.category === 'night_market') return 'night_market'
  if (meta.convenienceCount > 0 && meta.chainCount === 0) return 'convenience_store'
  if (meta.chainCount > 0) return 'chain_restaurant'
  if (meta.itemCount >= 1 && !registry) return 'local_restaurant'
  return 'unknown'
}

function loadTop300Allowlist() {
  const primary = path.join(ROOT, 'data/food-kb/food-source-allowlist.json')
  const legacy = path.join(ROOT, 'data/food-kb/top300-allowlist.json')
  const fp = fs.existsSync(primary) ? primary : legacy
  if (!fs.existsSync(fp)) return { index: {}, entries: [] }
  return JSON.parse(fs.readFileSync(fp, 'utf8'))
}

function resolveAllowlist(store, allowlist) {
  const key = normalizeKey(store)
  const canonical = allowlist.index?.[key]
  if (!canonical) return null
  return allowlist.entries?.find(e => e.canonical_name === canonical) ?? null
}

function scoreStore(store, meta, registry, xval, allowlistEntry) {
  if (meta.deleteReason) {
    return { score: 0, sources: [], level: 'D' }
  }

  const sources = []
  let score = 0

  if (registry) {
    sources.push('brand_registry')
    score += 20
    if (registry.website) {
      sources.push('official_website_registry')
      score += 30
    }
    if (registry.priority >= 8) {
      sources.push('google_maps_proxy_chain_tier')
      score += 30
    } else if (registry.priority >= 6) {
      sources.push('google_maps_proxy_chain_tier')
      score += 20
    }
  }

  if (xval?.hasOfficial) {
    sources.push('official_website_xval')
    score += 30
  }
  if (xval?.validated > 0) {
    sources.push('xval_validated')
    score += 15
  }
  if (meta.deliveryCount > 0) {
    sources.push('delivery_platform')
    score += 20
  }
  if (xval?.hasBlog) {
    sources.push('blog_news')
    score += 10
  }
  if (registry && registry.priority >= 7) {
    sources.push('social_official_proxy')
    score += 15
  }

  const isMall = PROTECTED_MALL.some(p => store.includes(p))
  if (isMall) {
    sources.push('mall_official_proxy')
    score += 20
  }

  if (store.length >= 2 && /[\u4e00-\u9fffA-Za-z]/.test(store)) {
    sources.push('searchable_name')
    score += 10
  }

  if (meta.itemCount >= 3) {
    sources.push('menu_exists')
    score += 10
  } else if (meta.itemCount >= 1) {
    score += 5
  }

  if (registry && meta.nameVariants.size <= 1) {
    sources.push('name_consistent')
    score += 10
  }

  // Protected anchors — floor score
  const protectedList = [...PROTECTED_CONVENIENCE, ...PROTECTED_SUPERMARKET, ...PROTECTED_MALL]
  if (protectedList.some(p => store === p || store.includes(p))) {
    sources.push('protected_anchor')
    score = Math.max(score, 85)
  }

  if (store === '台灣夜市') {
    sources.push('night_market_virtual')
    score = Math.max(score, 75)
  }

  if (allowlistEntry?.quarantine_exempt) {
    sources.push('top300_allowlist')
    if (allowlistEntry.seed_priority === 'P1' || allowlistEntry.needs_cross_validation) {
      sources.push('p1_seed_needs_xval')
      score = Math.max(score, 85)
    } else {
      score = Math.max(score, allowlistEntry.confidence_level === 'A' ? 92 : 85)
    }
  }

  score = Math.min(100, score)

  let level = 'D'
  if (score >= 80) level = 'A'
  else if (score >= 60) level = 'B'
  else if (score >= 40) level = 'C'

  return { score, sources: [...new Set(sources)], level }
}

function keepStatus(record) {
  if (record.top300_exempt) return 'keep'
  if (record.delete_reason) return 'delete_candidate'
  if (record.merge_target && record.merge_target !== record.original_name) return 'merge'
  if (record.truth_score < 40) return 'quarantine'
  if (record.truth_score < 60) return 'manual_review'
  if (record.needs_manual_review === 'yes') return 'manual_review'
  return 'keep'
}

function csvEscape(val) {
  const s = val == null ? '' : String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function main() {
  const items = loadMenuItems()
  const registry = loadBrandRegistry()
  const allowlist = loadTop300Allowlist()
  const registryByName = new Map(registry.map(b => [b.name_zh, b]))
  const registryBySlug = new Map(registry.map(b => [b.slug, b]))
  const xvalByStore = loadXvalByStore()

  const storeMeta = new Map()

  for (const item of items) {
    const store = (item.store ?? '').trim()
    if (!store) continue
    const cur = storeMeta.get(store) ?? {
      itemCount: 0,
      convenienceCount: 0,
      chainCount: 0,
      deliveryCount: 0,
      deliveryOnly: true,
      descriptions: new Set(),
      nameVariants: new Set([store]),
      sampleIds: [],
    }
    cur.itemCount++
    if (item.source === 'convenience') cur.convenienceCount++
    if (item.source === 'chain') { cur.chainCount++; cur.deliveryOnly = false }
    if (item.source === 'delivery') {
      cur.deliveryCount++
      if (item.description?.includes('Uber') || item.description?.includes('foodpanda')) {
        cur.descriptions.add(item.description)
      }
    } else {
      cur.deliveryOnly = cur.deliveryOnly && item.source === 'delivery'
    }
    if (cur.sampleIds.length < 3) cur.sampleIds.push(item.id)
    storeMeta.set(store, cur)
  }

  // Include registry brands not in menu
  for (const b of registry) {
    if (!storeMeta.has(b.name_zh)) {
      storeMeta.set(b.name_zh, {
        itemCount: 0, convenienceCount: 0, chainCount: 0, deliveryCount: 0,
        deliveryOnly: false, descriptions: new Set(), nameVariants: new Set([b.name_zh]), sampleIds: [],
        registryOnly: true,
      })
    }
  }

  const records = []
  const canonicalGroups = new Map()

  for (const [originalName, meta] of storeMeta.entries()) {
    const { canonical, branch } = parseCanonicalBranch(originalName, registry)
    const deleteReason = isDeleteCandidate(originalName) ?? isDeleteCandidate(canonical)
    const reg =
      registryByName.get(originalName) ??
      registryByName.get(canonical) ??
      registryBySlug.get(normalizeKey(originalName))

    const xval = xvalByStore.get(originalName) ?? xvalByStore.get(canonical)
    const allowlistEntry = resolveAllowlist(originalName, allowlist) ?? resolveAllowlist(canonical, allowlist)
    const { score, sources, level } = scoreStore(originalName, { ...meta, deleteReason }, reg, xval, allowlistEntry)

    const sourceType = inferSourceType(originalName, meta, reg)

    const needsManual =
      !deleteReason &&
      (level === 'C' || level === 'D' || meta.itemCount === 0 || (!reg && meta.deliveryCount === 0 && meta.chainCount === 0))

    const rec = {
      id: `store_${normalizeKey(originalName).slice(0, 40) || 'empty'}`,
      original_name: originalName,
      canonical_name: canonical,
      branch_name: branch,
      source_type: sourceType,
      city: '',
      address: '',
      truth_score: deleteReason ? 0 : score,
      confidence_level: deleteReason ? 'D' : level,
      verification_sources: sources.join('|'),
      keep_status: '',
      delete_reason: deleteReason ?? '',
      merge_target: canonical,
      needs_manual_review: needsManual ? 'yes' : 'no',
      top300_exempt: Boolean(allowlistEntry?.quarantine_exempt),
      item_count: meta.itemCount,
    }
    rec.keep_status = keepStatus(rec)
    records.push(rec)

    const g = canonicalGroups.get(canonical) ?? []
    g.push(originalName)
    canonicalGroups.set(canonical, g)
  }

  // Fix merge targets where multiple originals map to same canonical
  for (const rec of records) {
    const group = canonicalGroups.get(rec.canonical_name) ?? []
    if (group.length > 1 && rec.original_name !== rec.canonical_name) {
      rec.merge_target = rec.canonical_name
      if (rec.keep_status === 'keep') rec.keep_status = 'merge'
    }
  }

  records.sort((a, b) => b.truth_score - a.truth_score || a.original_name.localeCompare(b.original_name, 'zh-TW'))

  const stats = {
    total: records.length,
    A: records.filter(r => r.confidence_level === 'A' && !r.delete_reason).length,
    B: records.filter(r => r.confidence_level === 'B').length,
    C: records.filter(r => r.confidence_level === 'C').length,
    D: records.filter(r => r.confidence_level === 'D' && r.keep_status !== 'delete_candidate').length,
    delete_candidate: records.filter(r => r.keep_status === 'delete_candidate').length,
    quarantine: records.filter(r => r.keep_status === 'quarantine').length,
    merge: records.filter(r => r.keep_status === 'merge').length,
    manual_review: records.filter(r => r.keep_status === 'manual_review').length,
    menu_items: items.length,
  }

  const csvHeader = [
    'id', 'original_name', 'canonical_name', 'branch_name', 'source_type', 'city', 'address',
    'truth_score', 'confidence_level', 'verification_sources', 'keep_status', 'delete_reason',
    'merge_target', 'needs_manual_review', 'item_count',
  ]
  const csvLines = [csvHeader.join(',')]
  for (const r of records) {
    csvLines.push(csvHeader.map(h => csvEscape(r[h])).join(','))
  }

  const csvPath = path.join(ROOT, 'food_source_truth_review.csv')
  fs.writeFileSync(csvPath, '\uFEFF' + csvLines.join('\n'), 'utf8')

  const top200 = records.filter(r => r.keep_status !== 'delete_candidate').slice(0, 200)
  const suspicious100 = [...records]
    .filter(r => r.keep_status !== 'delete_candidate')
    .sort((a, b) => a.truth_score - b.truth_score || b.item_count - a.item_count)
    .slice(0, 100)

  const duplicateBrands = [...canonicalGroups.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([canonical, names]) => ({ canonical, count: names.length, variants: names }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)

  const protectedAudit = {
    convenience: PROTECTED_CONVENIENCE.map(name => {
      const hit = records.find(r => r.original_name === name || r.canonical_name === name)
      return { name, found: !!hit, score: hit?.truth_score ?? 0, keep: hit?.keep_status ?? 'missing' }
    }),
    supermarket: PROTECTED_SUPERMARKET.map(name => {
      const hit = records.find(r => r.original_name.includes(name) || r.canonical_name.includes(name))
      return { name, found: !!hit, score: hit?.truth_score ?? 0, keep: hit?.keep_status ?? 'missing' }
    }),
    mall: PROTECTED_MALL.map(name => {
      const hit = records.find(r => r.original_name.includes(name))
      return { name, found: !!hit, score: hit?.truth_score ?? 0, keep: hit?.keep_status ?? 'not_in_menu' }
    }),
    night_market: records.filter(r => r.source_type === 'night_market').map(r => ({
      name: r.original_name, score: r.truth_score, keep: r.keep_status,
    })),
  }

  const md = buildMarkdown({ stats, top200, suspicious100, duplicateBrands, protectedAudit, records })

  const mdPath = path.join(ROOT, 'docs/FOOD_SOURCE_TRUTH_AUDIT.md')
  fs.mkdirSync(path.dirname(mdPath), { recursive: true })
  fs.writeFileSync(mdPath, md, 'utf8')

  console.log('Food Source Truth Audit complete')
  console.log(JSON.stringify(stats, null, 2))
  console.log(`CSV: ${csvPath}`)
  console.log(`Report: ${mdPath}`)
}

function buildMarkdown({ stats, top200, suspicious100, duplicateBrands, protectedAudit, records }) {
  const senDu = records.find(r => r.original_name === '森度餐廚')
  return `# Food Source Truth Audit

**Generated:** ${new Date().toISOString()}  
**Method:** Offline cross-reference (menu corpus + brand registry + xval-report)  
**Status:** Review only — **no production data modified**

---

## Philosophy

寧願慢，不要假。寧願少一點，不要髒資料。

本報告為 **Phase 1 離線審計**。分數來自：
- \`brand-registry.ts\` 官方品牌清單
- \`xval-report.json\` 既有交叉驗證
- 菜單 corpus（final-menu + chains + expanded + seeds）
- 保護清單（便利商店 / 超市 / 百貨 / 夜市）

**Phase 2（Founder 核准後）：** Google Maps / 外送平台 API 即時驗證。

---

## Summary

| Metric | Count |
|--------|------:|
| 原始資料總數（唯一店家/品牌） | ${stats.total} |
| 菜單品項總數 | ${stats.menu_items} |
| **A 級** (≥80) | ${stats.A} |
| **B 級** (60–79) | ${stats.B} |
| **C 級** (40–59) | ${stats.C} |
| **D 級** (<40) | ${stats.D} |
| delete_candidate | ${stats.delete_candidate} |
| quarantine | ${stats.quarantine} |
| merge | ${stats.merge} |
| 需人工審核 | ${stats.manual_review} |

---

## Truth Score Rules (Applied)

| Signal | Points |
|--------|--------|
| brand_registry 命中 | +20 |
| official_website (registry) | +30 |
| official_website (xval) | +30 |
| google_maps_proxy (registry priority) | +20~30 |
| delivery_platform | +20 |
| social_official_proxy | +15 |
| mall_official_proxy | +20 |
| blog/news (xval) | +10 |
| searchable_name | +10 |
| menu_exists (≥3 items) | +10 |
| name_consistent | +10 |
| protected_anchor floor | min 85 |

---

## Trust Levels

- **A (≥80):** 可直接保留
- **B (60–79):** 保留，confidence=medium
- **C (40–59):** 暫留但不優先推薦
- **D (<40):** quarantine，不進正式推薦

---

## Protected Categories Status

### 便利商店
${protectedAudit.convenience.map(r => `- ${r.name}: ${r.found ? `✓ score ${r.score} (${r.keep})` : '✗ not found'}`).join('\n')}

### 超市
${protectedAudit.supermarket.map(r => `- ${r.name}: ${r.found ? `✓ score ${r.score} (${r.keep})` : '✗ not found'}`).join('\n')}

### 百貨美食街（關鍵字）
${protectedAudit.mall.map(r => `- ${r.name}: ${r.found ? `✓ in corpus` : '— not as store name (expected)'}`).join('\n')}

### 夜市
${protectedAudit.night_market.map(r => `- ${r.name}: score ${r.score} · ${r.keep}`).join('\n') || '- (none tagged)'}

---

## 森度餐廚（個案）

${senDu ? `| Field | Value |
|-------|-------|
| original_name | ${senDu.original_name} |
| truth_score | ${senDu.truth_score} |
| confidence | ${senDu.confidence_level} |
| keep_status | ${senDu.keep_status} |
| source_type | ${senDu.source_type} |
| item_count | ${senDu.item_count} |
| verification | ${senDu.verification_sources} |

**結論：** 在 runtime 菜單中存在，但 **不在 brand-registry** → 分數偏低，建議 Phase 2 用 Google Maps / Uber Eats 驗證後再決定 keep 或 quarantine。` : '未找到'}

---

## Top 200 高信任食物來源

| # | 品牌 | Score | Level | Type | Items | Keep |
|---|------|------:|-------|------|------:|------|
${top200.map((r, i) => `| ${i + 1} | ${r.original_name} | ${r.truth_score} | ${r.confidence_level} | ${r.source_type} | ${r.item_count} | ${r.keep_status} |`).join('\n')}

---

## 最可疑 100 筆（非 delete_candidate）

| # | 品牌 | Score | Level | Items | Reason |
|---|------|------:|-------|------:|--------|
${suspicious100.map((r, i) => `| ${i + 1} | ${r.original_name} | ${r.truth_score} | ${r.confidence_level} | ${r.item_count} | ${r.delete_reason || r.verification_sources || 'low verification'} |`).join('\n')}

---

## 最常見重複品牌（canonical 合併候選）

| Canonical | Variants | Names |
|-----------|----------|-------|
${duplicateBrands.slice(0, 30).map(d => `| ${d.canonical} | ${d.count} | ${d.variants.join(' · ')} |`).join('\n')}

---

## Outputs

- \`food_source_truth_review.csv\` — 全量審核（${stats.total} rows）
- 本報告

---

## Next Steps (Founder 確認後)

1. Phase 2：對 C/D 級 + manual_review 跑 Google Maps / 外送 API
2. 執行 merge（canonical 合併）
3. quarantine → \`data/food-kb/quarantine/\`
4. delete_candidate → 隔離，不直接刪
5. 更新 brand-registry 收錄已驗證在地名店

**不執行：** production migration · 菜單直接覆寫 · 自動刪除
`
}

main()
