# Growth Collector Architecture

可插拔資料收集器。每個平台一個 collector，回傳統一格式後由 Dashboard 匯入。

## 統一輸出格式

```ts
{
  platform: string
  url: string
  author: string | null
  content: string
  createdAt: string   // ISO 8601
  keyword: string | null
}
```

## 架構

```
growth/collectors/
  types.ts      # 介面與 CollectedPost
  base.ts       # 共用 helper
  registry.ts   # 註冊表 + 批次執行
  import.ts     # 寫入 DB + 去重
  threads.ts
  dcard.ts
  ptt.ts
  reddit.ts
```

新增平台：實作 `GrowthCollector` → 加入 `registry.ts` 的 `COLLECTORS` 陣列。

## 能力等級（CollectorCapability）

| 等級 | 說明 |
|------|------|
| `automated_search` | 可依關鍵字自動搜尋 |
| `url_fetch` | 使用者提供 URL，擷取單篇 |
| `manual_only` | 僅能手動貼 URL + 內文 |
| `unavailable` | 目前無法取得 |

---

## 各平台現況

### Reddit (`reddit.ts`)

| 項目 | 說明 |
|------|------|
| **自動搜尋** | ✅ 可行，需 **Reddit 官方 OAuth API** |
| **URL 擷取** | ✅ 可行，公開 `.json` 端點（單篇） |
| **環境變數** | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, 可選 `REDDIT_USER_AGENT` |
| **限制** | Rate limit；繁中討論量較少 |
| **大量爬蟲** | ❌ 不實作，遵守 API ToS |

### PTT (`ptt.ts`)

| 項目 | 說明 |
|------|------|
| **自動搜尋** | ❌ 無官方 API，不做法規上不明確的大量爬蟲 |
| **URL 擷取** | ✅ 使用者提供 `ptt.cc` 文章 URL，擷取單篇公開 HTML |
| **需官方 API** | 否（PTT 無公開 API） |
| **限制** | HTML 結構變更需更新 parser；僅限 Founder 主動提供的 URL |

### Dcard (`dcard.ts`)

| 項目 | 說明 |
|------|------|
| **自動搜尋** | ❌ 無第三方公開搜尋 API |
| **URL 擷取** | ❌ 前端 SPA + 登入牆，伺服器端不穩定 |
| **可行方式** | **使用者手動**複製 URL + 全文到「新增貼文」 |
| **未來** | 若有官方合作 API，替換 `dcard.ts` 實作即可 |

### Threads (`threads.ts`)

| 項目 | 說明 |
|------|------|
| **自動搜尋** | ❌ Meta 未提供公開搜尋 API |
| **URL 擷取** | ❌ 需登入／動態載入 |
| **可行方式** | **使用者手動**複製 URL + 全文 |
| **未來** | Meta Threads API（需申請權限）可接入 `search()` |

---

## API

| 端點 | 用途 |
|------|------|
| `GET /api/growth/collectors` | 各平台能力狀態 |
| `POST /api/growth/collect/search` | 關鍵字搜尋（僅支援的平台） |
| `POST /api/growth/collect/fetch-url` | 單篇 URL 擷取 |
| `POST /api/growth/collect/import` | 將 CollectedPost[] 寫入 DB 並 AI 分析 |

## 原則

- **不使用 mock / 示範資料**
- 無法合法自動化的平台，collector 回傳空陣列 + 明確 `meta.message`
- Dashboard 顯示各平台狀態，不假裝已完成
