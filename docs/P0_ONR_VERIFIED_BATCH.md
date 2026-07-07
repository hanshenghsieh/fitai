# P0 ONR Verified Batch — 下一批補完指南

> **政策：** Zero Hallucination — 無官方來源不補品項、不降低 confidence。

## 本批目標

| 項目 | 值 |
|------|-----|
| 批次 ID | `p0-onr-verified-batch` |
| 品牌數 | **10** 家 P0 partial |
| 每家目標 | **20** 品項（A/B 可推薦） |
| Staging 檔 | `data/food-kb/staging/p0-onr-verified-batch/brands.json` |

### 優先品牌

1. 萊爾富 · OK超商 · 全聯（零售 ONR rescue）
2. 五十嵐 · 清心福全 · CoCo · 可不可 · 迷客夏（手搖飲）
3. 丹丹漢堡 · 漢堡王（連鎖主餐）

---

## 品項模板（每家 top 20）

每品項 **必填**：

```json
{
  "name": "品項名稱（與菜單一致）",
  "aliases": ["別名"],
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "carbs": 0,
  "serving_size": "中杯 / 1 份",
  "source_url": "https://官方頁面直連",
  "source_type": "official_website",
  "source_name": "來源名稱",
  "verified_at": "2026-07-08T00:00:00.000Z",
  "verified_by": "founder",
  "verification_count": 2,
  "confidence": "A",
  "last_reviewed": "2026-07-08",
  "verification": {
    "sources": [
      {
        "priority": "A",
        "source_type": "official_website",
        "source_url": "https://...",
        "source_name": "...",
        "observed_at": "2026-07-08T00:00:00.000Z"
      }
    ]
  }
}
```

### 閘門（與 `validateP0RetailOnrItem` 對齊）

- `source_url` 不可空
- 四大巨量營養必填且為有限數字
- `confidence` 僅 **A / B** 可進 runtime 推薦
- 禁止 Uber Eats / Google Maps / MyFitnessPal 作為營養來源
- 禁止 placeholder 字樣（估計營養、模板資料等）

---

## 工作流程

```bash
# 1. 編輯 staging 品項
#    data/food-kb/staging/p0-onr-verified-batch/brands.json

# 2. 結構驗證
npm test -- src/lib/nutrition/p0-onr-verified-batch.test.ts

# 3. 零售三品牌可並行跑 ONR rescue
npm run qa:backfill

# 4. Founder Review → Promotion
npm run backfill:promote
```

---

## 完成標準

| # | 指標 | 目標 |
|---|------|------|
| 1 | 本批新增 A/B 品項 | ≥ 50（10 家 × 平均 5+ 先上線） |
| 2 | source_url 缺失 | **0** |
| 3 | nutrition conflict 未解 | **0** |
| 4 | Dice 可推薦主餐增加 | 萊爾富/OK/全聯各 ≥ 5 |
| 5 | Runtime coverage | +2% 以上 |

---

## 相關文件

- [`MENU_BACKFILL_SPRINT_TRACKER.md`](./MENU_BACKFILL_SPRINT_TRACKER.md)
- [`DICE_BACKFILL_QUEUE.md`](./DICE_BACKFILL_QUEUE.md)
- [`OFFICIAL_REFERENCE_COVERAGE.md`](./OFFICIAL_REFERENCE_COVERAGE.md)
- 零售 ONR：`src/lib/nutrition/p0-retail-onr.ts`
