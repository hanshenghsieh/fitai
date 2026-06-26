import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AuditLog, auditNutritionChange, auditPromotion, createAuditEntry } from './data-governance/audit-log'
import {
  buildCoverageMetrics,
  computeHealthScore,
  healthGrade,
  ingestGovernedRecordsFromStaging,
} from './data-governance/coverage-dashboard'
import {
  BDGS_DATA_FREEZE,
  PROMOTION_PIPELINE,
  REVIEW_CYCLE_DAYS,
} from './data-governance/types'
import {
  buildDatabaseHealthReport,
  formatDatabaseHealthReportMd,
} from './data-governance/governance-engine'
import {
  applyPromotionTransition,
  blocksDirectDraftToRuntime,
  summarizePromotionPipeline,
  validatePromotionTransition,
} from './data-governance/promotion'
import { classifyReviewStatus, partitionReviewQueue, buildReviewQueue } from './data-governance/review-queue'
import {
  createPromotionSnapshot,
  mergeRollbackResult,
  rollbackToSnapshot,
} from './data-governance/rollback'
import {
  buildSourceFingerprint,
  hashContent,
  monitorSourceChange,
} from './data-governance/source-monitor'
import {
  bumpVersion,
  canAdvancePromotion,
  computeReviewDueAt,
  deprecateRecord,
  isReviewDue,
  wrapStagingItemAsGoverned,
} from './data-governance/version-manager'

const sampleRecord = wrapStagingItemAsGoverned({
  record_id: 'test-1',
  brand: '麥當勞',
  item_name: '大麥克',
  verified_at: '2025-01-01T00:00:00.000Z',
  promotion_stage: 'staging',
  confidence: 'A',
  source_url: 'https://official.example/menu',
  now: '2025-01-01T00:00:00.000Z',
})

describe('BDGS freeze & types', () => {
  it('1. data freeze is lifted (Sprint 3)', () => {
    assert.equal(BDGS_DATA_FREEZE, false)
  })

  it('2. review cycle is 180 days', () => {
    assert.equal(REVIEW_CYCLE_DAYS, 180)
  })

  it('3. promotion pipeline has 6 stages', () => {
    assert.equal(PROMOTION_PIPELINE.length, 6)
  })

  it('4. pipeline ends at runtime', () => {
    assert.equal(PROMOTION_PIPELINE[PROMOTION_PIPELINE.length - 1], 'runtime')
  })
})

describe('BDGS version manager', () => {
  it('5. bumpVersion patch', () => {
    assert.equal(bumpVersion('1.0.0'), '1.0.1')
  })

  it('6. review due in 180 days', () => {
    const due = computeReviewDueAt('2025-01-01T00:00:00.000Z')
    assert.equal(due.slice(0, 10), '2025-06-30')
  })

  it('7. isReviewDue detects past date', () => {
    assert.equal(isReviewDue('2020-01-01T00:00:00.000Z', new Date('2025-01-01')), true)
  })

  it('8. canAdvance one step only', () => {
    assert.equal(canAdvancePromotion('draft', 'staging'), true)
    assert.equal(canAdvancePromotion('draft', 'runtime'), false)
  })

  it('9. governed record has required fields', () => {
    assert.ok(sampleRecord.created_at)
    assert.ok(sampleRecord.review_due_at)
    assert.equal(sampleRecord.status, 'active')
  })

  it('10. deprecate sets status', () => {
    const d = deprecateRecord(sampleRecord)
    assert.equal(d.status, 'deprecated')
  })
})

describe('BDGS review queue', () => {
  it('11. need review when due', () => {
    const r = { ...sampleRecord, review_due_at: '2020-01-01T00:00:00.000Z' }
    assert.equal(classifyReviewStatus(r, { now: new Date('2025-01-01') }), 'need_review')
  })

  it('12. pending review on source change', () => {
    assert.equal(classifyReviewStatus(sampleRecord, { source_changed: true }), 'pending_review')
  })

  it('13. no queue for deprecated', () => {
    const r = deprecateRecord(sampleRecord)
    assert.equal(classifyReviewStatus(r), null)
  })

  it('14. buildReviewQueue sorts by due', () => {
    const q = buildReviewQueue([
      { ...sampleRecord, record_id: 'a', review_due_at: '2026-01-01T00:00:00.000Z' },
      { ...sampleRecord, record_id: 'b', review_due_at: '2025-01-01T00:00:00.000Z' },
    ])
    assert.ok(q.length >= 1)
  })

  it('15. partitionReviewQueue splits', () => {
    const q = buildReviewQueue([
      { ...sampleRecord, record_id: 'a', review_due_at: '2020-01-01T00:00:00.000Z' },
    ])
    const p = partitionReviewQueue(q)
    assert.ok(p.need_review.length + p.pending_review.length === q.length)
  })
})

