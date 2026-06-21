# Phase 10.4 — Settings (Shipped)

**Product model:** `2026-06-20-mr500-iter7-phase10-settings`  
**Feeling:** *This app quietly takes care of things.* — not *I need to configure everything.*

---

## Design Council (Settings-only)

| Role | Verdict |
|------|---------|
| **Apple ID** | Linear grouped list. Sparse rows. No cards-in-cards. |
| **Oura** | Health sync = premium connected state, not enable toggles. |
| **Airbnb Account** | Account + membership + privacy as trust layers. |
| **Notion** | Sections with quiet descriptions, not control panel labels. |
| **MUJI** | Removed stat grid, ZaiJian bubble, bullet paywall list, AlertTriangle stack. |
| **Founder (last)** | Subscription = care copy; regen plan as single row not engineering card. |

**Rejected:** backend labels, dense toggles, off/on health sync pair, MFP-style settings density.

---

## Shipped sections

| Section | Component | Notes |
|---------|-----------|-------|
| 帳號 | `SettingsAccountSection` | Email, expandable body metrics, rhythm/meal chips, regen, logout |
| 會員 | `SettingsSubscriptionSection` | Care tone; trial days when relevant |
| 健康資料 | `SettingsHealthSection` | Apple Health · 已連接 · auto sync copy |
| 通知 | `SettingsNotificationsSection` | Human paragraph + one enable button |
| 隱私 | `SettingsPrivacySection` | Trust, not legal fear |
| 支援 | `SettingsSupportSection` | Warm mailto |
| 關於 | `SettingsAboutSection` | NASA inside / friend outside |

Shared: `SettingsHeader`, `SettingsSection`, `SettingsRow`

---

## Ship Check

| Gate | Result |
|------|--------|
| MR500 — no 100+ redesign | ✅ Pass |
| Settings ≠ control panel | ✅ Linear sparse IA |
| Today / Week / Progress untouched | ✅ |
| Build | ✅ |

---

## MR500 iter7 snapshot

**Run:** `loop-2026-06-20-2026-06-20-mr500-iter7-phase10-settings`

| Metric | iter6 (Progress) | iter7 (+ Settings) |
|--------|------------------|---------------------|
| D30 | 66.2% | **67.0%** |
| Subscribe | 3.8% | **3.4%** |
| Would recommend | 55.2% | **53.6%** |
| Major blockers | none | **none** |

`設定太工程師` filtered when premium settings UI shipped.

---

## Next

**Phase 10.5 Premium** — membership invitation within Settings, one pass only.
