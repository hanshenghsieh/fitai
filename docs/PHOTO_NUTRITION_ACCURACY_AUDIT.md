# Photo Nutrition Accuracy Audit

**Date:** 2026-06-18  
**Policy:** Photo identification cannot be looser than Nutrition Search V2 text search.

## Executive summary

| Question | Answer |
|----------|--------|
| 拍照與文字同等規格？ | **是** — 共用 Search V2（`search-client` / `photo-pipeline`） |
| AI 直接估算營養？ | **否** — API schema 已移除 calories/macros 欄位 |
| 找不到填 0？ | **否** — Level C 使用 `NULL_MACROS`（全 `null`） |
| 未確認入帳？ | **否** — `photoV2ReadyForLog` + `savePhotoDraft` 雙重閘門 |

---

## 流程對照

```
拍照 → parseFoodPhotoDataUrl()     → 僅名稱 + 信心（ai_nutrition_suppressed）
     → createPhotoAccuracyState()  → searchNutritionV2Client（同文字 V2）
     → PhotoLogSheet UI            → 確認 / 候選 / unknown 訊息
     → savePhotoDraft()            → photoAccuracyReadyForLog → buildPhotoLogCommitFromAccuracy
     → finalizePhotoV2ToFoodLogPayload() → food_logs
```

| 函式 | 角色 | 是否可寫營養 |
|------|------|-------------|
| `parseFoodPhotoDataUrl` | AI 標籤 | **否** |
| `lookupVerifiedFood` | Food DNA 英雄圖（非營養） | **否** |
| `runPhotoAccuracyPipeline` | 測試/legacy 橋接 → V2 | 僅透過 `v2_payload` |
| `finalizeToFoodLogPayload` | Legacy engine | **阻擋** ai_photo_only / 未就緒 |
| `buildPhotoLogCommitFromAccuracy` | **生產寫入路徑** | V2 規則 |
| `savePhotoDraft` | UI 儲存 | 需 `photoAccuracyReadyForLog` |

---

## 三級規格

| Level | 範例 | 行為 | nutrition_confidence |
|-------|------|------|---------------------|
| **A** | 椰香綠咖哩嫩雞飯 | 直接建立 | A |
| **B** | 竹筍湯、便當、滷味、火鍋、鹽酥雞、自助餐 | clarification 1–3 題 + 使用者確認 | B |
| **C** | 家常菜、阿嬤煮的湯、無法辨識 | Photo Only，`macros = null` | Unknown |

---

## 本輪修正

| 檔案 | 修正 |
|------|------|
| `src/lib/claude/schemas.ts` | `FoodPhotoParseSchema` 移除 optional 營養欄位 |
| `src/lib/nutrition/accuracy-engine.ts` | `runPhotoAccuracyPipeline` 以 V2 `payload` 為準 |
| `src/lib/nutrition/search-v2/query-patterns.ts` | 擴充 `isClearlyUnknownQuery`（家常菜、混合菜等） |
| `src/lib/nutrition/photo-log-accuracy.ts` | 新增 `photoAccuracyDisplayMacros` |
| `src/components/dashboard/today/PhotoLogSheet.tsx` | 移除從熱量推算碳水/脂肪 |
| `src/components/dashboard/TodayOS.tsx` | draft macros 改 `null`；顯示用官方值 |

---

## UI 行為

- 不確定 →「我想先確認一下」+「這餐看起來像：」+ 1–3 候選
- 無資料 →「目前沒有可信營養資料」+ 可保存照片紀錄
- **不顯示**從熱量反推的碳水/脂肪

---

## Unknown Photo Queue

欄位：`photo_id`, `image_hash`, `detected_label`, `user_label`, `restaurant`, `created_at`, `possible_matches`, `status`

`runAutoRematch()` 同步掃描文字 + 照片 unknown queue。

---

## 測試（33+ 項）

| 檔案 | 數量 | 涵蓋 |
|------|------|------|
| `photo-pipeline.test.ts` | 27 | Level A/B/C、queue、rematch、high risk |
| `photo-log-accuracy.test.ts` | 8 | UI 層、save 閘門、display macros |
| `food-capture-accuracy.test.ts` | 4 | parse 型別、lookupVerifiedFood |

執行：`npm test`（全 suite）  
建置：`npm run build`

---

## Hard rules 檢查清單

- [x] AI 不產生 calories / protein / fat / carbs
- [x] 找不到不估算、不填 0、不用今日剩餘熱量
- [x] Level B 未確認不寫 food_logs
- [x] 模糊食物不直接建立營養紀錄
- [x] Unknown 不進營養統計（`next-meal-engine` 跳過）
- [x] 拍照辨識僅為候選來源，最終營養來自 ONR / food-kb / Food DNA / 使用者確認流程