describe('BDGS source monitor', () => {
  it('16. hashContent is stable', () => {
    assert.equal(hashContent('abc'), hashContent('abc'))
  })

  it('17. fingerprint has hash', () => {
    const fp = buildSourceFingerprint({ brand: '麥當勞', source_url: 'https://x.com' })
    assert.ok(fp.content_hash.startsWith('h'))
  })

  it('18. no change on first monitor', () => {
    const fp = buildSourceFingerprint({ brand: '麥當勞', source_url: 'https://x.com' })
    const r = monitorSourceChange(null, fp)
    assert.equal(r.changed, false)
  })

  it('19. detects url change', () => {
    const prev = buildSourceFingerprint({ brand: '麥當勞', source_url: 'https://a.com' })
    const curr = buildSourceFingerprint({ brand: '麥當勞', source_url: 'https://b.com' })
    const r = monitorSourceChange(prev, curr)
    assert.equal(r.change_type, 'url')
    assert.equal(r.requires_pending_review, true)
  })

  it('20. detects hash change', () => {
    const prev = buildSourceFingerprint({ brand: '麥當勞', source_url: 'https://a.com', content: 'v1' })
    const curr = buildSourceFingerprint({ brand: '麥當勞', source_url: 'https://a.com', content: 'v2' })
    assert.equal(monitorSourceChange(prev, curr).requires_pending_review, true)
  })
})

describe('BDGS promotion', () => {
  it('21. blocks draft to runtime', () => {
    assert.equal(blocksDirectDraftToRuntime('draft', 'runtime'), true)
  })

  it('22. allows staging from draft', () => {
    const draft = { ...sampleRecord, promotion_stage: 'draft' as const }
    const t = validatePromotionTransition({
      record: draft,
      to_stage: 'staging',
      actor: 'qa',
      reason: 'test',
    })
    assert.equal(t.allowed, true)
  })

  it('23. blocks runtime without founder', () => {
    const r = { ...sampleRecord, promotion_stage: 'production_candidate' as const }
    const t = validatePromotionTransition({
      record: r,
      to_stage: 'runtime',
      actor: 'system',
      reason: 'test',
      founder_approved: false,
    })
    assert.equal(t.allowed, false)
  })

  it('24. allows runtime with founder approval', () => {
    const r = { ...sampleRecord, promotion_stage: 'production_candidate' as const }
    const t = validatePromotionTransition({
      record: r,
      to_stage: 'runtime',
      actor: 'founder',
      reason: 'approved',
      founder_approved: true,
    })
    assert.equal(t.allowed, true)
  })

  it('25. blocks promotion when pending review', () => {
    const t = validatePromotionTransition({
      record: sampleRecord,
      to_stage: 'staging',
      actor: 'qa',
      reason: 'test',
      pending_review: true,
    })
    assert.equal(t.allowed, false)
  })

  it('26. applyPromotionTransition updates stage', () => {
    const draft = { ...sampleRecord, promotion_stage: 'draft' as const }
    const t = validatePromotionTransition({
      record: draft,
      to_stage: 'staging',
      actor: 'qa',
      reason: 'test',
    })
    const next = applyPromotionTransition(draft, t)
    assert.equal(next.promotion_stage, 'staging')
  })

  it('27. summarize pipeline', () => {
    const s = summarizePromotionPipeline([sampleRecord])
    assert.equal(s.staging, 1)
  })
})

