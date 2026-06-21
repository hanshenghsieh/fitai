# BetterBit Design Philosophy

**Phase 10 — Premium Design Rebuild**  
**Status:** Council consensus (pre-code)  
**North star:** *NASA inside. Apple outside.*

---

## What we are building

BetterBit is not a calorie spreadsheet. It is a **quiet operating system for imperfect humans** who eat out, work too much, and will not open a tracking app every hour.

The product already has depth: adherence engine, meal combos, life-event inference, plateau logic, Taiwan food KB. **Users should never feel that weight on first open.** They should feel: *someone competent already thought about today.*

---

## Design Council — debate record

Each role must disagree before we converge. No false consensus.

### Apple HIG Designer

**Attack:** Current UI reads like an engineer dashboard. Too many equal-weight regions—meal slots, three entry tabs, dice, logs, workout accordion—all shouting at once. Trial banners stack. Information density violates hierarchy.

**Demand:** One primary action per screen. Secondary tools behind progressive disclosure. System chrome should be invisible; content is the interface.

**Verdict:** Rebuild hierarchy before polish. *Fail* on current home.

---

### Oura Designer

**Attack:** BetterBit shows *inputs* (log food, pick slot) before *state* (how am I doing, what matters today). Oura leads with Readiness—one score, one sentence, then detail.

**Demand:** Lead with **today's posture**: "on track / gentle day / recovery"—not calorie math. Numbers live one tap deeper. Rings or single progress metaphor max one per screen.

**Verdict:** *Partial pass* on engine; *fail* on emotional landing.

---

### Headspace Designer

**Attack:** Copy tries to be warm but layout is anxious—tight grids, many chips, dashed photo boxes. Warmth needs **breathing room**: 24px+ vertical rhythm, fewer borders, softer section breaks.

**Demand:** One ZaiJian moment per screen, not a wallpaper of widgets. Animations: 200–350ms ease, no bounce. Empty states feel like invitation, not homework.

**Verdict:** *Fail* on spatial calm.

---

### Calm Designer

**Attack:** Subscription and trial messaging feel like pressure, not sanctuary. "訂閱" links in headers compete with care.

**Demand:** Paywall as **continuation of care**—show what they already built, then invite. Night palette option later; default stays paper-warm, not clinical white.

**Verdict:** *Partial* on tone; *fail* on monetization anxiety.

---

### Airbnb Designer

**Attack:** Trust is fragmented—meal trust on dice, medical disclaimer in settings, no single "why believe this" layer. Cards don't feel **crafted**; they feel generated.

**Demand:** Every recommendation card: name, source, confidence, one human line. Photography of real food optional later; typography and spacing must earn trust first.

**Verdict:** *Fail* on recommendation presentation.

---

### Noom PM

**Attack:** You have behavior loops but no **visible lesson arc**. Users quit at D14 because they never learned what success looks like without weight loss.

**Demand:** Weekly reflection (non-gamified), streak-free. Not orange confetti—one question: "這週少煩了幾次？" Education through copy, not courses.

**Verdict:** *Partial* on adherence; *fail* on structured reflection UI.

---

### Linear Designer

**Attack:** Visual language lacks **precision**. Mixed font weights, inconsistent 12/13/14px soup, borders on everything. Premium tools feel tight and exact.

**Demand:** 4px grid, 2 font sizes per screen (+ mono for numbers optional), one accent. Settings should feel like Linear settings—sparse, confident.

**Verdict:** *Fail* on craft.

---

### Arc Designer

**Attack:** Navigation is flat bottom nav to four similar-weight destinations. No **spatial model**—where am I in the week vs today?

**Demand:** Consider time as axis: Today (now) ← → Week (plan) ← → Progress (trend). Settings is utility drawer, not a peer tab.

**Verdict:** *Fail* on wayfinding.

---

### MUJI / Japanese Minimalism Expert

**Attack:** Too many labels—「第1餐」「常吃」「搜尋」「拍照」. MUJI removes until only the essential remains. Starter frequent foods, dice, and search overlap.

**Demand:** One input path default; others in 「更多」. No decorative borders; use whitespace and alignment. Character (再健) should be small accent, not mascot billboard.

**Verdict:** *Fail* on reduction.

---

### Luxury Brand Designer

**Attack:** NT$500/month must feel like **concierge**, not SaaS. Current UI says "startup fitness app." High-income users want neutral, quiet luxury—think Aesop, not Duolingo.

**Demand:** Restrained palette, generous margins, no uppercase tracking labels everywhere. Subscription page like a membership card, not a pricing table.

**Verdict:** *Fail* on premium signal.

---

### Busy Office Woman (台北上班族)

**Attack:** I open at lunch. I need **one tap** to know what to eat—not choose meal slot, then tab, then scroll. Morning I won't open at all.

