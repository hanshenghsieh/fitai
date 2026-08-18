-- App update announcement — remote-controlled release config.
--
-- One row per platform (currently just 'ios'; a future 'android' row needs
-- no schema change). Read is public (anon + authenticated) — the in-app
-- update check must work for logged-out users too, before any auth session
-- exists. Writes are server-only: no INSERT/UPDATE/DELETE policy exists for
-- anon/authenticated, so only the service-role admin client (used by the
-- admin-gated PATCH endpoint, see src/app/api/app-release-config/route.ts)
-- can change it — matches the subscriptions/analytics_events lockdown
-- pattern already used elsewhere in this schema.
--
-- enabled defaults to false and latest_version starts equal to the
-- currently-shipped native version — a fresh deploy of this migration must
-- never itself trigger an update prompt for anyone.

CREATE TABLE IF NOT EXISTS app_release_config (
  platform TEXT PRIMARY KEY,
  latest_version TEXT NOT NULL,
  minimum_version TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  update_url TEXT NOT NULL DEFAULT '',
  force_update BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO app_release_config (platform, latest_version, minimum_version, title, message, update_url, force_update, enabled)
VALUES (
  'ios',
  '1.0.1',
  '1.0.1',
  'BetterBit 有新版本囉',
  '這次我們改善了拍照辨識與營養估算的準確度。為了讓每天的飲食紀錄更可靠，建議更新至最新版本。',
  '',
  false,
  false
)
ON CONFLICT (platform) DO NOTHING;

ALTER TABLE app_release_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_release_config_public_read ON app_release_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON app_release_config FROM anon, authenticated;
