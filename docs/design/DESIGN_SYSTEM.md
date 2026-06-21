# BetterBit Design System (Phase 10)

**Status:** Specification only — **no CSS / components until council lock**  
**Companion:** `DESIGN_PHILOSOPHY.md`, `IA_REBUILD.md`

---

## Design intent

A **paper-warm, precision-typed** system. Feels like Apple Notes + Oura calm + MUJI reduction—not gym bro, not clinical hospital, not startup gradient.

**Tagline for builders:** *48px margins where others use 16. One accent. No border unless necessary.*

---

## Council constraints on the system

| Role | System rule they imposed |
|------|--------------------------|
| Apple HIG | Max 3 elevation levels; one primary button style |
| Oura | One "state color" per screen (on-track / gentle / rest) |
| Headspace | Min 8px between related, 24px between sections |
| Linear | 4px grid; numeric tabular figures for kcal |
| MUJI | No border + background on same element unless required |
| Luxury | No more than 2 weights per screen (regular + semibold) |
| Office woman | Touch targets ≥ 44px; primary CTA full-width on mobile |

---

## Color

### Philosophy

Warm canvas, not pure white. Accent used **sparingly**—only primary CTA and active nav. Status never screams red; use muted amber for "gentle day."

### Palette (conceptual tokens)

| Token | Role | Direction |
|-------|------|-----------|
| `canvas` | App background | Warm off-white `#F7F3EC` (keep lineage) |
| `surface` | Cards | Slightly elevated warm white `#FFFDF9` |
| `muted` | Secondary surfaces | `#EFE9E0` |
| `text-primary` | Headlines | Near-black warm `#1C1917` |
| `text-secondary` | Body | `#57534E` |
| `text-tertiary` | Meta | `#A8A29E` |
| `accent` | Primary action only | Single terracotta/coral action—existing brand anchor |
| `accent-soft` | Selected states | 8–12% accent tint |
| `border` | Dividers | `#E7E5E4` at 1px max |
| `state-calm` | On track | Sage muted (not green badge) |
| `state-gentle` | Recovery / cheat | Warm amber whisper |
| `state-rest` | Rest day | Cool gray-lavender whisper |

### Rules

- No gradients on UI chrome (illustration only).
- No second accent color on same screen.
- Dark mode: Phase 10+1; spec as **elevated charcoal + warm paper text**, not OLED black.

---

## Typography

### Families

| Use | Direction |
|-----|-----------|
| UI | System stack or single web font: **SF Pro / Inter / Noto Sans TC** — one family for Latin + CJK |
| Numbers | Tabular lining figures for kcal, weight, macros |
| ZaiJian | Character art—never replace with emoji |

### Scale (mobile-first)

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `display` | 22px | Medium | Page title (one per screen) |
| `title` | 17px | Semibold | Card title |
| `body` | 15px | Regular | Primary reading |
| `caption` | 13px | Regular | Secondary |
| `meta` | 11px | Medium | Labels—**use sparingly** |
| `number-lg` | 20px | Medium tabular | Hero stat |
| `number-sm` | 13px | Medium tabular | Inline kcal |

### Rules

- No `uppercase + tracking` except Settings section headers (Linear style).
- Max 2 sizes in a single card.
- Line height: 1.45 body, 1.25 titles.
- **Banned:** 10px soup, 4 sizes in one card.

---

## Spacing & layout

### Grid

- Base unit: **4px**
- Screen horizontal padding: **20px** (not 16)
- Card padding: **20px** internal
- Section gap: **24px**
- Card gap: **12px**

### Radius

| Token | Value | Use |
|-------|-------|-----|
| `sm` | 12px | Chips, small buttons |
| `md` | 16px | Cards |
| `lg` | 20px | Hero cards |
| `full` | 9999px | Pills (meal slot—use sparingly) |

### Elevation

| Level | Treatment |
|-------|-----------|
| 0 | Flat on canvas |
| 1 | Card: surface + 1px border OR subtle shadow (pick one globally) |
| 2 | Modal / sheet |

**Council:** Prefer borderless cards on muted canvas blocks (Oura/Headspace), not bordered boxes everywhere.

---

## Components (spec only — do not build yet)

### Hero decision card (Today)

