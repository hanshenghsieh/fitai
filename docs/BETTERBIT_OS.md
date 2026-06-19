# BetterBit Operating System — Phase 4 Blueprint

**Date:** 2026-06-19  
**Status:** PHILOSOPHY REBUILD — **Do not implement until this doc is approved**  
**One sentence:** 使用者活。BetterBit 調。😐 今天照常過。剩下交給我。

---

## 0. What We Are Retiring (Founder Assumptions to Kill)

| Dead assumption | Why it dies |
|-----------------|-------------|
| Meal-first IA | Users live first; food is one input |
| "AI decides meals" | Users decide food; engine decides trajectory |
| "Follow the plan" | Plans are internal simulations, not orders |
| Science-first dashboard | NASA inside, friend outside |
| Dice as product hero | Dice is rescue, not entry |
| Daily exam (checkoffs, %) | Weekly rhythm, not daily grades |
| Calorie tracker UX | Banks are internal; never "you exceeded" |
| Discipline / streak / guilt | Recovery is the product |
| Premium = meal generation | Premium = continuous invisible correction |

**Phase 1–3 shipped the wrong funnel.** Science was correct. **Control inversion was wrong.**

---

## 1. The Golden Rule (Non-Negotiable)

```
Users decide LIFE  →  what to eat, when to rest, when to cheat, when to quit logging
BetterBit decides MATH  → banks, deficit pacing, protein gap, weekly exercise volume, correction spread
```

**Test at every screen:** "Who controls life?" If BetterBit → redesign.

---

## 2. What BetterBit IS / IS NOT

### IS NOT
飲食 app · 配餐機 · 熱量記錄器 · 軍訓教練 · 自律 app · 懲罰系統 · 巨量計算機 · 限制 app · chatbot

### IS
Personal health OS · Recovery engine · Correction engine · Invisible nutrition scientist · Silent coach · Trusted companion (再健)

---

## 3. Architecture: Two Layers

```
┌─────────────────────────────────────────────────────────────┐
│  EXTERNAL — 再健 speaks human                               │
│  Freedom · Trust · Hope · No guilt · No numbers (default)   │
├─────────────────────────────────────────────────────────────┤
│  INTERNAL — NASA engine (never shown unless user asks)      │
│  Calorie bank · Protein bank · Exercise bank · TDEE ·      │
│  NEAT · Plateau · Adaptive metabolism · Life events ·       │
│  Weekly feedback · Correction spread · Goal trajectory      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Internal Engine — The Banks

### 4.1 Calorie Bank

**Concept:** Goal = fat mass delta over time. Convert to total kcal budget. Pace daily average. Track running balance.

```
Example (internal only):
  70kg @ 22% BF → target 16% BF
  Fat to lose: 4.2 kg
  Total deficit budget: 29,400 kcal (7,700 × 4.2)
  Horizon: 90 days
  Daily pace: ~326 kcal/day average (not a hard daily cap)
```

**State variables:**
- `total_budget_kcal` — remaining fat-loss budget
- `days_remaining` — goal horizon
- `daily_pace_kcal` — target average
- `running_balance` — cumulative vs plan (can be + or -)
- `yesterday_delta` — what user actually ate vs internal expectation

**Never expose:** debt, failure, "compensate tomorrow", exceeded calories.

### 4.2 Protein Bank

```
Target: 130g/day (from lean mass)
Actual yesterday: 95g
Gap: 35g → internal flag
External: 「睡前喝個豆漿就差不多了。」
```

### 4.3 Exercise Bank

**Weekly volume, not daily guilt.**

```
Plan: 5 sessions / week
Done: 3
Remaining: 2
External: 「這週還有兩次。找一天補就好。」
```

### 4.4 Correction Engine

| Deviation | Internal response | External (再健) |
|-----------|-------------------|-----------------|
| +100 kcal | +steps suggestion, slight deficit tweak, spread 2–3 days | 最近吃得比較開心。今天正常就好。我幫你處理。 |
| +500 kcal | Distribute correction over 3 days; no starvation | 不用急著補。慢慢回來就好。 |
| +2000 kcal (cheat day) | Slow return over 7–14 days; protect TDEE; no forced cardio | 吃得很開心也很好。接下來幾天照常過就好。 |
| -200 kcal (underate) | Bank credit; no reward framing | （通常沉默，不讚美節食） |
| Protein -40g | Prioritize next protein opportunity | 睡前喝個豆漿就差不多了。 |
| Workout missed | Shift to weekly remaining count | 這週還有兩次。找一天補就好。 |

**Rules:**
- Never punish · never restart · never "start over"
- Never same-day starvation compensation
- Never expose math to user

### 4.5 Weekly Adaptation Loop

```
Daily:  correction messages + bank updates (silent)
Weekly: adjust pace, exercise template, protein emphasis (not full meal regen)
Monthly: reflection narrative + goal horizon check
```

**Not:** daily full plan regeneration feeling like a new exam.

---

## 5. External Experience — Page by Page Redesign

### 5.1 Today (Complete Rebuild of Meaning)

**Current violation:** CoachPlanSummary (kcal/deficit) → HomeDecisionHero (preset meals) → LifeEventPicker (buried)

**New flow:**

```
1. 再健 greeting (life-first, no numbers)
   「今天照常過。想吃什麼？」

