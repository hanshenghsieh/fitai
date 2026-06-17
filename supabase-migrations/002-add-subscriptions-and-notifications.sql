-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_subscription UNIQUE(user_id, stripe_subscription_id)
);

-- Push tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_token UNIQUE(user_id)
);

-- Subscription payments table
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'twd',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Free upgrades table (達標免費升級)
CREATE TABLE IF NOT EXISTS free_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_days INTEGER NOT NULL,
  free_month_start TIMESTAMP WITH TIME ZONE NOT NULL,
  free_month_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INBODY uploads table
CREATE TABLE IF NOT EXISTS inbody_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  parsing_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INBODY results table
CREATE TABLE IF NOT EXISTS inbody_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inbody_upload_id UUID REFERENCES inbody_uploads(id) ON DELETE CASCADE,
  body_fat_pct NUMERIC,
  muscle_mass_kg NUMERIC,
  weight_kg NUMERIC,
  body_water_pct NUMERIC,
  mineral_mass_kg NUMERIC,
  protein_mass_kg NUMERIC,
  bmr_kcal NUMERIC,
  raw_data JSONB,
  parsing_status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INBODY history table (定期同步歷史)
CREATE TABLE IF NOT EXISTS inbody_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body_fat_pct NUMERIC,
  muscle_mass_kg NUMERIC,
  weight_kg NUMERIC,
  body_water_pct NUMERIC,
  mineral_mass_kg NUMERIC,
  protein_mass_kg NUMERIC,
  bmr_kcal NUMERIC,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INBODY linked accounts table
CREATE TABLE IF NOT EXISTS inbody_linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inbody_user_id TEXT NOT NULL,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_inbody UNIQUE(user_id)
);

-- Daily check-ins table (已存在，確保有這個)
CREATE TABLE IF NOT EXISTS daily_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_daily_checkin UNIQUE(user_id, check_in_date, item_type, item_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_inbody_uploads_user_id ON inbody_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_inbody_history_user_id ON inbody_history(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON daily_check_ins(user_id, check_in_date);

-- Enable RLS (Row Level Security)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbody_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbody_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbody_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbody_linked_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Push tokens
CREATE POLICY "Users can manage their own push tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Subscription payments
CREATE POLICY "Users can view their own payments" ON subscription_payments
  FOR SELECT USING (auth.uid() = user_id);

-- Free upgrades
CREATE POLICY "Users can view their free upgrades" ON free_upgrades
  FOR SELECT USING (auth.uid() = user_id);

-- INBODY tables
CREATE POLICY "Users can manage their own INBODY data" ON inbody_uploads
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own INBODY results" ON inbody_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own INBODY history" ON inbody_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their INBODY linked accounts" ON inbody_linked_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Daily check-ins (update RLS if it exists)
CREATE POLICY "Users can manage their own check-ins" ON daily_check_ins
  FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON push_tokens TO authenticated;
GRANT SELECT, INSERT ON subscription_payments TO authenticated;
GRANT SELECT ON free_upgrades TO authenticated;
GRANT SELECT, INSERT, UPDATE ON inbody_uploads TO authenticated;
GRANT SELECT ON inbody_results TO authenticated;
GRANT SELECT ON inbody_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON inbody_linked_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON daily_check_ins TO authenticated;
