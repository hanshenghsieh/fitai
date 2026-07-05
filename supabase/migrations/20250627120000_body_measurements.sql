-- Weekly body measurements log (weight trend on Progress page)

CREATE TABLE IF NOT EXISTS public.body_measurements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  measured_at date NOT NULL DEFAULT current_date,
  weight_kg numeric(5,1),
  body_fat_pct numeric(4,1),
  muscle_mass_kg numeric(5,1),
  waist_cm numeric(5,1),
  hip_cm numeric(5,1),
  chest_cm numeric(5,1),
  inbody_upload_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date
  ON public.body_measurements(user_id, measured_at);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can manage own measurements" ON public.body_measurements;
CREATE POLICY "users can manage own measurements"
  ON public.body_measurements FOR ALL
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