2. LIFE CHECK (top, not bottom)
   Quick chips: 平常 / 加班 / 聚餐 / 出差 / 亂吃 / 生病 / 夜班
   → sets engine mode, changes 再健 tone only

3. PRIMARY INPUT — user agency
   ┌─────────────────────────────────────┐
   │  🔍 今天想吃什麼？                    │
   │  搜尋：餐廳、品項、便利商店、自己煮      │
   └─────────────────────────────────────┘
   Sources: free text · restaurant search · 7-11 menu · home ingredients · recent · favorites

4. AFTER user picks (or skips)
   Engine evaluates against banks (silent)
   再健 responds:
   - OK: 「好 choice。照這樣吃。」
   - High: 「吃得開心。接下來兩天我幫你調一下。」
   - Low protein: 「睡前加個豆漿就夠了。」
   Never: numbers unless user taps 「想看細節」

5. RESCUE (small, bottom)
   「不知道吃什麼？」→ 🎲 交給我
   Dice uses banks + prefs + location → suggests ONE combo
   User can accept, reject, or ignore. No penalty.

6. COLLAPSED (opt-in)
   「系統狀態」accordion → for curious users only
   Shows: 目標進度 %, 本週運動剩餘, 不是每日 kcal 表
```

**Remove from Today above-fold:**
- Preset meal A/B/C display as default
- `PLAN_FIRST_HINT` 「照這個吃」
- Per-item kcal on hero
- `formatSwapReason` target deltas
- Completion % as primary metric (demote to optional)

**Keep but demote:**
- Water (gentle, not scored)
- Workout (weekly framing, not daily must)

### 5.2 Weekly

**Current violation:** 「本週科學目標」+ kcal bullets + per-meal swap grid

**New meaning:** Week = rhythm check, not meal calendar

```
- 再健: 「這週過得怎樣？」（一句）
- 3 questions max: 體重感覺 / 睡得好嗎 / 有沒有特別累
- Engine summary (human): 「照這個節奏，來得及。」或「這週亂一點沒關係。」
- Exercise bank: 「還有 2 次」
- NO meal grid as default view
- Optional: 「看本週吃過什麼」history
```

### 5.3 Progress

**Current:** 「你有在變嗎？」+ weight chart (OK but reframed)

**New:**
```
- Lead: 「身體有在回應。只是不一定每天顯示。」
- Plateau story (keep Phase 3)
- Weight chart (secondary)
- Remove: guilt plateau lines from character DB
- NO daily grades
```

### 5.4 Onboarding (Rebuild Meaning)

**Current violation:** Step 1 = 「算熱量缺口」→ science preview grid

**New sequence:**

```
1. 目標感受 (not numbers)
   「你想變成什麼感覺？」輕一點 / 精神好一點 / 穿衣服好看 / 醫生叫我減

2. 生活現實
   作息：一般 / 輪班
   外食頻率、家庭、壓力（不是過濾器，是 engine context）

3. 身體 baseline (minimal)
   體重、體脂（可跳過體脂）

