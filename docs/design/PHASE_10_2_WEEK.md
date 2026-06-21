# Phase 10.2 — Week (Shipped)

**Product model:** `2026-06-20-mr500-iter5-phase10-week`  
**Question answered:** *How is this week going?* — not *What should I do today?*

---

## Design Council (Week-only)

| Role | Verdict |
|------|---------|
| **Oura** | Vertical timeline + posture line. No scores. Past days fade; today breathes. |
| **Apple Fitness** | Week is context, not action. One link to Today for logging. |
| **Headspace** | Reflection is two taps, not homework. No textareas in default path. |
| **Noom PM** | Weekly close exists (Thu–Sun prompt) without lesson stack. |
| **Airbnb trip** | Tap day → sheet, not new page. Journey feel over dashboard. |
| **Busy Office Woman** | Removed kcal grid and 「去 Today」 banner. Week = orientation. |
| **Founder (last)** | Cut grocery preview and stat cards for 10.2. Can revisit in Settings if needed. |

**Anti-patterns rejected:** streaks, completion %, status badges, hero dice, food entry, Excel stats.

---

## Shipped UI

| Component | Role |
|-----------|------|
| `WeekHeader` | Title + dynamic posture (`buildWeekPosture`) |
| `WeekTimeline` | 7-day journal rail; today elevated |
| `WeekDaySheet` | Day detail sheet; Today → `/dashboard` CTA only for today |
| `WeekReflection` | 2 taps: week feel → movement feel → auto submit |
| `weekly-journey.ts` | Journal lines, no kcal in mood |

**Reflection mapping (backend unchanged):**  
`還算穩/有點亂/需要休息` + `有動/剛好/幾乎沒動` → existing `weekly_feedback` fields.

---

## Ship Check

| Gate | Result |
|------|--------|
| MR500 — no 100+ redesign | ✅ Pass |
| Week ≠ second Today | ✅ No dice, no food entry |
| Reflection ≤ 3 taps | ✅ 2 taps (+ optional back) |
| No gamification | ✅ No streaks/scores/rewards |
| Build | ✅ `npm run build` |

---

## MR500 iter5 snapshot

**Run:** `loop-2026-06-20-2026-06-20-mr500-iter5-phase10-week`

| Metric | iter4 (Today) | iter5 (+ Week) |
|--------|---------------|----------------|
| D30 | 65.2% | **66.0%** |
| Would recommend | 55.6% | **55.4%** |
| Major blockers | none | **none** |

Top complaint remains trial expectation (`試用14天還沒瘦`, 40) — conversion, not Week UI.  
`週回饋填了沒感覺` dropped out of top 8 after 2-tap reflection.

---

## Next

**Phase 10.3 Progress** — one page only, after Week gate.
