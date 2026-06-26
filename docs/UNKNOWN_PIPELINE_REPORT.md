# Unknown Pipeline Report

**Engine:** `src/lib/nutrition/search-v2/unknown-queue.ts`  
**Dashboard:** `getFounderUnknownDashboard()`  
**Priority:** `unknown-priority.ts`

## Fields

| Field | Description |
|-------|-------------|
| food_name | User-entered label |
| restaurant | Store hint |
| image_hash | Photo unknown (photo queue) |
| times_requested | Request count |
| last_requested | Last seen ISO |
| possible_matches | Auto-rematch candidates |
| waiting_days | Days since first seen |
| priority_score | `freq×10 + wait×2 + hints` |
| status | waiting / matched / dismissed / updated |

## Founder Dashboard Sections

- **Top Unknown Foods** — `top_unknown`
- **Top Unknown Restaurants** — `restaurant_unknown`
- **Most Requested** — `most_requested`
- **Longest Waiting** — `longest_waiting`
- **Priority Queue** — `priority_queue` (auto-sorted)

## Photo Unknown

`unknown-photo-queue.ts` — same lifecycle, merged in `getFounderUnknownDashboard()`.

## Constraints

- In-memory only (no migration / production DB)
- No AI auto-create — Founder manual backfill only
- Auto Re-Match proposes; user decides
