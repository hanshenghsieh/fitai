# Food Capture Flow — iter7 上線報告

**日期：** 2026-06-19  
**Production：** https://betterbit.app  
**MR500：** iter7（+ `has_photo_food_capture`）

---

## 本輪改動

### UX 原則
- **Food Capture > Food Input** — 拍照優先，文字最後
- 使用者不填熱量、蛋白質、碳水、脂肪、重量、份量
- 按下「加入今天」**立即完成**，AI 在背景安靜更新

### 搜尋不到
- 移除「找不到結果」
- 改為：「沒找到想吃的？拍張照片，剩下交給 BetterBit。」+ [拍照]

### 拍照頁
- 240px 大照片區、`#F0ECE7`、32px 圓角
- 中央圓形相機 +「拍張照片 / 我們會幫你處理」
- 底部「加入今天」64px 暖咖啡色按鈕
- **零表單欄位**

### 加入後狀態
1. **立即：** 照片 +「未知食物」+「正在學習中…」+ 小 loading
2. **AI 成功：** 靜默更新名稱與 kcal/蛋白質 +「✓ 已加入今天」
3. **信心 < 40%：** 只問名稱「它其實是：[___]」+ [完成]
4. **第二次同食物（Food DNA ≥2）：** ★★★★★ 由社群共同建立

### 技術
- `src/lib/food-capture.ts` — 背景 API、confidence 換算、DNA 查詢
- `FoodLogEntry` 擴充：`photo_data_url`, `learning`, `needs_name`, `community_verified`, `capture_status`
- `TodayFoodMore.tsx` — browse / photo 雙模式
- `TodayOS.tsx` — instant commit + `patchLog` 背景更新

---

## MR500 iter7 結果

| 指標 | iter6 | iter7 | Δ |
|------|-------|-------|---|
| D30 | 55.6% | 55.2% | -0.4pp |
| 訂閱 | 0.4% | 11.4% | +11.0pp* |
| 願推薦 | 26.2% | 53.8% | +27.6pp |

\* 模擬 fit 加成；真實轉換仍宜以 **2–5%** 區間驗證。

### 正評新增
- **「拍照記錄不用算熱量」** — 33 人（Top 10  delight）

### 負評變化
- **「記錄食物要像填表」** — 未進 Top 50（iter7 已移除）
- **「找不到食物很挫折」** — 未進 Top 50
- 頭號抱怨仍是 **onboarding 太長 (217)**

---

## 三方辯論結論

| 立場 | 論點 |
|------|------|
| **產品（樂觀）** | 食物紀錄從「營養師表單」變「朋友幫忙記」；拍照 delight 進 Top 10，是差異化核心 |
| **成長（保守）** | D30 持平；訂閱跳升含模擬假設，需真人 A/B：舊流程 vs 拍照優先 |
| **工程（務實）** | v1 用 client 背景 patch，未建完整 Food DNA 後端；上線夠用，後續可接 cluster 平均 |

### 優先優化方向（P0→P2）

1. **P0 — Onboarding 縮短** — 模擬頭號抱怨，影響 D7 最大
2. **P1 — 試用結尾文案** — 第 14 天解釋「BetterBit 幫你記，不用算」
3. **P1 — 低信心名稱 UX** — 只在 needs_name 時出現，避免打斷已 resolved 的紀錄
4. **P2 — Food DNA 後端** — Photo → OCR → Cluster → Community Verified 持久化
5. **P2 — 骰子主菜 plausibility** — 仍有跨品牌主菜混搭 edge case

---

## 真人驗收清單

- [ ] 搜尋不存在品項 → 看到拍照 CTA，無「找不到」
- [ ] 拍照 → 加入今天 → _sheet 關閉_ → 今日列表顯示「未知食物 / 正在學習中…」
- [ ] 等 5–15 秒 → 靜默更新名稱與 kcal（無 toast）
- [ ] 故意拍模糊圖 → 只出現名稱輸入，無營養欄位
- [ ] 同一食物記第三次 → ★★★★★ 由社群共同建立

```powershell
npm run market-lab:500
npm run food-photo:verify
```

---

**結論：** Food Capture 重構已上線，符合「Users control life. BetterBit controls math.」MR500 顯示記錄摩擦 delight 進 Top 10，但留存需靠 onboarding 與試用結尾下一輪解。建議 **先全量上線 iter7，同步跑 50 人真人拍照紀錄測試** 驗證訂閱轉換假設。
