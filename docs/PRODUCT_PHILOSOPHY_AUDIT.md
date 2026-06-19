# Phase 4 — Philosophy Audit (Control Inversion)

**Date:** 2026-06-19  
**Prior verdict (Phase 1–3):** Ship it — **SUPERSEDED for product meaning**  
**New verdict:** Engine shippable. **Cockpit must be rebuilt before scale.**

---

## The One Question

> **Who controls life?**

| Screen | Current answer | Required answer |
|--------|----------------|-----------------|
| Today | BetterBit (preset meals) | **User** |
| Onboarding | BetterBit (science preview) | **User** |
| Weekly | BetterBit (meal grid) | **User** |
| Dice/Swap | BetterBit suggests, user swaps | **User calls rescue** |
| Progress | Shared (weight outcome) | **User body, system narrative** |

**Current product fails the golden rule on 3/5 core screens.**

---

## Phase 1–3 vs Phase 4

| Dimension | Phase 1–3 | Phase 4 OS |
|-----------|-----------|------------|
| Entry question | 今天吃什麼（我幫你決定） | **你想吃什麼？** |
| Science | Visible (CoachPlanSummary) | **Hidden (banks)** |
| Meals | Pre-generated 7-day plan | **On-demand + user log** |
| Deviation | Swap to another preset | **Correction engine spread** |
| Dice | 換一個同熱量的 (hero) | **🎲 交給我 (rescue link)** |
| 再健 | Companion + science translator | **Recovery roommate only** |
| Premium | 自動重算餐點 | **持續校正引擎** |
| Failure mode | 沒瘦 = 疑慮 | **沒瘦 = 先觀察（平台期敘事）** |

---

## What We Keep (Engine)

- `goal-calculator.ts` — TDEE, deficit, protein
- `workout-nutrition.ts` — exercise ↔ intake
- `plan-regen.ts` — auto recalc on body change
- `meal-combo-engine.ts` — constraint solver (moves behind dice/search)
- `feedback-adjustments.ts` — weekly adaptation
- `plateau-story.ts`, `life-event-copy.ts` — aligned with Phase 4
- `human-mode.ts` shift labels — keep

---

## What We Kill or Demote (Cockpit)

| Asset | Action |
|-------|--------|
| `HomeDecisionHero` as default Today | **Replace** with search-first entry |
| `CoachPlanSummary` above fold | **Collapse** to opt-in |
| `PLAN_FIRST_HINT` | **Delete** |
| `BreathingProgress` % hero | **Demote** or remove |
| 7-day preset meal display | **Demote** to history / optional |
| Onboarding kcal preview | **Hide** behind toggle |
| `TrialBanner` meal copy | **Rewrite** |
| Guilt `characterMessages` | **Purge** from active pickers |
| `pickDiceLine` guilt tiers | **Never surface** |

---

## Copy Rewrite Map (High Priority)

| Current | Phase 4 |
|---------|---------|
| 照這個吃。不想吃再換。 | 你決定吃什麼。我幫你兜著。 |
| 不用自己想 | **DELETE** — implies no agency |
| 系統依你的目標設計。照著做，不用自己想。 | 你照常過。我幫你調。 |
| 要繼續讓我幫你想吃什麼嗎？ | 要繼續讓我幫你調嗎？ |
| 換一個同熱量的 (hero) | 不知道吃什麼？🎲 交給我 |
| 每日目標 X kcal | （internal only） |
| 本週科學目標 | 本週節奏 |
| 你有在變嗎？ | 身體有在回應。只是不一定每天顯示。 |

---

## Implementation Gate

**Do NOT write code until:**

1. Founder confirms control inversion
2. Today wireframe approved (search-first)
3. Bank semantics approved (calorie/protein/exercise)
4. Correction table approved (+100 / +500 / +2000)
5. Food log UX approved (how user declares what they ate)

**Then:** P0 engine → P1 Today flip → P2 copy purge → P3 Market Reality Lab re-run

---

## Re-Run Market Reality Lab Targets (Post Phase 4)

| Metric | Phase 3 sim | Phase 4 target |
|--------|-------------|----------------|
| Quit @ D90 | 70% | < 55% |
| Subscribe | 10% | > 15% |
| Quit reason #1 | don't trust meals | life feels free |
| Night shift quit @ D7 | high | < 20% of shift users |

---

**Bottom line:** BetterBit has a NASA engine in a meal-planning cockpit. Phase 4 rebuilds the cockpit, not the rocket.

See full spec: [BETTERBIT_OS.md](./BETTERBIT_OS.md)