- One meal or one line of guidance
- Subtext: one sentence max
- Primary: `就這個` / `記好了`
- Secondary: text link `換一個` — not a second button row

### Posture strip (Oura-inspired)

- Single line: e.g. 「今天節奏 OK」
- Optional thin progress (not three rings)
- Tap → Progress (not inline chart)

### Food log (per meal)

- List only for **active meal**—never global dump
- Row: name + kcal secondary; swipe or icon delete
- No meal badge column when context is already the meal

### Frequent food

- **One** select + one CTA—not chip wall
- Optional: smart default pre-selected

### Dice / suggestion

- Trust row: store · confidence · why this
- Actions: primary confirm, ghost reroll

### Workout block

- Collapsed: type · duration · burn · progress bar
- Expanded: warmup / main / cooldown sections
- Per exercise: sets × reps · rest · note · video link

### Trial / premium

- No banner stack
- Single quiet strip OR inline on Settings/Premium only
- Copy: continuation not urgency

### ZaiJian

- Sizes: `whisper` (inline), `bubble` (onboarding), never `lg` on home
- Max one appearance per screen
- Expression: calm > cute

### Navigation

- Bottom: **3 items** max for Phase 10 (Today · Week · Progress)
- Settings: avatar or top-right gear—not 4th tab equal weight

### Buttons

| Type | Treatment |
|------|-----------|
| Primary | Full-width, accent, 48px height, 15px semibold |
| Secondary | Muted fill, no border |
| Ghost | Text only accent |
| Destructive | Rare; text style |

### Inputs

- Search: single field, no dashed upload box on same row
- Photo: secondary path under 「更多」

---

## Motion

| Pattern | Duration | Easing |
|---------|----------|--------|
| Panel expand | 280ms | ease-out |
| Page transition | 320ms | ease-in-out |
| Button press | 120ms | scale 0.98 |
| ZaiJian appear | 400ms | fade + 4px rise |

**Banned:** Bounce, confetti, streak flames, number tickers.

---

## Iconography

- Lucide line icons, 20px default, 1.5px stroke
- Icons always paired with label on primary nav—not icon-only except Settings gear
- No emoji in UI chrome

---

## Voice & copy (system-level)

| Context | Tone |
|---------|------|
| Hero | Short, declarative |
| Correction | Never shame; 「沒關係」not 「超標」 |
| Empty | Invitation: 「還沒記—點一下就好」 |
| Error | Human, one fix path |
| Paywall | Gratitude first: 「這段時間你…」 |

**Banned words on hero:** 赤字, 超標, 失敗, 打卡, 任務

---

## Accessibility

- Text secondary still ≥ 4.5:1 on canvas (check warm grays)
- Touch 44×44 minimum
- Motion: respect `prefers-reduced-motion`
- CJK: avoid truncation on meal names—wrap 2 lines max

---

## Premium signals checklist

Before shipping any page:

- [ ] Only one accent blob visible
- [ ] ≥ 24px between major sections
- [ ] Primary action obvious in 2 seconds
- [ ] No more than 2 font weights on screen
- [ ] Numbers align in columns
- [ ] Trial/subscription not competing with hero
- [ ] ZaiJian ≤ 1, not dominating
- [ ] Would a NT$800/month member feel this is for them?

---

## Migration from current system

| Current | Phase 10 direction |
|---------|-------------------|
| 3 food tabs equal | One default path + 「更多」 |
| 5 meal slot pills | 3 meals + optional 「+」 |
| Stacked trial cards | Single quiet indicator |
| `cardStyle` border everywhere | Muted blocks, fewer borders |
| 11px labels everywhere | Meta only where needed |
| Bottom nav 4–5 items | 3 + settings entry |

**Do not delete `design-system.ts` until new tokens are implemented page-by-page.**

---

## MR500 UI metrics (post-implementation)

After each page rebuild, synthetic council scores:

| Metric | Target |
|--------|--------|
| "舒服" | ≥ 60% would say |
| "高級" | ≥ 45% high-income personas |
| "不想離開" | D7 open intent ↑ |
| "功能好多" | < 15% |
| "很複雜" | < 20% |
| "像學生作品" | < 10% |

---

*Implementation order: Today → Week → Progress → Settings → Premium*
