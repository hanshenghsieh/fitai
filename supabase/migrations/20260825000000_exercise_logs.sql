-- User-initiated exercise logging — what the user actually did, distinct
-- from the AI-prescribed workout suggestion stored in
-- weekly_plans.plan_data.days[].workout. Prescribed workouts remain a
-- suggestion; exercise_logs is the factual record. Additive only, no
-- changes to existing tables.
--
-- estimated_calories is computed and frozen at write time (see
-- src/lib/exercise/activity-met.ts), not recomputed on read, so historical
-- entries don't silently change if the MET constants are tuned later.
--
-- Deliberately does NOT feed calorie_bank, daily_targets, or any weekly
-- calorie math — see src/lib/exercise/activity-met.ts header comment for
-- the double-counting rationale.

CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('walking', 'running', 'cycling', 'swimming', 'strength_training', 'other')),
  activity_label text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 600),
  estimated_calories integer NOT NULL CHECK (estimated_calories >= 0),
  logged_date date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date
  ON public.exercise_logs(user_id, logged_date);

ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can manage own exercise logs" ON public.exercise_logs;
CREATE POLICY "users can manage own exercise logs"
  ON public.exercise_logs FOR ALL
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_logs TO authenticated;
