# BetterBit 自訂網域設定指南

**目標網址：** https://betterbit.app  
**目前部署：** https://betterbit.app（Vercel，不搬移）  
**網域註冊：** GoDaddy · `betterbit.app`  
**架構（不變）：** GitHub → Vercel → betterbit.app

> 本文件只涉及 **Vercel Dashboard** 與 **GoDaddy DNS** 操作，**不需修改程式碼、不需搬移主機**。

---

## 概覽

```
使用者
  │
  ▼
betterbit.app  ──DNS──▶  Vercel Edge（SSL 自動）
                              │
                              ▼
                    fitai 專案（Next.js）
                    GitHub main 自動部署
```

Vercel 會在網域驗證通過後自動簽發 Let's Encrypt SSL。Vercel 預設 `*.vercel.app` 網址仍可使用（作為內部測試）。

---

## 第一步：Vercel 新增網域

### 1.1 登入 Vercel

1. 開啟 https://vercel.com/dashboard  
2. 進入 **fitai**（或對應此 repo 的）專案  
3. 上方分頁 → **Settings** → **Domains**

### 1.2 新增兩個網域

在 **Add Domain** 依序輸入並 Add：

| 網域 | 用途 |
|------|------|
| `betterbit.app` | 主網域（apex） |
| `www.betterbit.app` | 常見別名 |

Vercel 會顯示 **Invalid Configuration** 直到 DNS 設定完成——這是正常的。

### 1.3 記下 Vercel 要求的 DNS 值

點進各網域，Vercel 會顯示需設定的紀錄。**以 Dashboard 顯示為準**；標準值通常如下：

| 類型 | Host / Name | Value / Points to | 用途 |
|------|-------------|-------------------|------|
| **A** | `@` | `76.76.21.21` | apex `betterbit.app` |
| **CNAME** | `www` | `cname.vercel-dns.com` | `www.betterbit.app` |

> 若 Vercel 顯示不同 IP 或 CNAME，**請用 Vercel 畫面上的值**，不要硬套本表。

### 1.4 設定主網域與重新導向（建議）

DNS 生效後，在 **Domains** 頁：

1. 將 **`betterbit.app`** 設為 **Primary Domain**（三點選單 → Set as Primary）
2. 對 `www.betterbit.app` 選 **Redirect to betterbit.app**（301，建議）

結果：
- `https://betterbit.app` → 正式網站  
- `https://www.betterbit.app` → 301 導向 apex  

### 1.5 更新 Vercel 環境變數（Dashboard，非改 code）

**Settings → Environment Variables**，在 **Production** 更新：

| 變數 | 新值 |
|------|------|
| `NEXT_PUBLIC_APP_URL` | `https://betterbit.app` |

儲存後 → **Deployments** → 最新 deployment → **⋯ → Redeploy**（讓 Stripe 回調、推播連結等使用新網址）。

> 此步在 DNS 生效後再做即可；可先完成 DNS，確認 `betterbit.app` 能開再更新。

---

## 第二步：GoDaddy DNS 設定

### 2.1 進入 DNS 管理

1. 登入 https://www.godaddy.com  
2. **My Products** → 找到 **betterbit.app**  
3. 點 **DNS** 或 **Manage DNS**

### 2.2 刪除衝突紀錄（若有）

在 **DNS Records** 檢查並**移除**可能衝突的舊紀錄：

| 類型 | Name | 若存在且指向停車頁／轉址，請刪除 |
|------|------|----------------------------------|
| A | `@` | GoDaddy 預設停車頁 IP |
| CNAME | `@` | 部分方案 apex CNAME 會衝突 |
| CNAME | `www` | 指向 GoDaddy 轉址 |

保留 **NS**（Name Server）紀錄，不要改（除非你要整域搬到 Cloudflare 等——本指南不需要）。

### 2.3 新增 Vercel 所需紀錄

點 **Add** / **Add New Record**：

#### 紀錄 1 — Apex（根網域）

| 欄位 | 值 |
|------|-----|
| Type | **A** |
| Name | **@** |
| Value | **76.76.21.21** |
| TTL | 600 秒（或 1 Hour；預設即可） |

#### 紀錄 2 — WWW

| 欄位 | 值 |
|------|-----|
| Type | **CNAME** |
| Name | **www** |
| Value | **cname.vercel-dns.com** |
| TTL | 600 秒（或 1 Hour） |

> GoDaddy 的 CNAME Value 欄位**不要**加結尾 `.`（部分介面會自動處理）。

### 2.4 儲存

點 **Save**。GoDaddy 通常幾分鐘內 propagate，全球完全生效可能 **15 分鐘～48 小時**。

---

## 第三步：驗證是否成功

### 3.1 Vercel Dashboard

回到 **Settings → Domains**：

| 網域 | 預期狀態 |
|------|----------|
| `betterbit.app` | ✅ Valid Configuration |
| `www.betterbit.app` | ✅ Valid Configuration（或顯示 Redirecting） |

SSL 憑證通常自動完成，狀態顯示 **Valid** / 鎖頭圖示。

