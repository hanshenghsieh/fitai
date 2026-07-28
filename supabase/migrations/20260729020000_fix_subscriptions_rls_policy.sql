-- Reconciles this migration history with the actual production RLS state on
-- public.subscriptions after a manual dashboard fix.
--
-- Investigation found that production had a policy, "preview subscriptions own
-- rows", that does not exist anywhere in this migration history (checked via
-- `grep -rn "preview subscriptions"` across the repo — zero matches). It was
-- applied directly against the database outside of any tracked migration, at
-- an unknown point, and was a FOR ALL policy keyed only on
-- `auth.uid() = user_id` — i.e. it re-opened INSERT/UPDATE/DELETE for any
-- authenticated user on their own row, the same self-grant-premium risk that
-- 20260729010000_subscriptions_lock_client_writes.sql fixed for the
-- originally-tracked policies.
--
-- This migration is written to be safe to run in sequence on a fresh database
-- (where "preview subscriptions own rows" was never created) as well as to
-- reconcile a drifted production database — every statement is idempotent
-- (IF EXISTS / re-runnable REVOKE).

-- Drop the untracked ALL policy discovered on production.
DROP POLICY IF EXISTS "preview subscriptions own rows" ON public.subscriptions;

-- Replace it with a SELECT-only policy under a new name, so it's unambiguous
-- going forward that this policy only ever grants reads.
DROP POLICY IF EXISTS "preview subscriptions read own rows" ON public.subscriptions;

CREATE POLICY "preview subscriptions read own rows"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Re-assert the lockdown from 20260729010000_subscriptions_lock_client_writes.sql.
-- Re-running this REVOKE is a no-op if already revoked; kept here so this file
-- is self-contained and matches the exact fix sequence applied to production.
REVOKE INSERT, UPDATE ON public.subscriptions FROM authenticated;

-- All server-side writes (Stripe webhook, RevenueCat webhook, Apple IAP sync,
-- cancel-subscription, delete-account) go through createAdminClient()
-- (service_role), which bypasses RLS and is unaffected by this migration.
