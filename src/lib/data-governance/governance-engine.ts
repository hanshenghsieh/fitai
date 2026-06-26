import fs from 'fs'
import path from 'path'
import type { DatabaseHealthReport, GovernedMenuRecord, PromotionSnapshot, SourceFingerprint } from './types'
import { BDGS_DATA_FREEZE } from './types'
import {
  buildCoverageMetrics,
  buildTopRiskBrands,
  computeHealthScore,
  healthGrade,
  ingestGovernedRecordsFromStaging,
} from './coverage-dashboard'
import { buildReviewQueue, nextReviewDate, partitionReviewQueue } from './review-queue'
import { summarizePromotionPipeline } from './promotion'
import { loadAllOfficialReferences } from '@/lib/nutrition/official-reference/loader'
import { buildOfficialCoverageDashboard } from '@/lib/nutrition/official-reference/coverage'
import { AuditLog } from './audit-log'
import { buildSourceFingerprint, monitorAllSources } from './source-monitor'
import { createPromotionSnapshot } from './rollback'

const GOVERNANCE_DIR = path.join(process.cwd(), 'data', 'food-kb', 'governance')
const FINGERPRINTS_PATH = path.join(GOVERNANCE_DIR, 'source-fingerprints.json')
const STAGING_MANIFEST = path.join(process.cwd(), 'data', 'food-kb', 'staging', 'manifest.json')

export interface GovernanceEngineState {
  records: GovernedMenuRecord[]
  audit: AuditLog
  snapshots: PromotionSnapshot[]
  source_fingerprints: SourceFingerprint[]
}

export function loadGovernanceFingerprints(): SourceFingerprint[] {
  if (!fs.existsSync(FINGERPRINTS_PATH)) return []
  const data = JSON.parse(fs.readFileSync(FINGERPRINTS_PATH, 'utf8')) as {
    fingerprints: SourceFingerprint[]
  }
  return data.fingerprints ?? []
}

export function saveGovernanceFingerprints(fingerprints: SourceFingerprint[]): void {
  fs.mkdirSync(GOVERNANCE_DIR, { recursive: true })
  fs.writeFileSync(
    FINGERPRINTS_PATH,
    JSON.stringify({ generated_at: new Date().toISOString(), fingerprints }, null, 2)
  )
}

export function buildSourceFingerprintsFromOnr(now?: string): SourceFingerprint[] {
  const checked = now ?? new Date().toISOString()
  return loadAllOfficialReferences().map(ref =>
    buildSourceFingerprint({
      brand: ref.metadata.canonical_name,
      source_url: ref.metadata.nutrition_source_url,
      official_version: ref.metadata.official_version,
      content: `${ref.metadata.nutrition_source_url}|${ref.metadata.official_version}|${ref.menu.length}`,
      checked_at: checked,
    })
  )
}

export function loadGovernanceEngineState(): GovernanceEngineState {
  const manifest = fs.existsSync(STAGING_MANIFEST)
    ? (JSON.parse(fs.readFileSync(STAGING_MANIFEST, 'utf8')) as { restaurants: unknown[] })
    : null
  const records = ingestGovernedRecordsFromStaging(
    manifest as Parameters<typeof ingestGovernedRecordsFromStaging>[0]
  )
  return {
    records,
    audit: new AuditLog(),
    snapshots: [],
    source_fingerprints: loadGovernanceFingerprints(),
  }
}

export function runSourceMonitorDaily(state: GovernanceEngineState): {
  results: ReturnType<typeof monitorAllSources>
  updated_fingerprints: SourceFingerprint[]
} {
  const current = buildSourceFingerprintsFromOnr()
  const results = monitorAllSources(state.source_fingerprints, current)
  return { results, updated_fingerprints: current }
}

export function buildDatabaseHealthReport(state?: GovernanceEngineState): DatabaseHealthReport {
  const s = state ?? loadGovernanceEngineState()
  const coverage = buildCoverageMetrics(s.records)
  const health_score = computeHealthScore(coverage)
  const queue = buildReviewQueue(s.records)
  const parts = partitionReviewQueue(queue)
  const onrDash = buildOfficialCoverageDashboard()

  const sourceFlags = new Map<string, { source_changed: boolean }>()
  const monitor = runSourceMonitorDaily(s)
  for (const r of monitor.results) {
    if (r.requires_pending_review) {
      const brandRecords = s.records.filter(x => x.brand === r.brand)
      for (const rec of brandRecords) {
        sourceFlags.set(rec.record_id, { source_changed: true })
      }
    }
  }
  const queueWithSource = buildReviewQueue(s.records, sourceFlags)

  return {
    generated_at: new Date().toISOString(),
    freeze_active: BDGS_DATA_FREEZE,
    coverage,
    health_score,
    health_grade: healthGrade(health_score),
    top_risk_brands: buildTopRiskBrands(s.records),
    next_review_date: nextReviewDate(queueWithSource),
    promotion_pipeline_summary: summarizePromotionPipeline(s.records),
    missing_onr_brands: onrDash.missing_official_source.slice(0, 50),
  }
}

