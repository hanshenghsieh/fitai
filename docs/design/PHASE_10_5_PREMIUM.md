# Phase 10.5 — Premium (Shipped)

**Product model:** `2026-06-20-mr500-iter8-phase10-premium`  
**Route:** `/settings/premium`  
**Feeling:** *Joining a relationship* — not *unlocking software*.

---

## Design Council (Premium-only)

| Role | Verdict |
|------|---------|
| **Oura Membership** | Prose invitation, single text CTA, member thank-you state. |
| **Headspace / Calm** | Sell feelings: less stress, recovery, consistency — no feature bullets. |
| **Apple One / Prime** | Relationship framing; price as accompaniment, not SKU. |
| **Anti-paywall** | No countdown, scarcity, lock blur, comparison tables, big buttons. |
| **Trial end** | Whisper only near end; no day-count anxiety on main posture. |
| **Founder (last)** | Stripe returns to `/settings/premium`; Settings teaser is one row link. |

**Never used:** unlimited features, advanced analytics, AI premium, more charts.

---

## Shipped

| Piece | Role |
|-------|------|
| `premium-narrative.ts` | Posture, story paragraphs, gentle trial whisper |
| `PremiumScreen` | Full invitation page |
| `SettingsPremiumTeaser` | Single row in Settings → premium route |
| Stripe URLs | Success/cancel → `/settings/premium` |

**CTA:** text link「繼續一起走走」+「先回去 Today」— not full-width accent wall.

---

## Ship Check

| Gate | Result |
|------|--------|
| MR500 iter8 | ✅ Pass (see below) |
| No paywall tricks | ✅ |
| Today / Week / Progress untouched | ✅ |
| Settings shell unchanged (teaser swap only) | ✅ |
| Build | ✅ |

---

## MR500 iter8

| Metric | iter7 | iter8 |
|--------|-------|-------|
| D30 | 67.0% | **67.0%** |
| Subscribe | 3.4% | **3.0%** |
| Would recommend | 53.6% | **54.8%** |
| Major blockers | none | **none** |

---

## Next

**Phase 10 complete review** — see [PHASE_10_COMPLETE.md](./PHASE_10_COMPLETE.md)
