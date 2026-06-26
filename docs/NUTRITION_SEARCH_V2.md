# Nutrition Search V2 — Founder Review

**Status:** Engine complete · Text + Photo wired at lib layer · Ready for Founder Review

## 原則（已強制）

| 原則 | 實作 |
|------|------|
| Accuracy First | 僅 ONR / food-kb / Food DNA / runtime official |
| Zero Hallucination | 無 AI 熱量、無 meal-target 粗估 |
| Never Guess | Level C → macros 全 `null` |
| Explain Every Result | 每筆 `explanation` + confidence badge |

## 模組

```
src/lib/nutrition/search-v2/
  types.ts
  matcher.ts
  clarification.ts
  unknown-queue.ts
  unknown-photo-queue.ts
  auto-rematch.ts
  confidence.ts
  search-ranking.ts
  text-log-pipeline.ts
  photo-pipeline.ts
  index.ts
```

## 三級流程

| Level | 範例 | 動作 |
|-------|------|------|
| **A** | `711竹筍排骨湯` | `create_official`，confidence A，直接建立 |
| **B** | `竹筍湯` / `便當` | `clarify`，最多 3 題，完成後 confidence B |
| **C** | `阿嬤家的竹筍湯` | `create_unknown`，macros NULL，不進統計 |

## 文字紀錄接線

- `food-search.ts` → V2 `collectAllCandidates` + `rankSearchCandidates`
- `food-estimate.ts` → `resolveFreeTextMeal()`，**已移除** 632 kcal 粗估
- `TodayOS` `handleCreateFreeText` → Level B 阻擋提交；Level C 建立 text-only

## 拍照紀錄接線

- `photo-log-accuracy.ts` → `photo-pipeline.ts`（與文字同等規格）
- `NEXT_PUBLIC_NUTRITION_ACCURACY_V1` 預設 **true**（設 `false` 可關閉確認 UI）

## 禁止事項稽核

| 禁止 | 狀態 |
|------|------|
| AI 猜熱量/蛋白 | ✅ 阻擋 |
| 找不到填 0 | ✅ unknown 為 `null` |
| 今日剩餘熱量估算 | ✅ 已移除 `estimateFreeTextMeal` 路徑 |
| 未確認寫入（Level B） | ✅ `can_commit: false` |

## 測試

| 套件 | 測試數 |
|------|--------|
| `search-v2.test.ts` | 40+ |
| `photo-pipeline.test.ts` | 22 |
| `text-log-pipeline.test.ts` | 14 |
| `food-estimate.test.ts` | 4 |

```bash
npm test
npm run build
```

## 未修改（依 Founder 指示）

- Today / Week / Analysis **視覺 UI**（僅 `handleCreateFreeText` 邏輯接 V2）
- Design System
- ONR 原始資料
- Production DB / Migration

## Unknown Queue

In-memory（`unknown-queue.ts` + `unknown-photo-queue.ts`）。`getUnknownAnalytics()` 供 Founder Dashboard。

## 相關文件

- [UNKNOWN_FOOD_PIPELINE.md](./UNKNOWN_FOOD_PIPELINE.md)
- [AUTO_REMATCH_SYSTEM.md](./AUTO_REMATCH_SYSTEM.md)
- [PHOTO_NUTRITION_ACCURACY_AUDIT.md](./PHOTO_NUTRITION_ACCURACY_AUDIT.md)
