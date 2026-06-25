# 分析頁 V2（參考圖復刻）

## 版面順序

1. 體重趨勢
2. 熱量趨勢
3. 蛋白質達標
4. BetterBit 分析
5. 下週建議（含配餐／運動建議摘要）
6. 三大營養素比例
7. 熱量分布
8. 飲食紀錄總結
9. 最佳紀錄日
10. 需要加油的日子
11. 下一步行動

## 日 / 週 / 月

- Segment：`日` / `週` / `月`，預設 `週`
- 日期列：左右箭頭切換上一段 / 下一段
- 資料來源：`buildAnalysisSummary({ periodType, anchorDate, ... })`

## 視覺

- 背景 `#FFF9F2`（`BB_V2.bg.canvas`）
- 卡片白底、28px 圓角、淡陰影、24px 內距（`BBCard`）
- 主色：橘 `#D89A52`、綠 `#76B69A`、文字 `#1C1C1E` / `#6E6E73`

## 空狀態

當期間內餐數 < 3：

- 文案：「再記錄 3 餐，我就能幫你看出趨勢」
- CTA：「去記錄第一餐」→ `/dashboard`
- 不渲染空圖表、不顯示 0 kcal 假分析

## 主要檔案

| 檔案 | 用途 |
|------|------|
| `src/app/(app)/progress/page.tsx` | 資料抓取 + 頁面殼 |
| `src/components/analytics/AnalyticsScreen.tsx` | 分析頁 UI |
| `src/lib/analytics/analysis-summary.ts` | 聚合邏輯 |

## Rollback

1. 還原 `src/app/(app)/progress/page.tsx` 使用 `ProgressScreen`
2. 刪除或保留 `src/components/analytics/` 與 `src/lib/analytics/`（不影響 DB）
3. 無 migration、無 production data 變更
