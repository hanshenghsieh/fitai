-- Phase 2 TASK 5 — persist the canonical subscription product identity.
--
-- Audit finding: RevenueCat's product_identifier (monthly vs annual) was
-- fetched from the verified subscriber response (see
-- src/lib/revenuecat-server.ts's VerifiedRevenueCatSubscription.productId)
-- but dropped before writing to `subscriptions`
-- (src/lib/apple-iap-store.ts's AppleIapSyncInput/buildAppleIapSubscriptionRow
-- never referenced input.productId). Stripe's subscription price/interval was
-- similarly never persisted. Net effect: the database could not tell monthly
-- from annual subscribers, so MRR could not be computed correctly.
--
-- `subscription_source` (added in 20250619120000_subscription_sources.sql)
-- already serves as the provider column ('stripe' | 'apple_iap' |
-- 'apple_review_demo' | 'manual_grant') — no separate provider column needed.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS product_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_period TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT;

-- Existing rows predate these columns and cannot be reliably reconstructed
-- (the raw product identifier was never stored) — mark them explicitly
-- 'unknown' rather than guessing monthly/annual from e.g. price amount.
UPDATE subscriptions SET billing_period = 'unknown' WHERE billing_period IS NULL;
UPDATE subscriptions SET environment = 'unknown' WHERE environment IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_period ON subscriptions(billing_period);
