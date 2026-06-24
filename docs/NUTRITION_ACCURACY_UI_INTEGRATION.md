# Nutrition Accuracy UI Integration

BetterBit 拍照記錄接入 Nutrition Accuracy Engine v1。預設關閉，透過 feature flag 漸進上線。

## Feature flag

| 變數 | 預設 | 說明 |
|------|------|------|
| `NEXT_PUBLIC_NUTRITION_ACCURACY_V1` | `false`（未設定同 false） | `true` 時啟用拍照確認流程 |

```bash
# 本地啟用
NEXT_PUBLIC_NUTRITION_ACCURACY_V1=true npm run dev

# Vercel / TestFlight：在 Environment Variables 設定後重新 build
```

Helper：`src/lib/nutrition-accuracy-flag.ts` → `isNutritionAccuracyV1()`

## 接入流程

```
拍照 / 選圖
  ↓
parseFoodPhotoDataUrl()          # AI 僅產生 label，不寫 kcal
  ↓
[flag true] createPhotoAccuracyState()
  → runPhotoAccuracyPipeline({ label, photo_parse: true, source_type: 'ai_photo_only' })
  → PhotoLogSheet 顯示候選 + 確認題
  ↓
使用者選候選、答 0–2 題、點「確認後我再幫你記錄」
  ↓
ready_for_food_log === true
  ↓
savePhotoDraft → buildPhotoLogCommitFromAccuracy()
  → finalizeToFoodLogPayload()
  → commitLog + nutrition_accuracy_meta
```

`flag false` 時維持原流程：`lookupVerifiedFood` → 直接填 calories → 儲存。

## 修改檔案

| 檔案 | 角色 |
|------|------|
| `src/lib/nutrition-accuracy-flag.ts` | Feature flag |
| `src/lib/nutrition/photo-log-accuracy.ts` | 拍照狀態與 commit 封裝 |
| `src/components/dashboard/TodayOS.tsx` | `parsePhotoDraft` / `savePhotoDraft` 分支 |
| `src/components/dashboard/today/PhotoLogSheet.tsx` | 確認 UI（僅 flag true） |
| `src/lib/banks/types.ts` | 可選 `nutrition_accuracy_meta`（check-in JSON） |

未改：Week / Progress 主架構、food corpus、DB schema。

## 使用者流程

1. 拍今天吃的
2. 看到「我想先確認一下」與 1–3 個候選（「這餐看起來像…幫我選最接近的」）
3. 高風險餐（便當、火鍋、滷味等）最多 2 題（飯量、烹調、糖度、醬料）
4. 點「確認後我再幫你記錄」→ 顯示估算熱量／蛋白質
5. 「加入今天」解鎖並寫入 `food_logs_today`

UI 原則：warm white / soft beige、大圓角；不出現「不準確／錯誤／低可信」等字眼。

## 寫入欄位

`finalizeToFoodLogPayload()` 產生標準 log；額外 metadata（僅 client check-in JSON）：

- `accuracy_level`
- `source_type`
- `user_confirmed`
- `portion_adjustments`
- `candidate_label`

## 風險

| 風險 | 緩解 |
|------|------|
| 使用者多一步確認 | 僅 flag true；茶葉蛋等低風險仍只需一次確認 |
| AI label 錯誤 | 候選列表 + 使用者選擇，不顯示單一假精準數字 |
| 舊版行為 regression | flag 預設 false，原路徑完整保留 |
| metadata 僅存在 client JSON | 不影響 DB schema；舊 log 無此欄位 |

## Rollback

1. 將 `NEXT_PUBLIC_NUTRITION_ACCURACY_V1` 設為 `false` 或移除
2. 重新 `npm run build`（web）或 `npm run cap:sync`（iOS）
3. 不需 migration、不需清資料

程式碼可保留；關閉 flag 即回到舊拍照流程。

## 測試

```bash
npm test
```

涵蓋：`photo-log-accuracy.test.ts`（flag、AI 不可直寫、便當確認、茶葉蛋確認後入帳、metadata）。

## 下一步

- **TestFlight Build 3a**（flag=false）：見 [`TESTFLIGHT_BUILD_3A.md`](./TESTFLIGHT_BUILD_3A.md) — `npm run testflight:3a-prep`
- **TestFlight Build 3b**（flag=true）：實機驗證確認 UI
- 後續：verified menu / barcode 短路至 A 級（仍經確認 UI）
