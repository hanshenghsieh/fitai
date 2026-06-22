# BetterBit App Store 文案（Metadata）

**建立日期：** 2026-06-18  
**Primary Language：** Chinese (Traditional) — 台灣  
**Bundle ID：** `app.fitai.betterbit`  
**Category：** Health & Fitness  
**正式網址：** https://betterbit.app

> 本文件供 **App Store Connect** 直接複製貼上。  
> 字數限制依 Apple 2026 規範；提交前請在 Connect 介面確認剩餘字數。

---

## 欄位速查

| 欄位 | 字數上限 | 優先級 |
|------|----------|--------|
| App Name | 30 | P0 |
| Subtitle | 30 | P0 |
| Description | 4000 | P0 |
| Keywords | 100 | P0 |
| What's New | 4000 | P0（每次更新） |
| Promotional Text | 170 | P1（可隨時改，無需審核） |
| Review Notes | — | P0（建議英文給審核團隊） |

---

# App Name

**建議（30 字元內）：**

```
再健一點
```

**備選（若需英文辨識）：**

```
BetterBit 再健一點
```

> App Store 顯示名稱與 iOS 主畫面名稱需一致策略。目前 Capacitor `appName` 為「再健一點」。

---

# Subtitle

**建議（30 字元內）：**

```
照著做就好
```

**備選：**

```
個人化飲食與運動計畫
```

---

# Description

**繁中（App Store 主描述）：**

```
再健一點（BetterBit）幫你算好該吃多少、動多少，照著做就好。

你不用自己查熱量、排菜單、想運動課表。輸入體態與生活型態，系統依 TDEE 與目標，自動生成每日三餐與運動計畫，並依你的回饋每週調整。

【你可以這樣用】
• 今日：骰子選餐、文字記錄、拍照 AI 估算 — 不用填表
• 外食：7-ELEVEN、全家、150+ 品牌真實菜單，對齊熱量與蛋白質
• 本週：三餐＋運動一覽，生活變了可一鍵重排
• 進度：體重、體脂、達成率 — 安靜追蹤，不製造焦慮
• 熱量銀行：吃多了？明天慢慢走回來，沒有罪惡感

【適合誰】
• 想減脂、維持、或重新找回節奏的人
• 常外食、沒時間自己算的人
• 討厭「像填表」的健康 App 的人

【我們的態度】
NASA inside — 精準在背後運算。
A friend outside — 外面像朋友，不像教練。

【重要說明】
再健一點提供生活參考與營養估算，不是醫療建議。身體不適請先休息，並諮詢合格醫療人員。

【訂閱】
Premium 功能將於 App 內另行開放。目前 iOS 版以完整試用體驗為主。

【支援】
https://betterbit.app/support
```

---

# Keywords

**100 字元內，逗號分隔，不加空格（Apple 建議）：**

```
減肥,熱量,飲食,運動,健身,外食,便利商店,蛋白質,體重,計畫,健康,AI,拍照,記錄,TDEE
```

**備用詞（擇一替換，避免超過 100 字）：** 減脂,菜單,7-11,全家,本週計畫,體脂,無壓力

---

# What's New

**v1.0.0 首次上架：**

```
BetterBit 正式上線。

• 個人化週計畫 — 依你的目標自動排三餐與運動
• 今日記錄 — 骰子選餐、文字、拍照 AI，不用填表
• 150+ 品牌外食菜單 — 對齊熱量與蛋白質
• 進度與熱量銀行 — 安靜陪伴，不製造焦慮
• 14 天免費試用 — 先試再決定

照著做就好。
```

**後續更新模板：**

```
• 修正問題，提升穩定性
• 改善今日記錄與本週計畫體驗

感謝使用再健一點。
```

---

# Promotional Text

**170 字元內，可隨時更新、無需審核（P1）：**

```
拍照記錄食物，AI 幫你算。外食也能照計畫走。14 天免費試用，照著做就好。
```

**備選：**

```
不用填表的健康 App。骰子選餐、本週自動調整、熱量銀行沒有罪惡感。現在試試。
```

---

# Review Notes

**建議以英文提供給 Apple 審核團隊（P0 · 方案 C）：**

```
BetterBit (再健一點) is a personalized meal & workout planner for Traditional Chinese users in Taiwan.

TEST ACCOUNT:
Email: [provide demo account]
Password: [provide password]

RECOMMENDED REVIEW PATH (about 5 minutes):
1. Register or sign in with the test account
2. Complete 3-step onboarding (check the health disclaimer)
3. Today — log food via dice, text, or native camera + AI estimate
4. Weekly — view meal & workout plan
5. Progress — weight trend
6. Settings — Privacy / Terms / Support links; Delete account under 危險區域

iOS-SPECIFIC NOTES:
• Food photos use the native iOS camera API (Capacitor Camera) for logging only.
• Premium subscription and Apple Health are disabled in this build (informational Premium page only).
• Push notifications are not offered in the iOS app in this version.
• If offline, the app shows a retry screen instead of a blank error page.

Legal:
Privacy: https://betterbit.app/privacy
Terms: https://betterbit.app/terms
Support: https://betterbit.app/support

Thank you for reviewing BetterBit.
```

> **提交前必做：** 填入真實測試帳號；確認 Vercel Production 已設 `NEXT_PUBLIC_APP_STORE_SAFE_MODE=true`。

---

# App Store Connect 其他欄位

| 欄位 | 建議值 |
|------|--------|
| **Primary Category** | Health & Fitness |
| **Secondary Category** | Lifestyle（選填） |
| **Age Rating** | 4+（依問卷結果） |
| **Copyright** | © 2026 [Your Legal Entity Name] |
| **Privacy Policy URL** | https://betterbit.app/privacy |
| **Support URL** | https://betterbit.app/support |
| **Marketing URL** | https://betterbit.app |

---

# 本地化策略

| 語言 | 優先級 | 說明 |
|------|--------|------|
| 繁體中文（台灣） | **P0** | 主要市場，本文案即用 |
| English (U.S.) | **P2** | 拓展時再補 |

---

# 文案 Checklist

## P0 — 必須

- [ ] App Name 確定（再健一點 / BetterBit）
- [ ] Subtitle
- [ ] Description（繁中）
- [ ] Keywords
- [ ] What's New（v1.0.0）
- [ ] Review Notes（含測試帳號）
- [ ] Privacy / Support URL

## P1 — 建議

- [ ] Promotional Text（上線後可 A/B 調整）
- [ ] Subtitle A/B（「照著做就好」vs 功能型）
- [ ] 截圖標語與 Description 用語一致

## P2 — 可後補

- [ ] English (U.S.) 全套文案
- [ ]  seasonal Promotional Text
- [ ] 本地化 Keywords（英文）

---

## 相關文件

- [`APP_STORE_ASSETS.md`](./APP_STORE_ASSETS.md) — 圖示、截圖、影片規格
- [`APP_STORE_CHECKLIST.md`](./APP_STORE_CHECKLIST.md) — 合規 P0
- [`APPLE_IOS_SETUP.md`](./APPLE_IOS_SETUP.md) — TestFlight / Archive
