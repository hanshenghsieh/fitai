# TestFlight Build 3a

**目的：** 驗證 Nutrition Accuracy Engine 接入後，**不破壞**原本拍照流程。  
**Build：** iOS `CURRENT_PROJECT_VERSION = 3`  
**Feature flag：** `NEXT_PUBLIC_NUTRITION_ACCURACY_V1` **必須 false 或未設定**

---

## 雙層架構（必讀）

| 層 | 內容 | Build 3a 要求 |
|----|------|----------------|
| **Native shell** | `ios/App` — TestFlight 上傳的 .ipa | Build **3** |
| **Web app** | Capacitor 載入 `https://betterbit.app` | Vercel Production 已部署最新 code，且 **flag=false** |

只上傳 iOS Build 3、但 Vercel 未部署 → TestFlight 仍跑**舊版** web，無法驗證接入。

---

## 一鍵準備（Windows / Mac）

```bash
npm run testflight:3a-prep
```

等同：

1. 檢查 `NEXT_PUBLIC_NUTRITION_ACCURACY_V1 !== true`
2. 檢查 iOS build number = **3**
3. `npm test`（58 tests）
4. `npm run build`（強制 `NUTRITION_ACCURACY_V1=false`）
5. `npm run cap:sync`

---

## Mac：Archive + Upload

```bash
bash scripts/testflight-archive-mac.sh
```

或手動：

```bash
open ios/App/App.xcodeproj
```

Xcode 26：

1. Scheme **App** → **Any iOS Device (arm64)**
2. **Product → Archive**
3. Organizer → **Distribute App** → App Store Connect → **Upload**
4. App Store Connect → TestFlight → 等 **Processing** → **Ready to Test**

---

## Vercel Production 檢查（Archive 前）

在 [Vercel Dashboard](https://vercel.com) → Project → Settings → Environment Variables：

| 變數 | Production 值 |
|------|----------------|
| `NEXT_PUBLIC_NUTRITION_ACCURACY_V1` | **刪除** 或設 `false` |

部署完成後再測 TestFlight。

---

## Build 3a 驗證清單（flag=false）

- [ ] 拍照 → 辨識 → **直接**顯示名稱／熱量
- [ ] **沒有**「我想先確認一下」區塊
- [ ] **沒有**候選按鈕、高風險確認題
- [ ] 可手動改熱量 →「加入今天」
- [ ] 行為與 Build 2 一致

---

## Internal Testing

上傳後若未自動出現在 Internal 群組：

**App Store Connect → TestFlight → Build 3 → Internal Testing → 手動加入**

---

## Rollback

| 問題 | 作法 |
|------|------|
| 新 UI 意外出現 | Vercel 設 `NUTRITION_ACCURACY_V1=false` 並 redeploy |
| 拍照壞掉 | 同上；不需改 iOS build |
| 要回到 Build 2 | TestFlight 改分發舊 build |

---

## 與 Build 3b 差異

| | Build 3a | Build 3b |
|---|----------|----------|
| Flag | **false** | **true** |
| 確認 UI | 關閉 | 開啟 |
| 目的 | regression 測試 | Accuracy UX 測試 |

---

## 相關文件

- [`NUTRITION_ACCURACY_UI_INTEGRATION.md`](./NUTRITION_ACCURACY_UI_INTEGRATION.md)
- [`APPLE_IOS_SETUP.md`](./APPLE_IOS_SETUP.md)
