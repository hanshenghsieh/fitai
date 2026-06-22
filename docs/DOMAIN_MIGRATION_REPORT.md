# BetterBit 網域遷移報告

**遷移日期：** 2026-06-18  
**舊正式網址：** `https://fitai-taupe-sigma.vercel.app`（Vercel 預設）  
**新正式網址：** `https://betterbit.app`  
**架構：** GitHub → Vercel → betterbit.app（不變）

---

## 遷移摘要

| 項目 | 狀態 |
|------|------|
| 硬編碼舊網址清除 | ✅ 已清除（repo 內零匹配） |
| SEO metadataBase / canonical | ✅ 已設定 |
| Open Graph / Twitter | ✅ 已設定 |
| sitemap.xml | ✅ 新增 |
| robots.txt | ✅ 新增 |
| manifest.json | ✅ 已更新 id / scope |
| App Store 法律頁 URL | ✅ 指向 betterbit.app |
| 推播 / Stripe 回調 URL | ✅ 統一 `getAppUrl()` |
| Capacitor iOS 殼 | ✅ 指向 betterbit.app |

---

## 新增檔案

| 檔案 | 用途 |
|------|------|
| `src/lib/app-url.ts` | 正式網址單一來源（`PRODUCTION_APP_URL`） |
| `src/lib/site-metadata.ts` | 共用 SEO metadata 工廠 |
| `src/app/sitemap.ts` | 動態 sitemap.xml |
| `src/app/robots.ts` | 動態 robots.txt |
| `docs/DOMAIN_MIGRATION_REPORT.md` | 本報告 |

---

## 修改檔案

### SEO / App Metadata

| 檔案 | 變更 |
|------|------|
| `src/app/layout.tsx` | `metadataBase`、Open Graph、Twitter、canonical、robots |
| `src/app/page.tsx` | 首頁 canonical + OG |
| `src/app/privacy/page.tsx` | canonical + OG |
| `src/app/terms/page.tsx` | canonical + OG |
| `src/app/support/page.tsx` | canonical + OG |
| `public/manifest.json` | `id`、`scope` → betterbit.app |

### URL 集中化（share links / 回調）

| 檔案 | 變更 |
|------|------|
| `src/app/api/create-subscription/route.ts` | `getAppUrl()` |
| `src/app/api/billing-portal/route.ts` | `getAppUrl()` |
| `src/app/api/weekly-feedback/route.ts` | `getAppUrl()` |
| `src/app/api/send-notifications/route.ts` | `absoluteUrl()` 推播 deep link |
| `src/app/api/cron/send-scheduled-notifications/route.ts` | `absoluteUrl()` |
| `src/lib/plan-regen.ts` | `getAppUrl()` |

### iOS 殼

| 檔案 | 變更 |
|------|------|
| `capacitor.config.ts` | Production URL + allowNavigation → betterbit.app |

### 設定 / 文件 / 腳本

| 檔案 | 變更 |
|------|------|
| `.env.example` | Production URL 註解 |
| `SETUP.md` | Vercel env 說明 |
| `APP_STATUS.md` | Production URL |
| `docs/DOMAIN_SETUP.md` | 正式網址 |
| `docs/APPLE_IOS_SETUP.md` | Production / 法律頁 URL |
| `docs/APP_STORE_CHECKLIST.md` | Production URL |
| `docs/QA_REPORT.md` | 測試環境 URL |
| `docs/market-reality-lab-500/*.md` | Production URL |
| `scripts/qa-e2e.mjs` | 預設 BASE URL |
| `scripts/qa-os-e2e.mjs` | 預設 BASE URL |
| `scripts/create-test-accounts.mjs` | 預設 BASE URL |

---

## 未修改（刻意保留）

| 項目 | 原因 |
|------|------|
| `support@fitai.app` | 信箱網域，非網站 URL |
| Supabase / Stripe Dashboard 設定 | 需在各自 Dashboard 手動更新 |
| Vercel `NEXT_PUBLIC_APP_URL` env | 需在 Vercel Dashboard 設為 `https://betterbit.app` |

---

## SEO 設定詳情

### metadataBase

```typescript
// src/app/layout.tsx
metadataBase: new URL(getAppUrl())  // → https://betterbit.app
```

所有相對 canonical / OG URL 自動解析為正式網域。

### sitemap.xml（公開頁）

| URL | priority |
|-----|----------|
| `/` | 1.0 |
| `/register` | 0.9 |
| `/login` | 0.5 |
| `/privacy` | 0.6 |
| `/terms` | 0.6 |
| `/support` | 0.6 |

路徑：`https://betterbit.app/sitemap.xml`

### robots.txt

- **Allow：** `/`, `/privacy`, `/terms`, `/support`, `/register`, `/login`
- **Disallow：** `/api/`, `/dashboard`, `/onboarding`, `/weekly`, `/progress`, `/settings`
- **Sitemap：** `https://betterbit.app/sitemap.xml`
- **Host：** `https://betterbit.app`

登入後 App 頁面不索引，避免 duplicate content。

### manifest.json

```json
{
  "id": "https://betterbit.app/",
  "scope": "https://betterbit.app/"
}
```

---

## App Store Connect 可直接使用

| 欄位 | URL |
|------|-----|
| **Privacy Policy URL** | https://betterbit.app/privacy |
| **Terms of Use** | https://betterbit.app/terms |
| **Support URL** | https://betterbit.app/support |
| **Marketing URL** | https://betterbit.app |

---

## 部署後驗證清單

```bash
# 1. 確認 repo 無舊網址
rg "fitai-taupe-sigma" .

# 2. 確認 SEO 端點
curl -I https://betterbit.app/sitemap.xml
curl -I https://betterbit.app/robots.txt

# 3. 確認 canonical（View Source）
# https://betterbit.app/privacy → <link rel="canonical" href="https://betterbit.app/privacy" />

# 4. 確認 Vercel env
# NEXT_PUBLIC_APP_URL=https://betterbit.app
```

### Supabase（Dashboard）

- Site URL → `https://betterbit.app`
- Redirect URLs → `https://betterbit.app/**`

### Stripe（Dashboard）

- Webhook → `https://betterbit.app/api/webhooks/stripe`

---

## 驗證結果（repo 內）

```text
rg "fitai-taupe-sigma.vercel.app" .
→ 0 matches（僅本報告「舊網址」欄位提及）
```

---

## 相關文件

- [`docs/DOMAIN_SETUP.md`](./DOMAIN_SETUP.md) — DNS / Vercel 設定
- [`docs/APP_STORE_CHECKLIST.md`](./APP_STORE_CHECKLIST.md) — App Store P0
- [`docs/APPLE_IOS_SETUP.md`](./APPLE_IOS_SETUP.md) — Capacitor / TestFlight
