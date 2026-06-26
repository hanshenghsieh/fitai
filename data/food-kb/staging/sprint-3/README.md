# Sprint 3 — 50 家餐廳

**狀態：** 進行中  
**主題：** 燒肉 · 拉麵 · 韓式（+ Sprint 2 draft 殘留）  
**政策：** Zero Hallucination · BDGS Promotion Pipeline

## 指令

```bash
npx tsx scripts/menu-backfill/scaffold-sprint-3-brands.ts  # 產生 brands.json
npm run backfill:sprint-3                                 # build staging manifest
npm run bdgs:report                                       # health dashboard
```

## BDGS 要求

每筆品項須具備：`created_at` / `review_due_at` / `version` / `promotion_stage`  
禁止 Draft → Runtime 直跳。