describe('BDGS rollback', () => {
  it('28. snapshot preserves records', () => {
    const snap = createPromotionSnapshot({
      records: [sampleRecord],
      stage: 'staging',
      actor: 'system',
      reason: 'pre-promote',
    })
    assert.equal(snap.records.length, 1)
  })

  it('29. rollback restores snapshot', () => {
    const snap = createPromotionSnapshot({
      records: [sampleRecord],
      stage: 'staging',
      actor: 'system',
      reason: 'pre-promote',
    })
    const modified = [{ ...sampleRecord, promotion_stage: 'runtime' as const }]
    const result = rollbackToSnapshot(modified, snap)
    assert.equal(result.success, true)
    assert.equal(result.restored_count, 1)
  })

  it('30. mergeRollback does not drop unrelated', () => {
    const snap = createPromotionSnapshot({
      records: [sampleRecord],
      stage: 'staging',
      actor: 'system',
      reason: 'test',
    })
    const other = { ...sampleRecord, record_id: 'other', promotion_stage: 'runtime' as const }
    const merged = mergeRollbackResult([other], snap)
    assert.equal(merged.length, 2)
  })
})

describe('BDGS audit log', () => {
  it('31. creates audit entry', () => {
    const e = createAuditEntry({
      actor: 'founder',
      entity_type: 'menu',
      entity_id: 'x',
      action: 'update',
      reason: 'test',
    })
    assert.ok(e.id)
    assert.equal(e.actor, 'founder')
  })

  it('32. audit log appends', () => {
    const log = new AuditLog()
    log.logChange({ actor: 'a', entity_type: 'nutrition', entity_id: '1', action: 'x', reason: 'y' })
    assert.equal(log.count(), 1)
  })

  it('33. audit promotion', () => {
    const log = new AuditLog()
    auditPromotion(log, { actor: 'f', record_id: '1', from: 'staging', to: 'qa', reason: 'pass' })
    assert.equal(log.filterByEntity('1').length, 1)
  })

  it('34. audit nutrition change', () => {
    const log = new AuditLog()
    auditNutritionChange(log, {
      actor: 'qa',
      record_id: '1',
      reason: 'fix',
      before: { calories: 100 },
      after: { calories: 110 },
    })
    assert.equal(log.count(), 1)
  })
})

describe('BDGS coverage & health', () => {
  it('35. ingest staging returns records', () => {
    const records = ingestGovernedRecordsFromStaging({
      version: '1',
      generated_at: '2025-01-01',
      policy: 'zero_hallucination',
      restaurants: [
        {
          canonical_name: 'Test',
          restaurant_sources: [],
          items: [],
          status: 'draft',
        },
      ],
    })
    assert.equal(records.length, 0)
  })

  it('36. buildCoverageMetrics returns numbers', () => {
    const c = buildCoverageMetrics([sampleRecord])
    assert.ok(c.restaurant_allowlist_total >= 600)
    assert.ok(c.onr_brands >= 10)
  })

  it('37. health score 0-100', () => {
    const c = buildCoverageMetrics([sampleRecord])
    const score = computeHealthScore(c)
    assert.ok(score >= 0 && score <= 100)
  })

  it('38. health grade maps score', () => {
    assert.equal(healthGrade(95), 'A')
    assert.equal(healthGrade(30), 'F')
  })

  it('39. buildDatabaseHealthReport', () => {
    const r = buildDatabaseHealthReport()
    assert.ok(r.health_score >= 0)
    assert.equal(r.freeze_active, false)
  })

  it('40. format health report markdown', () => {
    const md = formatDatabaseHealthReportMd(buildDatabaseHealthReport())
    assert.ok(md.includes('Health Score'))
  })
})

describe('BDGS integration guards', () => {
  it('41. founder review requires qa', () => {
    const t = validatePromotionTransition({
      record: { ...sampleRecord, promotion_stage: 'qa' },
      to_stage: 'founder_review',
      actor: 'system',
      reason: 'test',
      qa_passed: false,
    })
    assert.equal(t.allowed, false)
  })

  it('42. deprecated cannot promote', () => {
    const t = validatePromotionTransition({
      record: deprecateRecord(sampleRecord),
      to_stage: 'staging',
      actor: 'system',
      reason: 'test',
    })
    assert.equal(t.allowed, false)
  })
})
