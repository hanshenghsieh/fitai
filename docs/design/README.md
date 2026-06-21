# Phase 10 — Premium Design Rebuild

## Design Council outputs

| Document | Purpose |
|----------|---------|
| [DESIGN_PHILOSOPHY.md](./DESIGN_PHILOSOPHY.md) | Debate, principles, anti-patterns, research synthesis |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Tokens, typography, components (spec only) |
| [IA_REBUILD.md](./IA_REBUILD.md) | Navigation, page charters, flows |

## North star

**NASA inside. Apple outside.**

## Rebuild order

1. **Today** — shipped (10.1)  
2. **Week** — shipped (10.2)  
3. **Progress** — shipped (10.3)  
4. **Settings** — shipped (10.4)  
5. **Premium** — shipped (10.5)  

Each page: implement → `npm run market-loop` UI pass → iterate until users say **舒服 / 高級 / 不想離開**.

**Phase 10 complete:** [PHASE_10_COMPLETE.md](./PHASE_10_COMPLETE.md)

### 10.1 Today (shipped)

- `TodayHeader` — title, quiet trial link, settings gear (not bottom nav)
- `TodayPosture` — Oura-style line + thin calorie bar
- Hero meal card — auto dice, **吃了** primary, **換一個** / **更多記錄**
- `TodayFoodMore` bottom sheet — frequent dropdown, search, photo
- Per-slot food log list below hero
- Bottom nav → 3 tabs: 今日 / 本週 / 進度
- Global trial banners removed from app layout

### 10.2 Week (shipped)

- Journal timeline — 7 days, today elevated, past/future tone
- `WeekDaySheet` — tap day for calm detail; Today CTA only on today
- `WeekReflection` — 2 taps (week feel → movement), no form stack
- Removed: stats grid, grocery preview, status badges, streaks
- See [PHASE_10_2_WEEK.md](./PHASE_10_2_WEEK.md)

### 10.3 Progress (shipped)

- Reassurance posture + minimal trend line (no axes, no goal reference)
- Low-friction weight log; body fat optional/hidden
- Single fat-bank bar (not stat grid); calm plateau note
- Gentle history list; earned preview paywall (no blur lock)
- See [PHASE_10_3_PROGRESS.md](./PHASE_10_3_PROGRESS.md)

### 10.4 Settings (shipped)

- Linear sparse sections: Account, Membership, Health, Notifications, Privacy, Support, About
- Apple Health premium connected copy; human notifications (not toggle wall)
- Subscription as care; NASA inside / friend outside in About
- See [PHASE_10_4_SETTINGS.md](./PHASE_10_4_SETTINGS.md)

### 10.5 Premium (shipped)

- `/settings/premium` invitation page — feelings not features
- Text CTA「繼續一起走走」; gentle trial whisper; no countdown anxiety
- `SettingsPremiumTeaser` row links from Settings
- See [PHASE_10_5_PREMIUM.md](./PHASE_10_5_PREMIUM.md)

## Success vs failure

| Success | Failure |
|---------|---------|
| 舒服 | 功能好多 |
| 高級 | 很複雜 |
| 不想離開 | 像學生作品 |

## Council roster

Apple HIG · Oura · Headspace · Calm · Noom PM · Arc · Linear · Airbnb · MUJI · Luxury Brand · Busy Office Woman · Low-discipline User · **Founder (last)**
