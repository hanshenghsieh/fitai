# Legacy Menu Status

**更新日期：** 2026-06-18（v2.1 大眾化資料策略）

## 現行主推薦資料（三層策略）

| 檔案 | 狀態 | 用途 |
|------|------|------|
| `official-foods-v2.json` | **ACTIVE** | 官方可驗證營養（連鎖、超商） |
| `standard-estimate-foods-v2.json` | **ACTIVE** | 台灣外食標準份量估算（主力） |
| `recommendation-foods-v2.json` | **ACTIVE** | 推薦引擎整合資料（上述兩者合併） |
| `recommendation-source-report-v2.json` | **ACTIVE** | 匯入報告與統計 |

### confidence_level 說明

| 層級 | UI | 推薦池 |
|------|-----|--------|
| `official` | 官方營養資料 | ✅ 可進主推薦 |
| `estimated` | 標準份量估算 | ✅ 可進主推薦 |
| `low_estimate` | 粗略估算 | ❌ 預設不進主推薦（紀錄用） |

## Legacy（保留備份，不刪除）

| 檔案 | 狀態 |
|------|------|
| `src/lib/convenience-store-menu.ts` | LEGACY |
| `data/food-kb/dice-menu-bulk.json` | LEGACY |
| `data/food-kb/menu-lookup-index.json` | LEGACY |

## 重建指令

```bash
node scripts/food-kb/build-recommendation-foods-v2.mjs
```
