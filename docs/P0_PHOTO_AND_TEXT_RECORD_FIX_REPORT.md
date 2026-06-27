# P0 Photo & Text Record Fix Report

## 1. 漢堡被辨識成壽司的原因

拍照流程原先將 AI 回傳的 `detected_label`（僅文字）直接送入 `searchNutritionV2Client`，對全資料庫做模糊搜尋。搜尋引擎沒有 `visual_category` 約束，高分候選可能來自完全不同類別（例如「綜合套餐」同時出現在壽司品牌菜單中）。因此漢堡照片即使 label 接近 MOS，候選仍可能出現爭鮮 / 壽司郎壽司套餐。

## 2. Food Category Guard 如何防止跨類別錯配

新增 `src/lib/nutrition/food-category-guard.ts`：

- `FoodCategory` enum（burger、sushi、drink…）
- `inferCategoryFromText` / `inferCategoryFromCandidate` 從文字推斷類別
- `areCategoriesCompatible` — hard reject 不相容配對（burger↔sushi、drink↔bento 等）
- `filterByVisualCategory` — 過濾候選
- `categoryGuardMessage` — 無相容候選時顯示：「我看得出這像漢堡類餐點，但目前沒有可信營養資料。」

拍照解析 `buildPhotoVisualParse()` 產生 `visual_category`、`category_confidence`、`visual_evidence`。`photo-pipeline` 與 `searchNutritionV2Client` 在 `photo_mode` 下套用 guard；過濾後若無候選，**不得**塞入熱門不相容品項，改 `create_unknown`。

## 3. 手動更改入口在哪裡

`PhotoLogSheet` 候選區**永遠**顯示第四個選項：**「都不是，我要自己輸入」**（不論 AI 信心高低）。

點擊後開啟 `ManualPhotoCorrectionSheet`（`src/components/dashboard/today/ManualPhotoCorrectionSheet.tsx`）：

1. 餐點名稱、餐廳/品牌、食物類型（`food_category` select）
2. **A. 搜尋可信資料** — 重新搜尋 ONR / verified，選 A/B item 確認
3. **B. 手動輸入營養** — calories/protein/fat/carbs + 進階欄位 → `nutrition_status = user_entered`
4. **C. 先保存照片紀錄** — `nutrition_status = unknown`，進 Unknown Photo Queue

保留 `photo_ai_meta`（原始 candidates、detected_label、visual_category）與 `photo_correction_meta`（使用者修正）。

## 4. 文字紀錄如何保留 user_input_label

- `TodayFoodMore` 建立按鈕**永遠** `forceUnknown: true` — 按「建立『雞塊套餐摩斯漢堡』紀錄」不會走 fuzzy auto-commit
- `client-resolve.ts` 移除 confidence ≥ 0.72 自動入帳；僅 `userLabelMatchesVerified` 完全相符才 official
- 欄位：`user_input_label`、`display_label`、`matched_item_label`、`match_type`
- fuzzy 命中僅作 `possible_match`，營養維持 `null`

## 5. unknown 如何避免 0 kcal

- `createUnknownFreeTextMeal` / unknown payload 使用 `NULL_MACROS`，`calories`/`protein_g` = `null`
- `enrichFoodLog` 跳過 unknown，不做 macro 推估
- `formatLogCaloriesLine` → 「營養待確認」，不顯示 0
- `countsTowardDailyTotals` 排除 unknown / photo_only

## 6. 測試案例

`src/lib/nutrition/p0-photo-text-record.test.ts` — 35+ 案例涵蓋：

- Category guard（漢堡不出壽司、相容性矩陣、無候選 unknown）
- Manual photo correction（verified / user_entered / unknown、meta 保留）
- Text label preservation（雞塊套餐摩斯漢堡不被覆蓋、null 營養、不計入總量）

執行：`npm test`

## 7. Rollback 方法

1. **Git revert** 本 PR 相關 commit（guard、sheet、client-resolve、TodayFoodMore）
2. 或僅關閉 guard：移除 `search-client.ts` 中 `visual_category` 過濾區塊
3. 文字紀錄：還原 `TodayFoodMore` `forceUnknown: true` 與 `client-resolve.ts` fuzzy 邏輯（不建議）
4. 已寫入的 `photo_ai_meta` / `display_label` 為 additive JSON 欄位，舊客戶端可忽略
5. 無 DB migration — rollback 僅需部署前一版 web bundle

---

**原則**：BetterBit 可以不確定，但不能假裝確定。辨識錯不可怕，可怕的是沒有修正入口；找不到資料不可怕，可怕的是把錯誤資料寫進今日營養統計。
