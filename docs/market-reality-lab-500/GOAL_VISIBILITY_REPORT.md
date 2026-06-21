# MR500 — Goal Visibility

**Date:** 2026-06-20  
**Method:** Same 500 Taiwan humans · A/B product flag has_goal_visibility  
**Product:** iter4 baseline (dice 95%, meal trust, plateau) vs iter5 (+ has_goal_visibility)

Goal Visibility = 進度頁可看目標距離（還差多少、時間感、脂肪銀行）、平台期解釋，不變回 KPI 儀表板。

---

## Headline

| Metric | Without GV | With GV | Δ |
|--------|------------|---------|---|
| D30 | 54.0% (270) | 55.2% (276) | +6 |
| D90 | 54.0% | 55.2% | +6 |
| Subscribe | 11.6% | 8.2% | -17 |
| Would recommend | 42.4% | 52.2% | +49 |
| Goal-related complaints (sum) | 324 | 0 | -324 |
| Goal-related delights (sum) | 225 | 541 | +316 |

---

## Goal-related complaints

| Complaint | Without GV | With GV |
|-----------|------------|---------|
| 沒進度感 | 115 | 0 |
| 不懂為什麼沒瘦 | 73 | 0 |
| 沒有解釋為什麼沒瘦 | 21 | 0 |
| 體重沒變以為app壞了 | 0 | 0 |
| 不知道平台期是正常 | 0 | 0 |
| 數字看不懂 | 0 | 0 |

---

## Goal-related delights

| Delight | Without GV | With GV |
|---------|------------|---------|
| 知道還差多少公斤 | 0 | 23 |
| 目標時間看得懂 | 0 | 195 |
| 熱量目標清楚 | 0 | 97 |
| 平台期有安慰到 | 86 | 90 |
| D3就知道有在幫我 | 139 | 136 |

---

## Verdict

**PASS** — Goal Visibility reduces progress confusion complaints and increases goal-oriented delight moments.

**Ship check:** Progress page shows trend + fat bank + adaptation (Phase 10.3). Trial users see 14-day preview; full history after subscribe.

**Re-run:** npm run mr500:goal-visibility
