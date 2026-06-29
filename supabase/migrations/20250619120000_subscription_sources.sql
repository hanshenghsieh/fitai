-- Support non-Stripe subscription sources (Apple IAP, review demo, manual grants)

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS subscription_source TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS plan TEXT;

ALTER TABLE subscriptions
  ALTER COLUMN stripe_subscription_id DROP NOT NULL,
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN current_period_start DROP NOT NULL,
  ALTER COLUMN current_period_end DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_source ON subscriptions(subscription_source);
