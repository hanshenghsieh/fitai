-- Extended user settings (notifications, UI, photo prefs, etc.)
-- Run in Supabase SQL Editor when ready.

alter table public.user_profiles
  add column if not exists settings_preferences jsonb not null default '{}'::jsonb;

comment on column public.user_profiles.settings_preferences is
  'BetterBit settings subpages: notifications, UI, photo recognition, calorie bank prefs, etc.';

-- Optional future fields (not required for current build):
-- alter table public.user_profiles add column if not exists birthday date;
-- alter table public.body_measurements add column if not exists note text;
