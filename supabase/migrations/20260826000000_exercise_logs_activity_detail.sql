-- Additive columns for accurate custom-activity calorie estimation.
--
-- Previously every non-preset ("other") exercise log used one flat generic
-- MET value regardless of what the user actually typed, so basketball and
-- yoga produced the same estimate. These columns let a log record exactly
-- which MET was used and why, without touching any existing column or row.
--
-- All nullable: pre-existing rows keep NULL here and the app falls back to
-- ACTIVITY_LABEL_ZH[activity_type] for display — historical rows still
-- render correctly. See src/lib/exercise/resolve-activity.ts.

ALTER TABLE public.exercise_logs
  ADD COLUMN IF NOT EXISTS activity_name text,
  ADD COLUMN IF NOT EXISTS met_value numeric(4,1),
  ADD COLUMN IF NOT EXISTS intensity text CHECK (intensity IN ('light', 'moderate', 'vigorous'));