**Demand:** Open → see lunch suggestion → tap ate it → close. 15 seconds. Everything else is for Sunday night.

**Verdict:** *Fail* on lunch-second path.

---

### Low-discipline User

**Attack:** Still feels like homework. Slots, tabs, logs—even "常吃" dropdown is a form. I want the app to **remember** and ask rarely.

**Demand:** Default meal from time + history. Confirm with one button. Shame-free when I don't open for 3 days.

**Verdict:** *Fail* on default intelligence surfacing.

---

## Where they agreed (rare consensus)

| Principle | Council line |
|-----------|----------------|
| One hero per screen | Today = one decision; not six |
| State before input | Show posture, then invite log |
| Progressive disclosure | Power features exist; don't parade them |
| Trust in the card | Source, confidence, human line |
| Calm monetization | Value visible before pay |
| Time as IA axis | Now / This week / Trend |
| Precision craft | Grid, typography, fewer borders |
| Premium = quiet | No gamification, no chart porn |

---

## Founder speaks last

We built NASA because Taiwan eat-out reality is messy—KB, combos, adherence, night shift. **That was right.** We were wrong to show all of it on Day 1.

**We will not dumb down the engine.** We will **hide the launchpad complexity**.

- Outside: Apple calm—one question, one answer, one gentle line from 再健.
- Inside: Full engine when user pulls the thread (week plan, progress, settings).

We are not Noom (lessons). We are not MFP (database). We are not Oura (hardware). We are **the colleague who already ordered for the table**—competent, not chatty.

Success sounds like: 「舒服」「高級」「不想離開」  
Failure sounds like: 「功能好多」「很複雜」「像學生作品」

**MR500 UI loop** after each page rebuild: synthetic users must rise on *comfort* and *premium feel*, not feature count.

---

## Core philosophy (locked)

### 1. Quiet competence

The app should feel like it already ran the numbers. User sees outcome and optional depth—not the machinery.

### 2. One breath per screen

At most one primary visual focus and one primary action. Secondary actions share a single "更多" or chevron—not three equal tabs.

### 3. Imperfect human default

Design for missed days, hot pot, and "I don't know what I ate." Never punish. Never red alert for normal life.

### 4. Taiwan-specific dignity

Not generic "wellness." Respect bento lines, night shift, family table, 7-11 reality—without looking like a convenience store ad.

### 5. Premium without performance

Luxury is **restraint**: fewer colors, fewer words, more space. NT$500 feels fair when the app feels like time saved, not data entry.

### 6. NASA inside, Apple outside

| Outside (user sees) | Inside (system does) |
|---------------------|----------------------|
| One meal suggestion | Combo engine, KB, geo |
| "這週還好" posture | Adherence, banks, plateau |
| Simple trend line | Fat bank, goal snapshot |
| Quiet trial reminder | Subscription logic, access |

---

## Anti-patterns (banned in Phase 10)

- Three equal tabs for food entry on home
- Stacked trial banners + progress cards + hints
- Badge/streak/gamification
- Dense chip walls (常吃, allergens, slots)
- Engineer labels (`kcal`, `蛋白`, `缺口`) above the fold
- Paywall blur without showing earned value
- Mascot larger than the user's decision
- "功能好多" wayfinding—every nav item equally loud

---

## Research synthesis (what we steal)

| Product | Steal | Reject |
|---------|-------|--------|
| **Oura** | Readiness posture, one score narrative | Ring obsession, hardware dependency |
| **Apple Health** | Summary cards, drill-down | Medical clutter, tab sprawl |
| **Apple Fitness** | Single activity metaphor | Competition, badges |
| **Headspace** | Breath, space, soft motion | Content library UI |
| **Calm** | Sanctuary tone | Sleep story catalog |
| **Noom** | Behavioral framing, weekly reflection | Candy colors, lesson guilt |
| **Arc** | Spatial time model | Browser chrome |
| **Linear** | Typographic precision, settings density | Dark-only, dev aesthetic |
| **Airbnb** | Trust cards, clear hierarchy | Photo-first (food photos later) |
| **MUJI** | Reduction, no decoration | Sterile emptiness |

---

## Emotional target

| Moment | User should feel |
|--------|------------------|
| Open app | "Oh, it already knows." |
| Log food | "That was fast." |
| Bad day | "It's fine." |
| D14 trial | "I already got value." |
| Pay | "Worth keeping the quiet." |

---

## Page rebuild order (after docs lock)

1. **Today** — hero decision, hidden depth  
2. **Week** — plan as timeline, not spreadsheet  
3. **Progress** — trend story, not exam  
4. **Settings** — Linear sparse utility  
5. **Premium** — membership, not checkout  

Each page: ship → `npm run market-loop` UI pass → council re-review → iterate until comfort/premium thresholds.

---

*Next artifacts: `DESIGN_SYSTEM.md`, `IA_REBUILD.md`*
