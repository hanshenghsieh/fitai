# 再健一點 App Status Report

**Production URL:** https://betterbit.app  
**Last Updated:** 2026-06-18  
**Brand:** 再健一點（原 FitAI 已全面更名）

## Executive Summary

產品完成度約 **85%（可封測上線）**。核心使用循環（註冊 → 計畫 → 打卡 → 進度 → 訂閱）已打通。剩餘工作主要是生產環境配置與便利店圖片 CDN 驗證。

---

## 本輪重大更新 ✅

### 產品體驗
- **落地頁**：未登入用戶看到完整行銷頁（價值主張 + 7 天試用 + 定價）
- **統一打卡**：三餐/逐項運動/喝水/外食模式選擇，全部持久化至 `daily_checkins`
- **便利店菜單**：48 項產品資料（來自 `scripts/final-menu.json`）
- **週回饋閉環**：填寫回饋後自動觸發計畫重生成，並依回饋調整熱量
- **付費牆**：7 天免費試用，期滿鎖定計畫生成與進度圖表
- **品牌統一**：全站「再健一點」茶棕配色

### 技術修復
- Stripe Checkout Session 正確導向
- 免費升級 API 統一使用 `daily_checkins` 表
- Firebase Admin 懶加載，無配置時優雅降級
- 推播 Cron 每 5 分鐘執行
- Webhook upsert 防重複訂閱

---

## 功能清單

| 功能 | 狀態 |
|------|------|
| 落地頁 | ✅ |
| 註冊/登入 | ✅ |
| 6 步 Onboarding + 試用預覽 | ✅ |
| 週計畫生成（TDEE + 自煮 + 便利店） | ✅ |
| 今日打卡（持久化） | ✅ |
| 本週計畫視圖 | ✅ |
| 進度追蹤 + 體重記錄 | ✅ |
| 7 天試用 + 付費牆 | ✅ |
| Stripe 訂閱 | 🟡 需配置 Price ID |
| 推播通知 | 🟡 需 Firebase Admin SDK |
| INBODY 解析 | 🟡 選填（Claude API） |

---

## 上線前檢查清單

```bash
# 1. 環境變數（參考 .env.example）
cp .env.example .env.local  # 填入真實值

# 2. 同步便利店菜單（若更新了 final-menu.json）
npm run sync-menu

# 3. 建置驗證
npm run build

# 4. 部署至 Vercel
# 生產網址：https://betterbit.app
npx vercel deploy --prod

# 5. Vercel 環境變數（Settings → Environment Variables）
#    NEXT_PUBLIC_APP_URL=https://betterbit.app
#    + .env.local 內其餘所有變數
#    CRON_SECRET、STRIPE_*、FIREBASE_ADMIN_SDK 等
```

### 必測流程
- [ ] 落地頁 → 註冊 → Onboarding → Dashboard
- [ ] 打卡三餐+運動+喝水 → 刷新 → 狀態保留
- [ ] 切換自己煮/外食 → 刷新 → 模式保留
- [ ] 設定頁訂閱 → Stripe Checkout → Webhook
- [ ] 試用期滿後生成計畫被阻擋
- [ ] 填寫週回饋 → 下週計畫熱量有調整

---

## 架構

```
src/
├── app/
│   ├── page.tsx              # 落地頁（未登入）/ 跳轉（已登入）
│   ├── (app)/                # 主應用（BottomNav）
│   └── api/
│       ├── generate-plan/    # 計畫生成 + 付費牆 + 回饋調整
│       ├── checkin/          # 打卡持久化
│       └── create-subscription/  # Stripe Checkout
├── components/
│   ├── dashboard/BetterBitHome.tsx  # 今日主介面
│   ├── marketing/LandingPage.tsx
│   └── subscription/         # TrialBanner, UpgradeGate
└── lib/
    ├── checkin-utils.ts      # 打卡邏輯
    ├── subscription-access.ts # 試用/訂閱判斷
    ├── feedback-adjustments.ts
    └── convenience-store-menu.ts  # 48 項便利店資料
```

---

## 定價

- **7 天免費試用**（無需信用卡）
- **NT$500/月** 訂閱
- **達標 20 天/月** → 下月免費延長

---

**Status:** 可封測上線 🚀 — 配置 Stripe + Firebase 後即可對外
