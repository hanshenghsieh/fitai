# Release Gate — 送測 / TestFlight 前必跑

在跟用戶說「可以測了」之前，先跑：

```bash
npm run qa:release-gate
```

有 E2E 帳號時（建議）：

```bash
BB_E2E_EMAIL=測試帳號@email.com BB_E2E_PASSWORD=密碼 npm run qa:release-gate
```

報告輸出：`docs/RELEASE_GATE_REPORT.md`

---

## Gate 包含什麼

| 步驟 | 類型 | 說明 |
|------|------|------|
| `npm test` | 必過 | 全專案單元測試 |
| `qa:release-gate:unit` | 必過 | 回歸重點：IAP、cache、餐點刪除、帳號切換 |
| `qa:e2e-coverage` | 必過 | 路由 / 流程靜態覆蓋 |
| `qa:buttons` | 必過 | 按鈕 registry 完整性 |
| `qa:food-log-persist-e2e` | 選填* | 瀏覽器 E2E：加餐、刪餐、分頁切換 |

\* 未設 `BB_E2E_EMAIL` 時跳過（warn），但 **TestFlight 前建議必跑**。

---

## 回歸矩陣（已自動化）

### 餐點
- [x] 新增 + PATCH 持久化
- [x] **刪除 + 本地 cache 優先於 server**（`nutrition-day-food-logs.test.ts`）
- [x] 分頁切換後不復原（`food-log-persist-e2e` + e2e 腳本）
- [x] 登出清 cache（`clear-user-local-state.test.ts`）

### IAP
- [x] subscription row 格式（`apple-iap-store.test.ts`）
- [x] upsert 含 legacy schema fallback（`apple-iap-sync-regression.test.ts`）
- [x] iOS payment gate / env（`ios-payment-gate.test.ts`）

### 同步
- [x] pending sync 標記（`offline-pending-sync.test.ts`）
- [x] checkin payload 大小（手動 `food-log-persist.test.ts`）

---

## 仍須真機手測（Gate 無法替代）

1. TestFlight Build：IAP 訂閱 → 還原 → 刪 App 重裝
2. Sandbox 登入：設定 → 開發人員 → Sandbox Apple 帳號
3. 刪除餐點 → 切換今日/本週/我的 → 回今日
4. 換帳號登入：舊帳號餐點不應出現

見 `docs/APP_STORE_REVIEW_CHECKLIST.md` P0 區塊。

---

## CI 建議

PR 或 deploy 前：

```bash
npm run qa:release-gate
```

 nightly 加 E2E creds 跑完整 gate。
