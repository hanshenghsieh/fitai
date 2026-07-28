-- Security fix: subscriptions must only be writable by the server (service role).
--
-- Prior policies let any authenticated user INSERT/UPDATE their own row directly
-- via the public anon-key client (RLS only checked auth.uid() = user_id, with no
-- restriction on which columns could be set) — see:
--   supabase-migrations/002-add-subscriptions-and-notifications.sql
--     ("Users can insert their own subscriptions", GRANT ... INSERT, UPDATE ...)
--   supabase/migrations/20250709140000_subscriptions_update_rls.sql
--     ("Users can update their own subscriptions")
-- This meant a signed-in user could set their own `status`/`subscription_source`
-- to grant themselves premium access with no payment provider involved at all.
--
-- All legitimate writers already use the service-role admin client
-- (createAdminClient() in src/lib/supabase/server.ts), which bypasses RLS
-- entirely and is unaffected by this migration:
--   src/app/api/webhooks/stripe/route.ts
--   src/app/api/webhooks/revenuecat/route.ts
--   src/app/api/apple-iap/sync/route.ts (via upsertAppleIapSubscription)
--   src/app/api/delete-account/route.ts
-- src/app/api/cancel-subscription/route.ts was updated in the same change to use
-- the admin client for its write, since it previously relied on the
-- now-removed user-scoped UPDATE policy.

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;

REVOKE INSERT, UPDATE ON public.subscriptions FROM authenticated;

-- SELECT is intentionally left in place — several server routes read
-- `subscriptions` using the user's own access-token-bound client (RLS-scoped
-- reads only): get-subscription, billing-portal, check-free-upgrade,
-- generate-weekly-plan, and the settings/today data loaders.
