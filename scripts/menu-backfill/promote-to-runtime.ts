#!/usr/bin/env npx tsx
/**
 * BDGS Promotion — staging production_candidate → runtime seed.
 * Requires Founder approval. Creates snapshot + audit log before write.
 */
import fs from 'fs'
import path from 'path'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { AuditLog, auditPromotion } from '@/lib/data-governance/audit-log'
import { createPromotionSnapshot } from '@/lib/data-governance/rollback'
import {
  buildPromotePlan,
  markManifestPromoted,
  mergePromotedIntoRuntime,
} from '@/lib/nutrition/menu-backfill/promote'
import type { StagingManifest } from '@/lib/nutrition/menu-backfill/types'

const ROOT = process.cwd()
const MANIFEST_PATH = path.join(ROOT, 'data', 'food-kb', 'staging', 'manifest.json')
const PROMOTED_SEED = path.join(ROOT, 'scripts', 'food-kb', 'seeds', 'staging-promoted.json')
const SNAPSHOT_DIR = path.join(ROOT, 'data', 'food-kb', 'governance', 'snapshots')
const AUDIT_PATH = path.join(ROOT, 'data', 'food-kb', 'governance', 'promotion-audit.json')
const REPORT_OUT = path.join(ROOT, 'docs', 'MENU_BACKFILL_PROMOTION_REPORT.md')

function main() {
  const founderApproved =
    process.argv.includes('--founder-approved') || process.env.FOUNDER_APPROVED === '1'

  if (!founderApproved) {
    console.error('\nFounder approval required: --founder-approved or FOUNDER_APPROVED=1\n')
    process.exit(1)
  }

  const now = new Date().toISOString()
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as StagingManifest
  const plan = buildPromotePlan(manifest, { founder_approved: true, actor: 'founder', now })

  if (!plan.total_promoted) {
    console.error('\nNo items eligible for promotion.\n')
    process.exit(1)
  }

  const promotedIds = new Set(plan.runtime_items.map(i => i.id))
  const { merged, replaced, added } = mergePromotedIntoRuntime(eatOutMenu, plan.runtime_items)

  fs.mkdirSync(path.dirname(PROMOTED_SEED), { recursive: true })
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })

  const snapshot = createPromotionSnapshot({
    records: plan.governed_records,
    stage: 'runtime',
    actor: 'founder',
    reason: 'Pre-promotion snapshot',
    now,
  })
  fs.writeFileSync(
    path.join(SNAPSHOT_DIR, `${snapshot.snapshot_id}.json`),
    JSON.stringify(snapshot, null, 2)
  )

  const auditLog = new AuditLog(
    fs.existsSync(AUDIT_PATH)
      ? (JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8')) as { entries: ReturnType<AuditLog['getAll']> })
          .entries ?? []
      : []
  )
  for (const item of plan.runtime_items) {
    auditPromotion(auditLog, {
      actor: 'founder',
      record_id: item.id,
      from: 'production_candidate',
      to: 'runtime',
      reason: 'Founder approved BDGS promotion',
    })
  }
  fs.writeFileSync(AUDIT_PATH, JSON.stringify({ entries: auditLog.getAll() }, null, 2))

  fs.writeFileSync(
    PROMOTED_SEED,
    JSON.stringify(
      {
        generated_at: now,
        policy: 'bdgs_promoted',
        actor: 'founder',
        snapshot_id: snapshot.snapshot_id,
        items: plan.runtime_items,
      },
      null,
      2
    )
  )

  const updatedManifest = markManifestPromoted(manifest, promotedIds, now)
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedManifest, null, 2))

  const lines = [
    '# Menu Backfill Promotion Report',
    '',
    `Generated: ${now}`,
    '',
    '> Founder approved · BDGS pipeline · staging → runtime seed',
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Promoted items | **${plan.total_promoted}** |`,
    `| Blocked items | ${plan.total_blocked} |`,
    `| Runtime replaced (store+name) | ${replaced} |`,
    `| Runtime added (new) | ${added} |`,
    `| Post-merge runtime total | ${merged.length} |`,
    `| Snapshot | \`${snapshot.snapshot_id}\` |`,
    '',
    '## Restaurants',
    '',
    '| Restaurant | Promoted | Blocked |',
    '|------------|--------:|--------:|',
    ...plan.restaurants.map(
      r => `| ${r.canonical_name} | ${r.promoted_count} | ${r.blocked_count} |`
    ),
    '',
    '## Next',
    '',
    '1. `npm run sync-menu` — merge `staging-promoted.json` into runtime',
    '2. `npm run qa:backfill` — verify coverage delta',
    '3. `npm run bdgs:report` — health dashboard',
    '',
  ]
  fs.writeFileSync(REPORT_OUT, lines.join('\n'))

  console.log('\n=== BDGS Promotion ===\n')
  console.log(`Promoted: ${plan.total_promoted} items`)
  console.log(`Blocked: ${plan.total_blocked}`)
  console.log(`Runtime: +${added} new, ${replaced} upgraded`)
  console.log(`Seed: ${PROMOTED_SEED}`)
  console.log(`Snapshot: ${snapshot.snapshot_id}`)
  console.log(`Report: ${REPORT_OUT}`)
  console.log('\nRun: npm run sync-menu\n')
}

main()
