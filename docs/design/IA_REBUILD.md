# BetterBit IA Rebuild (Phase 10)

**Status:** Information architecture spec — **no routes or pages coded yet**  
**North star:** Time as the primary axis. **Now → This week → Trend.** Settings as utility, not a destination.

---

## Council debate on navigation

### Arc Designer

Bottom nav with Dashboard / Weekly / Progress / Settings treats **time slices as peers**. User lives in *now*; week and trend are pull-through, not siblings.

**Proposal:** Primary shell = **Today**. Week and Progress are **horizontal peers** one level down. Settings escapes the tab bar.

### Apple HIG Designer

Four tabs = four apps stitched together. Merge **food + workout + dice** into Today. Week is planning; Progress is reflection—never input-heavy.

### Busy Office Woman

I need **Today** and nothing else 90% of days. Week is Sunday. Progress is when I'm curious. Don't make me hunt Settings for subscription.

### Noom PM

Weekly reflection missing from IA. Add **lightweight weekly close** on Week—not a new tab, a moment inside Week.

### Founder (last)

We keep **three destinations** in the tab bar: Today · Week · Progress. Settings via profile/gear. Premium is a **mode inside Settings**, not a tab. Onboarding stays gate before Today.

---

## Current vs proposed map

### Current (simplified)

```
/ (landing)
/login, /register
/onboarding
/dashboard     → TodayOS + workout + summary (heavy)
/weekly        → week plan
/progress      → charts + paywall
/settings      → profile, sub, health sync, schedule
```

**Problems identified:**

- Dashboard is a **feature dump** (summary + food + workout + dice)
- Week and Today both talk about meals—unclear division
- Progress paywalled without earned preview narrative
- Settings is graveyard of toggles
- Premium scattered (trial banners on every page)

### Proposed (Phase 10)

```
/ (landing — premium marketing, calm)
/auth/*
/onboarding (3 steps — unchanged flow, premium visual later)

/app shell
├── Today      ← default, 90% of sessions
├── Week       ← plan + weekly reflection
├── Progress   ← trend story + measurements
└── Settings   ← gear only (not tab)
    └── Premium (membership sub-route or section)
```

---

## Page charters (what each page owns)

### Today

**Question:** *What should I do right now—especially about food?*

| Owns | Does not own |
|------|----------------|
| Posture strip (Oura-style day state) | Full week grid |
| Hero meal decision (dice or smart default) | Macro education |
| One-tap log for **current meal** | All meals log dump |
| Workout **today** block (collapsed default) | Program editor |
| Quiet link to Week if plan diverges | Settings toggles |

**Primary action:** Confirm meal or one-tap log.  
**Secondary:** 「更多」→ search, photo, frequent picker.  
**Tertiary:** Dice reroll.

**MR500 success:** Office woman completes lunch log in <15s.

---

### Week

**Question:** *What does this week look like—and how did last week go?*

| Owns | Does not own |
|------|----------------|
| 7-day timeline (meals + workouts as cards) | Today's hero dice |
| Weekly reflection prompt (Noom-lite, no lessons) | Adherence engine debug |
| Adjust plan CTA (regen) | Daily food entry |
| Completion posture (soft %) | Gamified streaks |

**Layout concept:** Vertical timeline Mon–Sun, today highlighted. Tap day → sheet with detail, not new page.

**Primary action:** View today within week context.  
**Secondary:** Submit weekly reflection (3 taps max).

---

### Progress

**Question:** *Am I moving in the right direction without obsessing?*

| Owns | Does not own |
|------|----------------|
| Fat bank narrative (one progress bar) | Daily food log |
| Weight trend (simple line) | Meal recommendations |
| Plateau story (when relevant) | Workout detail |
| Measurement entry | Paywall blur without preview |

**Primary action:** Log weight (quick).  
**Secondary:** Subscribe for extended history (after showing trial value).

**Paywall IA:** Trial users see **earned** trend preview; depth (fat bank detail, 8-week) behind membership.

---

### Settings

**Question:** *Who am I here, and how does this app fit my life?*

| Owns | Does not own |
|------|----------------|
| Body metrics update | Today hero |
| Work schedule / family meal / eating context | Week plan |
| Health sync opt-in | Progress charts |
| Subscription management | Food search |
| Logout, disclaimer | Onboarding re-run |

**Layout:** Linear-style list groups. Sparse. No cards-in-cards.

---

### Premium (within Settings)

**Question:** *Is continuing worth NT$500?*

| Owns | Does not own |
|------|----------------|
| Value comparison (vs 手搖 / ChatGPT / MFP) | Feature bullet laundry list |
| Membership framing | Trial countdown anxiety |
| Billing portal link | Dashboard banners |

