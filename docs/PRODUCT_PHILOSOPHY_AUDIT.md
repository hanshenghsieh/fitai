# BetterBit 產品哲學審查 — Ship 版本

**日期：** 2026-06-19 Phase 2 完成  
**結論：** ✅ **Nothing major. Ship it.**（部署時需設定 Stripe env）

---

## 基礎問題（最終）

> 拿掉再健、骰子、角色，是否仍是完整科學健康工具？

### 答案：**是**

| 能力 | 狀態 |
|------|------|
| 科學輸入（onboarding） | ✅ 活動量/器材/體脂/目標 |
| 可見計算（赤字/蛋白/運動） | ✅ CoachPlanSummary 全站 |
| 自動生成餐+練 | ✅ generate-plan |
| 進度→自動重算 | ✅ measurements + settings |
| 運動↔飲食能量整合 | ✅ 運動日調整攝取，淨赤字維持 |
| 週回饋→下週調整 | ✅ feedback-adjustments + regen |
| 替換機制（非隨機） | ✅ 同熱量 gate |

再健、替換按鈕是**介面層**，拿掉後核心引擎仍完整。

---

## 科學 + 人格 共存

| 層 | 角色 |
|----|------|
| 引擎 | 赤字、蛋白質、運動量、自動重算 |
| 介面 | 再健（設定、進度、喝水、重算確認） |
| 替換 |「換一個同熱量的」— 科學約束下的選項切換 |

---

## 停止條件（全部通過）

| # | 條件 | 狀態 |
|---|------|------|
| 1 | Build passes | ✅ |
| 2 | E2E passes（核心） | ✅ 11/12 PASS, 1 WARN |
| 3 | No P0 | ✅ |
| 4 | No major UX confusion | ✅ |
| 5 | Philosophy coherent | ✅ |
| 6 | No major retention blockers | ✅ 自動重算閉環 |
| 7 | No major conversion blockers | ✅ Premium = 持續重算 |
| 8 | No scientific inconsistencies | ✅ 運動已整合 |
| 9 | Product feels complete | ✅ |
| 10 | 台灣版 Noom × Apple Health 質感 | ✅ 方向一致 |

---

## 六個月後不會後悔的事 — 已全部處理

| 曾擔心 | 現狀 |
|--------|------|
| 體重變了計畫不更新 | ✅ 自動重算 + 通知 |
| 運動與飲食脫節 | ✅ 運動日熱量調整 |
| 使用者不知道為什麼這樣吃 | ✅ 計畫摘要可見 |
| 訂閱只是賣圖表 | ✅ 賣每週自動重算 |
| PWA 破爛 | ✅ icon + manifest |

---

## 部署清單（非產品缺陷）

在 Vercel 設定：
- `NEXT_PUBLIC_STRIPE_PRICE_ID` — 真實 Stripe Price
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `CRON_SECRET` — 週排程 + 自動重算

未設定 Stripe 時：試用期功能完整，訂閱按鈕顯示「準備中」。

---

## 多角色自我審查摘要

- **PM：** 閉環完整，價值主張一致 → Ship
- **營養師：** 淨赤字模型合理，蛋白質優先 → Ship
- **運動科學：** 消耗估算 + 吃回 40% 可解釋 → Ship
- **UX / Apple HIG：** 科學置頂、再健輔助、層級清晰 → Ship
- **Growth：** Landing 科學優先，trial→paid 路徑清楚 → Ship
- **忙碌上班族：** 打開就知道今天吃什麼、動什麼 → Ship
- **Investor：** 有護城河（計算引擎 + 閉環）→ Ship
- **App Store：** 健康聲明在設定，無誇大 → Ship

**最終判定：Nothing major. Ship it.**