4. 再健承諾 (not plan preview)
   「你決定每天吃什麼。我負責讓你慢慢靠近目標。」
   NO kcal grid on this screen

5. 可選：「想看背後怎麼算？」→ 展開 preview（現有 science）

Engine: full NASA calc runs silently on submit
```

### 5.5 Settings / Premium

**Premium sells:**
- 持續校正引擎（banks never stop）
- 生活模式全開
- 進度敘事 + 自動重算

**Premium does NOT sell:**
- 「幫你想吃什麼」
- 更多餐點推薦
- 每日計畫

**Trial copy fix:**
- FROM: 「要繼續讓我幫你想吃什麼嗎？」
- TO: 「要繼續讓我幫你調嗎？你照常過就好。」

---

## 6. 再健 Role Redesign

| Was | Now |
|-----|-----|
| Nutritionist voice | Roommate voice |
| Commander | Translator |
| Teacher | Recovery guide |
| Mascot | Trusted companion |

**再健 speaks:**
- Correction, not instruction
- Permission, not command
- Recovery, not reset

**再健 never:**
- Quotes kcal/deficit unless asked
- Says 照著做 / 照表操課 / 你失敗了
- Guilt jokes (purge from characterMessages.ts)

**Canonical lines:**
- 「今天照常過。剩下交給我。」
- 「最近吃得比較開心。今天正常就好。」
- 「不用急著補。慢慢回來就好。」
- 「這週還有兩次。找一天補就好。」
- 「不知道吃什麼？」→ 🎲 交給我

---

## 7. Dice Repositioning

```
Position: rescue only
Entry: small text link, NOT hero button
Label: 「不知道吃什麼？」🎲 交給我
Behavior: one suggestion, same bank constraints
User: accept | swap | ignore
Never: daily roll limits with guilt tiers
Action: DELETE pickDiceLine guilt copy from active paths
```

---

## 8. Life Event System (OS-Level)

Life events don't just change copy — they change **correction aggressiveness:**

| Event | Engine | 再健 |
|-------|--------|------|
| cheat | Pause deficit chase 48h | 吃。開心。 |
| travel | Widen error bars, no regen | 方便就好。 |
| cny | 14-day reduced correction | 過年嘛。 |
| sick | Maintenance mode | 先休息。 |
| stress | No exercise pressure | 壓力大時別為難自己。 |
| night shift | Meal 1/2/3 + 睡前 labels | (keep Phase 3) |
| burnout | All banks freeze 3 days | 這週不用完美。 |

---

## 9. Current Codebase Violation Map

| File / Pattern | Violation | Phase 4 action |
|----------------|-----------|----------------|
| `CoachPlanSummary` above fold | Math-first | Collapse to opt-in 「系統狀態」 |
| `HomeDecisionHero` preset meals | AI controls food | Replace with search-first + optional dice |
| `PLAN_FIRST_HINT` | Command to follow plan | Delete |
| `formatSwapReason` kcal deltas | Exposes math | Replace with 「仍符合目標」only |
| Onboarding science preview | Math-first signup | Defer behind toggle |
| `TrialBanner` meal copy | Sells meal thinking | Sell correction engine |
| `WeeklyPlanView` meal grid | Plan-as-order | History view, not default |
| `BreathingProgress` % | Daily exam | Remove or hide |
| `characterMessages` guilt lines | Punishment | Purge active categories |
| `meal-trust-copy` 「不用自己想」 | Removes agency | 「你決定，我幫你兜」 |
| `pickDiceLine` guilt tiers | Dice as game | Delete from UI paths |
| `generate-plan` 7-day meals upfront | Pre-decides life | Generate trajectory + banks; meals on-demand |

---

## 10. New Modules (Implementation Phase — NOT NOW)

When approved, build in this order:

### P0 — Engine (invisible)
1. `src/lib/banks/calorie-bank.ts`
2. `src/lib/banks/protein-bank.ts`
3. `src/lib/banks/exercise-bank.ts`
4. `src/lib/engines/correction-engine.ts`
5. `src/lib/engines/recovery-engine.ts`
6. `src/lib/engines/weekly-adaptation.ts`

### P1 — External flow
7. `TodayEntry.tsx` — search-first
8. `LifeCheck.tsx` — top of today (move from bottom)
9. `DiceRescue.tsx` — small link
10. `CorrectionToast.tsx` — 再健 correction messages
11. `SystemStatus.tsx` — collapsed opt-in

### P2 — Migration
12. Deprecate `HomeDecisionHero` as default (keep swap engine behind dice)
13. Onboarding rewrite
14. Weekly page meaning rewrite
15. Character DB purge (guilt lines)
16. Premium copy rewrite

---

## 11. Data Model Additions (Future)

```typescript
interface UserBanks {
  calorie: {
    total_budget_kcal: number
    consumed_budget_kcal: number
    daily_pace_kcal: number
    running_balance: number
    last_correction_at: string
  }
  protein: {
    daily_target_g: number
    rolling_3d_avg_g: number
    gap_g: number
  }
  exercise: {
    weekly_target_sessions: number
    completed_sessions: number
    remaining_sessions: number
  }
}

