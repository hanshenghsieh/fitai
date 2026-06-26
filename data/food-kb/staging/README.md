# Menu Backfill Staging

**Zero Hallucination Policy** — no AI-generated menu items.

> **Sprint 追蹤：** 見 [`docs/MENU_BACKFILL_SPRINT_TRACKER.md`](../../docs/MENU_BACKFILL_SPRINT_TRACKER.md)  
> 當前：**Sprint 4 進行中**（50 家／批）· Sprint 1–3 已 Promotion

## Workflow

1. Pick restaurant from `missing-restaurants.json` (450 allowlist gaps).
2. Cross-verify with **2+ sources** (different priority tiers A/B/C).
3. Add top **20 real popular items** with full verification metadata.
4. Run per-restaurant QA: `npm run qa:backfill`
5. Only `production_candidate` status items may be promoted (Founder approval).

## Required fields per item

### nutrition_trace (runtime summary)

| Field | Purpose |
|-------|---------|
| `source_type` | official / usda / mohw / food_dna / brand / estimated |
| `source_name` | 資料來源名稱 |
| `verified_at` | 最後驗證時間 |
| `verification_count` | 交叉驗證來源數 |
| `confidence` | A～D |
| `last_reviewed` | 最後人工複核日期 |

### verification (staging detail)

- `sources[]` with `source_url` per source (min 2 for restaurant)
- Compiles to `nutrition_trace` on promote via `compileNutritionTraceFromSources()`

## Files

- `manifest.json` — staging restaurants + verified items
- `missing-restaurants.json` — work queue (generated)