**Not a separate product—an invitation screen.**

---

## Global elements (cross-page)

### Removed from global stack

- Trial banner on every page → **single indicator** (Today top or Settings only)
- Trial progress card duplicate → merge into posture or Settings
- Multiple ZaiJian instances

### Kept global

- Bottom nav (3 items)
- Settings gear (top-right Today, or bottom sheet entry)
- Toast notifications (sparse)

---

## User flows (rebuilt)

### Flow A — Lunch second path (office woman)

1. Open app → Today  
2. See: posture + 「午餐：XX 便當」hero  
3. Tap 「吃了」→ logged → dismiss  
4. Optional: expand workout if afternoon

**Steps:** 2 taps. No slot picker. No tab picker.

### Flow B — First day (onboarding complete)

1. Land Today with `welcome` posture  
2. Hero shows first meal suggestion (dice pre-resolved)  
3. Hint once: 「點一下就好」  
4. Never show 3-tab food UI on first frame

### Flow C — Trial day 14

1. Today shows same calm UI  
2. Posture: 「這兩週少煩了 N 次」  
3. Progress tab shows earned trend  
4. Premium invite in Progress or Settings—not blocking Today

### Flow D — Night shift nurse

1. Today uses shift meal labels (第一餐/第二餐) in hero only  
2. Settings owns schedule toggle  
3. Week timeline uses relative meal times, not 早餐/午餐

### Flow E — Low discipline return after 5 days

1. Today: 「好久不見。今天一餐就好。」  
2. Hero suggestion, no backlog guilt  
3. No red missed-day UI

---

## Content hierarchy template (every page)

```
1. Page title (whisper meta optional)
2. State / posture (one line)
3. Hero content (one card)
4. Primary action
5. Secondary content (collapsed default)
6. Tertiary links
```

**Nothing between 2 and 3 except whitespace.**

---

## URL map (target — implement later)

| Route | Page | Nav |
|-------|------|-----|
| `/dashboard` | Today | Tab 1 |
| `/weekly` | Week | Tab 2 |
| `/progress` | Progress | Tab 3 |
| `/settings` | Settings | Gear |
| `/settings/premium` | Premium | From Settings |

**Optional alias:** `/today` → `/dashboard` for clarity (redirect later).

---

## Object model on screen (data IA)

### Today view model

```text
TodayScreen
├── posture: { label, tone, optionalProgress }
├── heroMeal: { title, items[], trust, actions }
├── currentMealLog: FoodEntry[]  // filtered by inferred meal
├── workoutToday: { summary, expandable detail }
└── moreFoodEntry: { search, photo, frequent }  // sheet
```

### Week view model

```text
WeekScreen
├── weekPosture: string
├── days: DayCard[7]
├── reflection: { prompt, optionalInput }
└── regenAction
```

### Progress view model

```text
ProgressScreen
├── storyHeader: string
├── fatBank: { summary, detail? }
├── weightChart: { points, previewMode? }
├── plateauCard?: string
├── measureCTA
└── upgradeGate?: { preview earned }
```

---

## What we deliberately cut from IA

| Cut | Reason |
|-----|--------|
| Food entry tabs on home | Council: one path + more |
| Equal 4-tab nav | Settings demoted |
| 「今日」summary duplicating hero | One state line enough |
| Event/mode pages | Adherence stays invisible |
| Separate dice page | Dice is hero variant |

---

## Rebuild sequence & gates

| Phase | Page | IA gate | MR500 UI gate |
|-------|------|---------|----------------|
| 10.1 | Today | Lunch 2-tap path | 舒服 ≥ 60% |
| 10.2 | Week | Reflection exists | 不複雜 |
| 10.3 | Progress | Preview before pay | 高級 ≥ 45% |
| 10.4 | Settings | Linear sparse | — |
| 10.5 | Premium | Membership feel | 不想離開 ↑ |

**No page ships until previous page passes council checklist.**

---

## Council sign-off criteria (IA)

- [ ] User can describe app in one sentence: 「幫我决定今天吃什麼」
- [ ] Each tab answers one question only
- [ ] Settings not required for daily use
- [ ] Premium not interrupting lunch flow
- [ ] Week vs Today boundary clear in user testing
- [ ] Founder: engine depth available but never required

---

## Founder closes IA

We shrink the **surface**, not the **soul**. Today is the product. Week is the calendar. Progress is the mirror. Settings is the back office. Premium is the membership card.

When we code, we **delete** before we add. Every element must earn its place in the lunch-second path.

---

*Artifacts complete for Phase 10 pre-code. Next step: council review → implement Today only.*
