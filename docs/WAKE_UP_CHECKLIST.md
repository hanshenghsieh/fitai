# 起床後只需做的事 — BetterBit 晨間清單

> 自動化批次完成時間：2026-07-08  
> 最新 commit 已 push 至 `main`（Vercel 自動部署）

---

## 一、必做（約 15–20 分鐘）

### 1. TestFlight 真機驗收

照 `docs/FOOD_LOG_PERSIST_MOBILE_E2E.md` 跑 **A / B / C / D**：

| 步驟 | 預期 | 你的結果 |
|------|------|----------|
| A 記錄 → 切 tab → 回來 | 茶葉蛋仍在 | ☐ |
| B 關 App 重開 | 兩筆都在 | ☐ |
| C 刪除後重開 | 刪除持久化 | ☐ |
| D 飛航模式 | 頂部「離線模式」或「待同步」橫幅 + 可讀今日紀錄 | ☐ |
| 拍照記錄 | iOS 原生相機彈出（非檔案選擇器） | ☐ |
| 恢復網路 | 待同步紀錄自動上傳（無需手動重試） | ☐ |

有 ✗ → 截圖 + 哪一步 + 回報即可。

### 2. 快速肉眼 UX 掃描（5 分鐘）

- 底部導覽：當前 tab 有橘色高亮
- 登入頁：鍵盤自動填入 email 正常
- 進步頁：體重輸入不會被 iOS 放大（16px）
- 計畫生成失敗時：今日頁有「重試」按鈕

---

## 二、資料補完（需人工，無法自動捏造）

官方網站 **沒有公開逐品項營養** 的品牌，工程無法自動填：

| 品牌 | 現況 | 你要做 |
|------|------|--------|
| 萊爾富 / OK / 全聯 | 0 個 verified 品項 | 從包裝標示或官方 PDF 手動填入 `data/food-kb/staging/p0-retail-onr-curated.json` |
| 五十嵐 / CoCo / 清心 等 | 模板已建，items 空 | 同上，填 `data/food-kb/staging/p0-onr-verified-batch/brands.json` |
| 丹丹漢堡 | 已有 2 品項 | 再補 18 個 top 主餐 |

填完後執行：

```bash
npm run onr:p0-retail          # 零售三品牌
npm run onr:p0-verified-batch  # 手搖/連鎖批次
npm run backfill:p0-retail-onr
npm run qa:backfill
# Founder 核准後：
npm run backfill:promote -- --founder-approved
```

指南：`docs/P0_ONR_VERIFIED_BATCH.md`

---

## 三、可選（有空再做）

| 項目 | 說明 |
|------|------|
| E2E 自動化 | `BB_E2E_EMAIL=... BB_E2E_PASSWORD=... npm run qa:food-log-persist-e2e` |
| Stripe 正式環境 | `.env` 填 production keys + 價格對齊 NT$299 |
| Apple IAP | TestFlight 上 `NEXT_PUBLIC_APPLE_IAP_ENABLED=true` 後測試 |
| 推播 | Firebase Admin SDK 配置 |

---

## 四、本夜已自動完成

### 工程
- ✅ 離線待同步旗標（`offline-pending-sync.ts`）— 離線記錄、恢復連線自動 PATCH
- ✅ `OfflineShell` — 離線 / 待同步雙狀態橫幅 + alert 語意
- ✅ `BetterBitHome` — 離線不 spam toast；online 事件觸發同步
- ✅ 路由 error boundary（`(app)/error.tsx` + `app/error.tsx`）
- ✅ `AppOverlay` — Escape 關閉 + 焦點管理
- ✅ GitHub 標準 UX 快速修復（見 `docs/UI_UX_AUDIT_REPORT.md`）
- ✅ P0 verified batch build script（`npm run onr:p0-verified-batch`）

### 測試
- ✅ 685 tests pass（含 offline-pending-sync）
- ✅ Production build 成功

### 部署
- ✅ Push 至 `main` → Vercel Production

---

## 五、已知仍待後續迭代（非阻塞）

- Recharts 圖表無螢幕閱讀器文字摘要
- 設計 token 三套並存（`colors` / `TODAY` / `BB_V2`）— 長期統一
- 冷啟動離線（未載入過 dashboard 時無 cache）— 需更大架構改動
- `userScalable: false` — 低視力使用者無法 pinch zoom

詳細清單：`docs/UI_UX_AUDIT_REPORT.md`
