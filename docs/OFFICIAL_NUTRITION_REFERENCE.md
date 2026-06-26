# Official Nutrition Reference (ONR)

> **Founder Policy:** ONR is the **highest-priority** nutrition source in BetterBit — above Food DNA, USDA, and delivery platforms.

## Purpose

Official Nutrition Reference (ONR) centralizes traceable, brand-level official nutrition data for Taiwan chain restaurants and convenience stores.

All calories, protein, fat, carbs, fiber, sugar, and sodium values should be read from ONR **first** when available.

## Location

```
data/food-kb/official-reference/
  index.json
  mcdonald.json
  kfc.json
  mos.json
  subway.json
  7eleven.json
  familymart.json
  ...
```

## Brand file schema

Each brand file contains:

### `metadata`

| Field | Description |
|-------|-------------|
| `brand_id` | Slug (e.g. `mcdonald`) |
| `canonical_name` | Allowlist store name |
| `store_aliases` | Search aliases |
| `nutrition_source_url` | Official nutrition page root |
| `last_verified` | ISO timestamp |
| `official_version` | ONR version |
| `country` | `TW` |
| `source_priority` | `A` / `B` / `C` |

### `menu[]`

| Field | Description |
|-------|-------------|
| `name` | Official dish name |
| `aliases` | Alternate names |
| `calories` / `protein` / `fat` / `carbs` | Core macros |
| `fiber` / `sugar` / `sodium` | Extended (nullable) |
| `serving_size` | Official serving label |
| `source_url` | Per-item official URL |
| `verified_at` / `verified_by` | Audit trail |
| `verification_count` | Cross-source count |
| `confidence` | A–D |

## Official Source Priority

| Priority | Allowed sources |
|----------|-----------------|
| **A** | Official nutrition PDF · Official nutrition page · Official menu |
| **B** | Official menu · Official announcement |
| **C** | 衛福部 (MOHW) · USDA |

### Forbidden for ONR

- Uber Eats / foodpanda / delivery platform nutrition
- Google Maps
- AI estimates / GPT guesses

## Official Nutrition Diff Tool

Compares ONR vs Food DNA vs Runtime. Thresholds:

| Field | Threshold |
|-------|-------------|
| Calories | >10% difference |
| Protein | >5g |
| Fat | >3g |
| Carbs | >5g |

If exceeded → `pending_review` → **blocks Promote**.

## Commands

```bash
npm run onr:seed       # Build brand JSON from traceable sources
npm run onr:coverage   # Coverage dashboard → docs/OFFICIAL_REFERENCE_COVERAGE.md
npm test               # includes official-reference tests
```

## Integration

- **Staging backfill** reads ONR before restaurant-expanded
- **Food Intelligence Layer** uses staging items sourced from ONR
- **Promotion** blocked when diff tool flags `pending_review`

## Rollback

Delete `data/food-kb/official-reference/` — no schema migration, no production writes.
