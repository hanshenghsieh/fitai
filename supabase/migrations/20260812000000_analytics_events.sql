-- Phase 2 TASK 2 — canonical product analytics event store.
--
-- Server-only table: all writes go through POST /api/analytics/track (or a
-- direct server-side track() call from webhooks/API routes), all reads go
-- through the admin-only Founder Dashboard routes. No direct client access,
-- matching the subscriptions table lockdown pattern
-- (20260729010000_subscriptions_lock_client_writes.sql) — RLS is enabled
-- with no policies, and INSERT/UPDATE/DELETE/SELECT are revoked from
-- authenticated/anon, so only the service-role admin client can touch this
-- table at all.
--
-- taipei_date is precomputed at write time (Asia/Taipei calendar day, see
-- src/lib/analytics/track-server.ts and src/lib/timezone.ts's
-- getTaipeiDateKey) rather than computed on read, so daily aggregation never
-- depends on the reading connection's timezone setting and stays correct
-- even if Postgres session timezone changes.

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  platform TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  taipei_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_date
  ON analytics_events(event_name, taipei_date);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_name
  ON analytics_events(user_id, event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred_at
  ON analytics_events(occurred_at);

-- Enforces "first_meal_logged fires at most once per user" at the data
-- layer, not just by application discipline — see track-server.ts's
-- recordFirstMealLoggedOnce, which relies on this constraint to make a
-- check-then-insert race safe (the loser of the race gets a unique
-- violation, which is swallowed, leaving exactly one row).
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_events_first_meal_once
  ON analytics_events(user_id)
  WHERE event_name = 'first_meal_logged';

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON analytics_events FROM authenticated, anon;
