# BetterBit Data Governance System (BDGS)

> **Founder Policy:** Sustainable nutrition knowledge base for 10+ years — not one-time JSON dumps.

## Data Freeze

**Lifted** (2026-06-25) — Founder approved Sprint 3 resume under BDGS pipeline.

`BDGS_DATA_FREEZE = false` in `src/lib/data-governance/types.ts`

All new data must follow: Draft → Staging → QA → Founder Review → Production Candidate → Runtime

## Architecture

```
src/lib/data-governance/
  types.ts              — core types, freeze flag, review cycle
  version-manager.ts    — version, review_due_at (180d)
  review-queue.ts       — Need Review / Pending Review
  source-monitor.ts     — daily official source fingerprint check
  promotion.ts          — Draft → Staging → QA → Founder → Prod → Runtime
  rollback.ts           — snapshot-based one-click rollback
  audit-log.ts          — append-only change audit
  coverage-dashboard.ts — coverage + health score
  governance-engine.ts  — orchestration + health report
```

## Version Control (every menu record)

| Field | Purpose |
|-------|---------|
| `created_at` | First ingested |
| `updated_at` | Last change |
| `verified_at` | Last nutrition verification |
| `review_due_at` | `verified_at + 180 days` |
| `version` | Semver (patch on update) |
| `status` | `active` / `deprecated` |
| `promotion_stage` | Pipeline stage |

## Review Cycle

| Trigger | Queue |
|---------|-------|
| `review_due_at` passed | **Need Review** |
| Official PDF/URL/version/hash change | **Pending Review** |
| ONR vs Runtime diff exceeds threshold | **Pending Review** |

Review cycle: **180 days**

## Promotion Pipeline

```
Draft → Staging → QA → Founder Review → Production Candidate → Runtime
```

**Forbidden:** `Draft → Runtime` (direct skip)

Promotion blocked when:
- `pending_review` active
- Record `deprecated`
- QA not passed (before founder review)
- Founder not approved (before runtime)

## Rollback

Before each promote, create `PromotionSnapshot`. Rollback restores snapshot **without overwriting unrelated records**.

Storage: `data/food-kb/governance/source-fingerprints.json`

## Source Monitor

Daily check of official source fingerprints:

- URL change
- Version change
- Content hash change
- PDF change

→ triggers **Pending Review**

## Audit Log

Every change to Menu, Nutrition, Food DNA, Confidence, Promotion is logged:

- Who (`actor`)
- When (`at`)
- What (`before` / `after`)
- Why (`reason`)

## Health Score (0–100)

Computed from:

| Component | Weight |
|-----------|--------|
| Restaurant coverage | 15 |
| Menu coverage | 10 |
| ONR coverage | 10 |
| Food DNA coverage | 5 |
| Recommendation coverage | 10 |
| QA coverage | 10 |
| Review discipline | 25 |
| Deprecated penalty | 10 |
| Pipeline bonus | 5 |

## Commands

```bash
npm run bdgs:report         # Generate DATABASE_HEALTH_REPORT.md
npm run backfill:promote    # Founder-approved staging → runtime seed
npm run sync-menu           # Merge staging-promoted.json into eatOutMenu
npm test                    # includes data-governance tests
```

## Outputs

- [`docs/DATABASE_HEALTH_REPORT.md`](DATABASE_HEALTH_REPORT.md) — Founder dashboard
- `data/food-kb/governance/source-fingerprints.json` — source monitor state

## Priority Stack (unchanged)

```
Official Nutrition Reference (ONR)
  > Food DNA
    > USDA / 衛福部
      > ❌ Delivery platforms
      > ❌ Google Maps
      > ❌ AI estimates
```

## Next

Sprint 4 in progress — hotpot brands need ONR official nutrition before build.