export function formatDatabaseHealthReportMd(report: DatabaseHealthReport): string {
  const c = report.coverage
  const lines = [
    '# Database Health Report',
    '',
    `Generated: ${report.generated_at}`,
    '',
    report.freeze_active
      ? '> **BDGS Data Freeze ACTIVE** — no new restaurants, menus, ONR, or Food DNA until governance complete.'
      : '',
    '',
    '## Health Score',
    '',
    `| Score | Grade |`,
    `|------:|-------|`,
    `| **${report.health_score}** | **${report.health_grade}** |`,
    '',
    '## 1. Restaurant Coverage',
    '',
    `- **${c.restaurant_with_menu} / ${c.restaurant_allowlist_total}** (${c.restaurant_coverage_pct}%)`,
    '',
    '## 2. ONR Coverage',
    '',
    `- Brands: **${c.onr_brands}** · Items: **${c.onr_items}** · Coverage: **${c.onr_coverage_pct}%**`,
    '',
    '## 3. Food DNA Coverage',
    '',
    `- Templates: **${c.food_dna_templates}** · Coverage: **${c.food_dna_coverage_pct}%**`,
    '',
    '## 4. Pending Review',
    '',
    `**${c.pending_review_count}**`,
    '',
    '## 5. Need Review',
    '',
    `**${c.need_review_count}**`,
    '',
    '## 6. Deprecated',
    '',
    `**${c.deprecated_count}**`,
    '',
    '## 7. Health Score Breakdown',
    '',
    `Composite score: **${report.health_score}/100** (grade ${report.health_grade})`,
    '',
    '## 8. Top Risk Brands',
    '',
  ]

  if (!report.top_risk_brands.length) lines.push('_None_')
  else {
    lines.push('| Brand | Risk | Pending | Need | Deprecated | ONR | Reasons |')
    lines.push('|-------|-----:|--------:|-----:|-----------:|:---:|---------|')
    for (const b of report.top_risk_brands) {
      lines.push(
        `| ${b.brand} | ${b.risk_score} | ${b.pending_review} | ${b.need_review} | ${b.deprecated} | ${b.onr_missing ? '❌' : '✅'} | ${b.reasons.join(', ')} |`
      )
    }
  }

  lines.push('', '## 9. Next Review Date', '', report.next_review_date ?? '_None scheduled_', '')
  lines.push('## Additional Coverage', '')
  lines.push(`| Dimension | Value |`)
  lines.push(`|-----------|------:|`)
  lines.push(`| Menu items (staging) | ${c.menu_items_total} |`)
  lines.push(`| Menu coverage | ${c.menu_coverage_pct}% |`)
  lines.push(`| Recommendation coverage | ${c.recommendation_coverage_pct}% |`)
  lines.push(`| QA coverage | ${c.qa_coverage_pct}% |`)
  lines.push('')
  lines.push('## Promotion Pipeline', '')
  lines.push('| Stage | Count |')
  lines.push('|-------|------:|')
  for (const [stage, count] of Object.entries(report.promotion_pipeline_summary)) {
    lines.push(`| ${stage} | ${count} |`)
  }
  lines.push('', '## Missing ONR (top 50)', '')
  for (const m of report.missing_onr_brands) lines.push(`- ${m}`)

  return lines.filter(Boolean).join('\n')
}

export function snapshotBeforePromotion(
  state: GovernanceEngineState,
  input: { actor: string; reason: string; stage: PromotionSnapshot['stage'] }
): PromotionSnapshot {
  const snap = createPromotionSnapshot({
    records: state.records,
    stage: input.stage,
    actor: input.actor,
    reason: input.reason,
  })
  state.snapshots.push(snap)
  return snap
}

export { BDGS_DATA_FREEZE, REVIEW_CYCLE_DAYS } from './types'
