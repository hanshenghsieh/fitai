# IAP 訂閱抓不到商品 — App Store Connect 設定

當 TestFlight 出現：

> None of the products registered in the RevenueCat dashboard could be fetched from App Store Connect

代表 **App 原生付款已正常**（Build 13 成功），但 **Apple 後台還沒把訂閱商品放給 StoreKit 抓**。

**不需要重新 Archive。** 修好 ASC 設定，等數小時後重試即可。

---

## 必查 5 項（依序）

### 1. 付費 App 協議（最常漏）

App Store Connect → **商務** → **協議、稅務和銀行業務**

- **「Paid Applications」/ 付費 App** 狀態必須是 **有效 / Active**
- 若顯示「需要設定」→ 完成銀行帳戶 + 稅務表單

❌ 協議未生效 → StoreKit **永遠抓不到任何 IAP 商品**

---

### 2. 訂閱商品 Product ID 必須完全一致

App Store Connect → 你的 App → **訂閱**

| 欄位 | 必須是 |
|------|--------|
| Product ID | `betterbit_pro_monthly` |
| Bundle ID | `app.fitai.betterbit` |

RevenueCat Dashboard → Products → 同一個 `betterbit_pro_monthly`

Vercel env → `NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID=betterbit_pro_monthly`

---

### 3. 訂閱必填資料齊全

在 ASC 點進 `betterbit_pro_monthly`，確認：

- [ ] 已加入 **訂閱群組**（Subscription Group）
- [ ] 已設 **價格**（例：NT$299 / 月）
- [ ] 至少一種 **本地化**（繁中顯示名稱 + 描述）
- [ ] 狀態至少是 **準備提交 / Ready to Submit**（可以，但上面都要填完）

---

### 4. RevenueCat 連線

RevenueCat → Project → Apps → BetterBit (iOS)

- [ ] Bundle ID = `app.fitai.betterbit`
- [ ] **In-App Purchase Key** 綠勾
- [ ] **App Store Connect API** 綠勾
- [ ] Products 有 `betterbit_pro_monthly`
- [ ] Offerings → `default` → Monthly package 綁 `betterbit_pro_monthly`

Product 顯示 **Could not check** 有時仍可在 Sandbox 測，但 ASC 商品本身必須存在且資料完整。

---

### 5. Sandbox + 等待傳播

iPhone：

- **設定 → 開發人員 → Sandbox Apple 帳號** → 登入測試帳號
- 不要用 Sandbox email 登 BetterBit App 登入頁

新建或修改訂閱商品後，Apple 可能需要 **2–24 小時** 才在 Sandbox 可抓。改完 ASC 等幾小時再試。

---

## 驗收

1. 殺 App 重開
2. 會員頁 → 訂閱
3. 應看到：**讀取方案… → 等待 Apple 付款…** → Apple 付款視窗

若仍失敗，截圖錯誤 toast（現在會是中文說明）+ ASC 訂閱商品頁狀態。