interface FoodLog {
  id: string
  user_id: string
  logged_at: string
  source: 'search' | 'restaurant' | 'convenience' | 'home' | 'free_text' | 'dice'
  items: { name: string; estimated_kcal?: number; estimated_protein_g?: number }[]
  user_declared: true  // ALWAYS — user chose this
}
```

**Critical:** `user_declared: true` on every log. Engine never attributes food user didn't choose.

---

## 12. Premium Positioning (Rebuild)

| Old | New |
|-----|-----|
| 每週自動重算餐點 | 持續校正引擎 |
| 進度分析 | 身體有在回應的敘事 |
| 幫你想吃什麼 | 你活你的，我調數學 |

**Price anchor:** NT$500/mo = invisible nutritionist on call 24/7, not meal planner.

---

## 13. Notification Philosophy

| Send | Don't send |
|------|------------|
| 「今天照常過。」 | 「記得打卡！」 |
| Correction after user logged food | 「你還沒完成今日計畫」 |
| Weekly: 「這週還有兩次運動」 | Daily workout guilt |
| Plateau: 「先觀察」 | 「你沒瘦」 |

---

## 14. Migration Path (Phase 3 → Phase 4)

```
Week 1: Engine libs + banks (no UI change, shadow mode — compare internally)
Week 2: Today page meaning flip (search-first, demote hero)
Week 3: Copy purge + 再健 line replacement + onboarding
Week 4: Weekly/Progress meaning + premium copy + delete guilt DB lines
Week 5: Remove preset meal default path; dice = rescue only
Week 6: Market Reality Lab re-run — target: 40 stay / 25 subscribe @ 100 users (aspirational)
```

**Visual identity:** unchanged (colors, 再健 face, card style)  
**Bones:** replaced  
**Skin:** kept

---

## 15. Success Criteria (Phase 4 Complete)

- [ ] Today opens with 「想吃什麼？」not preset meals
- [ ] Zero kcal/deficit above fold by default
- [ ] User can eat anything; engine corrects silently
- [ ] +2000 kcal day produces recovery copy, not punishment
- [ ] Dice is small rescue link only
- [ ] No copy contains 照著做 / 照表操課 / 你失敗 / 補償
- [ ] Onboarding makes no numeric promise on screen 1
- [ ] Premium sells correction, not meals
- [ ] Market Reality Lab: quit reason #1 shifts from 「don't trust meals」to < 20% of quits
- [ ] Founder test: 「Who controls life?」→ User, on every screen

---

## 16. Final Verdict on Current Product

**Phase 1–3 built a good NASA engine with the wrong cockpit.**

The engine can stay. The cockpit must be rebuilt.

```
NASA inside.  ✅ (goal-calculator, workout-nutrition, plan-regen)
Friend outside. ❌ (still science-first, meal-first, plan-command)
```

**Phase 4 is not a feature sprint. It is a control inversion.**

---

## 17. One Page for the Team

```
使用者活。
BetterBit 調。

使用者決定吃什麼。
系統決定怎麼到目標。

不罰、不追、不考試。
校正、恢復、信任。

再健是室友，不是教練。
骰子是救援，不是主角。
數字是內部，不是介面。

今天照常過。
剩下交給我。
```
