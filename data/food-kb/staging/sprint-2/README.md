# Sprint 2 — 50 家餐廳

**狀態：** 進行中（來源骨架已建）  
**政策：** Zero Hallucination · 2+ sources per restaurant · top 20 real items

## 品牌清單

見 `brands.json`（50 家）與 `docs/MENU_BACKFILL_SPRINT_TRACKER.md`。

| 組別 | 數量 | 說明 |
|------|-----:|------|
| A | 16 | Sprint 1 draft 優先完成（含萊爾富/OK 額度 200） |
| B | 34 | 新增 P0 高頻品牌 |

## brands.json 欄位

| 欄位 | 說明 |
|------|------|
| `canonical_name` | Allowlist 標準店名 |
| `store_aliases` | 搜尋別名 |
| `restaurant_sources` | ≥2 來源（A/B priority） |
| `nutrition_source_url` | 營養頁面（待人工確認） |
| `nutrition_source_status` | `pending_page_discovery` 或 `pending_manual_discovery` |
| `target_items` | 20（超商 200） |

**不含：** 菜單品項、營養數字。

## 工作流程

1. 人工確認每家 `nutrition_source_url` 指向可追溯營養頁面
2. 單店名店（金峰、林東芳）需額外來源驗證後方可 build
3. `npm run backfill:sprint-2` → `../manifest.json`（✅ 已建）
4. QA 關卡 → `docs/MENU_BACKFILL_SPRINT_2_REPORT.md`
5. Founder Review → Promotion

## 檔案

- `brands.json` — ✅ 50 家來源骨架
- 產出報告 — `docs/MENU_BACKFILL_SPRINT_2_REPORT.md`（✅）
