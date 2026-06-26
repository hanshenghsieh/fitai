# Menu Backfill Promotion Report

Generated: 2026-06-25T16:18:45.056Z

> Founder approved · BDGS pipeline · staging → runtime seed

## Summary

| Metric | Value |
|--------|------:|
| Promoted items | **133** |
| Blocked items | 0 |
| Runtime replaced (store+name) | 156 |
| Runtime added (new) | 0 |
| Post-merge runtime total | 6407 |
| Snapshot | `snap-1782404325083` |

## Restaurants

| Restaurant | Promoted | Blocked |
|------------|--------:|--------:|
| 麥當勞 | 13 | 0 |
| 肯德基 | 6 | 0 |
| Subway | 3 | 0 |
| 三商巧福 | 12 | 0 |
| 鬍鬚張 | 9 | 0 |
| 吉野家 | 2 | 0 |
| Sukiya | 3 | 0 |
| 丸龜製麵 | 5 | 0 |
| 7-11 | 24 | 0 |
| 全家 | 24 | 0 |
| 星巴克 | 7 | 0 |
| 路易莎 | 7 | 0 |
| cama café | 3 | 0 |
| 丹丹漢堡 | 2 | 0 |
| 85度C | 5 | 0 |
| 伯朗咖啡 | 3 | 0 |
| 摩斯漢堡 | 5 | 0 |

## Next

1. `npm run sync-menu` — merge `staging-promoted.json` into runtime
2. `npm run qa:backfill` — verify coverage delta
3. `npm run bdgs:report` — health dashboard