### 3.2 瀏覽器手動測試

```text
https://betterbit.app
https://betterbit.app/privacy
https://betterbit.app/register
https://www.betterbit.app   → 應 301 到 betterbit.app（若已設 redirect）
```

### 3.3 指令列（選用）

```bash
# 查 apex A 紀錄
nslookup betterbit.app

# 查 www CNAME
nslookup www.betterbit.app
```

預期：
- `betterbit.app` → `76.76.21.21`
- `www.betterbit.app` → `cname.vercel-dns.com` 或其 alias

---

## 第四步：第三方服務更新（DNS 生效後）

這些都在各服務 **Dashboard** 操作，**不需改 repo 程式**。

### 4.1 Supabase（登入 redirect）

**Supabase Dashboard → Authentication → URL Configuration**

| 欄位 | 加入 |
|------|------|
| Site URL | `https://betterbit.app` |
| Redirect URLs | `https://betterbit.app/**` |
| | 保留 `https://betterbit.app/**`（過渡期） |

### 4.2 Stripe（Checkout 回調）

Stripe Dashboard → Webhooks / Checkout settings：

- Success / Cancel URL 會從 `NEXT_PUBLIC_APP_URL` 產生 → 更新 Vercel env 並 Redeploy 後自動指向新網域  
- Webhook endpoint 維持 `https://betterbit.app/api/webhooks/stripe`（若 endpoint URL 是寫死在 Stripe，需改為新網域）

### 4.3 App Store / 法律頁

App Store Connect Privacy Policy URL 改為：

```text
https://betterbit.app/privacy
```

### 4.4 Capacitor iOS（Mac 上，下一輪）

iOS 殼目前 fallback 為舊 Vercel 網址。網域穩定後，在 Mac 執行：

```bash
CAP_SERVER_URL=https://betterbit.app npm run cap:sync
```

（屬後續 iOS 設定，非 DNS 必要步驟。）

---

## 操作檢查清單（逐步打勾）

### Vercel

- [ ] Settings → Domains → 新增 `betterbit.app`
- [ ] Settings → Domains → 新增 `www.betterbit.app`
- [ ] 記下 Vercel 顯示的 A / CNAME 值
- [ ] GoDaddy DNS 設定完成後，確認 Vercel 顯示 Valid Configuration
- [ ] 設 `betterbit.app` 為 Primary Domain
- [ ] 設 `www` → apex 301 redirect
- [ ] 更新 Production `NEXT_PUBLIC_APP_URL=https://betterbit.app`
- [ ] Redeploy Production

### GoDaddy

- [ ] DNS → 刪除 apex / www 衝突紀錄
- [ ] 新增 A：`@` → `76.76.21.21`
- [ ] 新增 CNAME：`www` → `cname.vercel-dns.com`
- [ ] 儲存

### 驗證

- [ ] `https://betterbit.app` 可開啟
- [ ] SSL 鎖頭正常
- [ ] `/privacy` `/terms` `/support` 可公開訪問
- [ ] 登入 / 註冊流程正常（Supabase redirect 已更新）

---

## 常見問題

### Vercel 一直 Invalid Configuration

1. 確認 GoDaddy A 紀錄 `@` 指向 `76.76.21.21`（非舊停車頁 IP）  
2. 確認只有**一條** apex A 紀錄  
3. 等 15–30 分鐘再 Refresh Vercel Domains 頁  
4. 用 https://dnschecker.org 查 `betterbit.app` A 紀錄是否全球傳播  

### GoDaddy 不讓 apex 設 CNAME

正常。apex 用 **A 紀錄** 指向 Vercel IP 即可；只有 `www` 用 CNAME。

### 舊網址還能用嗎？

可以。Vercel 預設 `*.vercel.app` 網址仍指向同一專案。正式對外請用 `betterbit.app`。

### 需要改 GitHub 嗎？

**不需要。** 推送 `main` 仍觸發 Vercel 自動部署；只是對外網域從 `*.vercel.app` 變成 `betterbit.app`。

### 需要搬離 Vercel 嗎？

**不需要。** 網域只是 DNS 指向 Vercel，主機仍在 Vercel。

---

## 快速對照表

| 項目 | 值 |
|------|-----|
| 正式網址 | https://betterbit.app |
| Vercel 專案 | fitai（betterbit.app） |
| GitHub | https://github.com/hanshenghsieh/fitai |
| GoDaddy 網域 | betterbit.app |
| Apex A 紀錄 | `@` → `76.76.21.21` |
| WWW CNAME | `www` → `cname.vercel-dns.com` |
| SSL | Vercel 自動（Let's Encrypt） |

---

## 相關文件

- [Vercel Custom Domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [GoDaddy — Add a CNAME record](https://www.godaddy.com/help/add-a-cname-record-19236)
- [`docs/APPLE_IOS_SETUP.md`](./APPLE_IOS_SETUP.md)
- [`docs/APP_STORE_CHECKLIST.md`](./APP_STORE_CHECKLIST.md)
