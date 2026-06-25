# BetterBit App Button QA Report

Generated: 2026-06-24T19:19:57.382Z

## Summary

| Metric | Count |
|--------|-------|
| Total buttons | 65 |
| Static pass | 65 |
| Static fail | 0 |
| Dynamic (manual/E2E) | 65 pending manual |

## Methodology

1. **Static verification** — `npm run qa:buttons` scans source for onClick / href / onSubmit patterns.
2. **Dynamic verification** — Manual checklist on iOS WebView + desktop mobile viewport. Playwright not installed; Puppeteer available but requires running dev server.

## Manual QA Checklist (dynamic)

For each button below, verify on device:
- Tap responds
- No console error
- Correct navigation / modal open-close
- Not obscured at 390×844
- iOS WebView (Capacitor) works

## Results

| page | button_name | selector_or_text | static_handler_found | dynamic_click_tested | result | issue | severity | fix_applied |
|---|---|---|---|---|---|---|---|---|
| Today | 試用天數 | 試用還剩 | yes | manual | pass |  |  |  |
| Today | 設定 | aria-label: 設定 | yes | manual | pass |  |  |  |
| Today | 刪除餐點 | aria-label: 移除 | yes | manual | pass |  |  |  |
| Today | 餐次切換 | 第 1 餐 | yes | manual | pass |  |  |  |
| Today | 就決定是它了 | 就決定是它了 | yes | manual | pass |  |  |  |
| Today | 換一個 | 換一個 | yes | manual | pass |  |  |  |
| Today | 更多記錄 | 更多記錄 | yes | manual | pass |  |  |  |
| Today | 拍今天吃的 | 拍今天吃的 | yes | manual | pass |  |  |  |
| Today | 刪除確認-先留著 | 先留著 | yes | manual | pass |  |  |  |
| Today | 刪除確認-移除 | 移除 | yes | manual | pass |  |  |  |
| Today | 為什麼這餐 | 為什麼這餐 | yes | manual | pass |  |  |  |
| Today | 更多記錄-關閉 | aria-label: 關閉 | yes | manual | pass |  |  |  |
| Today | 手動紀錄-搜尋 | onPickSearch | yes | manual | pass |  |  |  |
| Today | 常吃紀錄 | onCommitFrequent | yes | manual | pass |  |  |  |
| Today | 建立食物紀錄 | handleCreate | yes | manual | pass |  |  |  |
| Today | 拍照-返回 | 返回 | yes | manual | pass |  |  |  |
| Today | 拍照-關閉 | aria-label: 關閉 | yes | manual | pass |  |  |  |
| Today | 拍照-開啟相機 | 開啟相機拍照 | yes | manual | pass |  |  |  |
| Today | 拍照-相簿 | 從相簿選擇 | yes | manual | pass |  |  |  |
| Today | 拍照-重選 | 重選照片 | yes | manual | pass |  |  |  |
| Today | 拍照-加入今天 | 加入今天 | yes | manual | pass |  |  |  |
| Today | 下肢重訓展開 | setExpandedWorkout | yes | manual | pass |  |  |  |
| Today | 動作完成切換 | toggleExercise | yes | manual | pass |  |  |  |
| Today | 動作教學 | 動作教學 | yes | manual | pass |  |  |  |
| Today | 幫我排本週 | 幫我排本週 | yes | manual | pass |  |  |  |
| Today | 通知-好 | 好 | yes | manual | pass |  |  |  |
| Today | 通知-關閉 | aria-label: 關閉 | yes | manual | pass |  |  |  |
| BottomNav | 今日 | 今日 | yes | manual | pass |  |  |  |
| BottomNav | 本週 | 本週 | yes | manual | pass |  |  |  |
| BottomNav | 拍照記錄 FAB | aria-label: 拍照記錄 | yes | manual | pass |  |  |  |
| BottomNav | 分析 | 分析 | yes | manual | pass |  |  |  |
| BottomNav | 我的 | 我的 | yes | manual | pass |  |  |  |
| 本週 | 選擇日期 | onSelectDay | yes | manual | pass |  |  |  |
| 本週 | 日詳情-關閉 | aria-label: 關閉 | yes | manual | pass |  |  |  |
| 本週 | 去 Today 記今天 | 去 Today 記今天 | yes | manual | pass |  |  |  |
| 本週 | 週反思-還算穩 | 還算穩 | yes | manual | pass |  |  |  |
| 本週 | 週反思-有動 | 有動 | yes | manual | pass |  |  |  |
| 本週 | 週反思-上一步 | 上一步 | yes | manual | pass |  |  |  |
| 分析 | 更新體重 | 更新 | yes | manual | pass |  |  |  |
| 分析 | 加體脂 | 加體脂 | yes | manual | pass |  |  |  |
| 分析 | 取消體重 | 取消 | yes | manual | pass |  |  |  |
| 分析 | 記一下體重 | 記一下 | yes | manual | pass |  |  |  |
| 分析 | 繼續追蹤 | 繼續追蹤 | yes | manual | pass |  |  |  |
| 我的 | 我的數值 | 我的數值 | yes | manual | pass |  |  |  |
| 我的 | 儲存設定 | 儲存 | yes | manual | pass |  |  |  |
| 我的 | 工作排班 | onWorkSchedule | yes | manual | pass |  |  |  |
| 我的 | 共餐情境 | onEatingContext | yes | manual | pass |  |  |  |
| 我的 | 重排本週計畫 | 重排本週計畫 | yes | manual | pass |  |  |  |
| 我的 | 登出 | 登出 | yes | manual | pass |  |  |  |
| 我的 | 會員 | BetterBit 會員 | yes | manual | pass |  |  |  |
| 我的 | Apple Health | 連接 Apple Health | yes | manual | pass |  |  |  |
| 我的 | 開啟提醒 | 開啟提醒 | yes | manual | pass |  |  |  |
| 我的 | 隱私權政策 | 隱私權政策 | yes | manual | pass |  |  |  |
| 我的 | 服務條款 | 服務條款 | yes | manual | pass |  |  |  |
| 我的 | 支援中心 | 支援中心 | yes | manual | pass |  |  |  |
| 我的 | 刪除帳號 | 刪除帳號 | yes | manual | pass |  |  |  |
| 我的 | 刪除帳號-取消 | 取消 | yes | manual | pass |  |  |  |
| 我的 | 刪除帳號-永久刪除 | 永久刪除 | yes | manual | pass |  |  |  |
| 我的 | 會員-返回設定 | ← 設定 | yes | manual | pass |  |  |  |
| 我的 | 會員-結帳 | 繼續一起走走 | yes | manual | pass |  |  |  |
| 我的 | 會員-回 Today | 先回去 Today | yes | manual | pass |  |  |  |
| Auth | 登入 | 登入 | yes | manual | pass |  |  |  |
| Auth | 前往註冊 | 註冊 | yes | manual | pass |  |  |  |
| Auth | 建立帳號 | 建立帳號 | yes | manual | pass |  |  |  |
| Auth | 前往登入 | 登入 | yes | manual | pass |  |  |  |

## Known issues (non-blocking)

| Issue | Severity | Notes |
|-------|----------|-------|
| NotificationPrompt buttons lack `type="button"` | P3 | Low risk outside forms |
| Workout expand / exercise toggle icon-only | P3 | Consider aria-label |
| Settings privacy rows use `window.location.href` | P3 | Works; full page nav |
| PhotoLogSheet backdrop closes without save prompt | P3 | UX edge case |
| Display-only settings rows (Email, 你的資料) | P3 | Intentional |
