# Sprint 4 — 50 家餐廳

**狀態：** 進行中  
**主題：** 火鍋 · 麻辣（+ Sprint 3 draft 殘留）  
**政策：** Zero Hallucination · BDGS Promotion Pipeline

## 指令

```bash
npx tsx scripts/menu-backfill/scaffold-sprint-4-brands.ts
npm run backfill:sprint-4
npm run bdgs:report
```

## Promotion（Sprint 1–3 累積）

```bash
npm run backfill:promote   # Founder 核准後
npm run sync-menu          # 合併 staging-promoted.json → runtime
```
