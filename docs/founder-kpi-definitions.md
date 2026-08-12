# Founder KPI Definitions

Phase 2 code-adjacent reference — what each number on the Founder Dashboard
actually means and where it comes from. If a definition here and the code
ever disagree, the code is what's actually running; update this doc to match
rather than trust it blindly.

## Timezone

All daily aggregation (Today, Last 7 Days, funnel counts, retention cohorts)
buckets by **plain Asia/Taipei calendar day** — `getTaipeiDateKey()` in
`src/lib/timezone.ts`, exposed to the dashboard as `dashboardDayKey()` in
`src/lib/founder-dashboard/day-key.ts`.

This is deliberately **not** the same as the in-app food-logging "nutrition
day" (`getNutritionDayKey()`), which rolls over at 05:00 Taipei so a
very-late-night snack still counts toward "today" on the Today screen. That
rollover is correct product behavior for calorie-bank UX, but it would merge
e.g. 23:30 and the following 00:30 into the same bucket — the wrong call for
a Founder-facing "which calendar day was this user active" view. This is a
deliberate, documented divergence between two existing definitions, not an
oversight — see the code comment in `day-key.ts` for the same note.

Event timestamps themselves (`occurred_at`) are stored in UTC; the Taipei day
bucket (`taipei_date`) is computed once at write time and stored alongside,
so daily aggregation never depends on the reading connection's timezone
setting.

## North Star: Weekly Active Food Loggers

Unique users with at least one successful `meal_log_succeeded` event in the
past 7 nutrition days (dashboard day-key, see above).

This is intentionally **not** "app opened" — opening the app proves nothing
about whether BetterBit is actually being used for its core job (logging
food). "App Open Retention" is tracked as a secondary metric alongside it
(`app_opened` event), never as the primary number.

## Activation: First Meal Activation Rate

```
first_meal_logged / account_created
```

`first_meal_logged` fires at most once per user, enforced at the data layer
by a unique partial index (`idx_analytics_events_first_meal_once` in
`20260812000000_analytics_events.sql`), not just client-side discipline — a
reinstall or duplicate render cannot inflate this number.

## D1 / D7 Retention

first-meal cohort definition: a user's Day0 is the Taipei day their
`first_meal_logged` event happened. D1/D7 retention is the percentage of
that cohort who also have a `meal_log_succeeded` event on Day0+1 / Day0+7.

Cohorts smaller than `MIN_RETENTION_COHORT_SIZE` (currently **5**, see
`src/lib/founder-dashboard/retention.ts`) show "Insufficient data" instead of
a percentage — a 1-user cohort hitting its D7 target is not "100% retention"
in any meaningful sense, and the dashboard must never present it that way.

D3/D14/D30 are computed the same way (`calculateRetentionCurve` accepts any
list of offsets) — the dashboard's first version surfaces D1/D3/D7; D14/D30
are one line of code away once there's enough signup history for them to be
meaningful (a product with < 30 days of data cannot have a real D30 cohort
yet, so surfacing it early would just be more "Insufficient data" noise).

Signup-cohort retention (grouping by `account_created` day instead of
`first_meal_logged` day) is not implemented in v1, per the explicit
instruction to prioritize first-meal cohort first, since it excludes users
who downloaded but never activated at all.

## Photo Success Rate

```
meal_log_succeeded (source=photo) / (meal_log_succeeded + meal_log_failed, source=photo)
```

`meal_log_started` (source=photo) is tracked separately as "attempts" and
shown alongside, but is not the denominator here — a user can abandon a
capture before it resolves either way, which isn't a pipeline failure.

Failure classification (`src/lib/observability/photo-outcome.ts`,
`classifyPipelineFailure`) is pattern-matched against the error name/message,
since this codebase has no typed error hierarchy for the AI/matching
pipeline yet. Good enough to answer "what's the most common failure type,"
not perfectly precise — a known limitation, not a silent one.

## Trial Conversion

```
trial_started / eligible activated users
```

"Activated users" = users with a `first_meal_logged` event (the Activation
definition above) within the funnel's lookback window.

## Paid Conversion

Both kept, per the explicit instruction that they answer different
questions:

```
subscription_started / activated users        (overall paid conversion)
subscription_started / trial_started           (trial -> paid conversion)
```

## Subscription data caveats (Phase 2 TASK 5)

- `billing_period` ('monthly' | 'annual' | 'unknown') and `product_id` are
  now persisted for every new Stripe and Apple IAP subscription event (see
  `20260812010000_subscriptions_product_identity.sql`). Rows written before
  this migration are backfilled to `'unknown'` — **not guessed** from price
  or any other heuristic, per explicit instruction.
- MRR is estimated from the canonical pricing copy
  (`src/lib/subscription-pricing.ts`: NT$190/mo, NT$990/yr ≈ NT$82.5/mo) —
  it is an estimate, not a Stripe-reconciled revenue number, and does not
  account for discounts, refunds, or historic `unknown`-billing-period rows.
- `environment` ('production' | 'sandbox' | 'unknown') comes from Stripe's
  `livemode` flag and RevenueCat's per-subscription `is_sandbox` flag where
  present; historic rows are `'unknown'`.
