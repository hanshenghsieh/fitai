-- ============================================================
-- FitAI Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- USER PROFILES
-- ============================================================
create table public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  gender text check (gender in ('male', 'female', 'other')),
  age integer check (age between 10 and 120),
  height_cm numeric(5,1) check (height_cm between 100 and 250),
  weight_kg numeric(5,1) check (weight_kg between 20 and 300),
  body_fat_pct numeric(4,1) check (body_fat_pct between 1 and 70),
  muscle_mass_kg numeric(5,1),
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')) default 'moderate',
  -- dietary restrictions
  is_vegetarian boolean default false,
  is_vegan boolean default false,
  is_halal boolean default false,
  is_gluten_free boolean default false,
  allergens text[] default '{}',  -- e.g. ['nuts','dairy','shellfish']
  disliked_foods text[] default '{}',
  cuisine_preference text default 'asian',  -- asian / western / mixed
  cooking_time_mins integer default 30,  -- available cooking time per meal
  food_budget text check (food_budget in ('low','medium','high')) default 'medium',
  -- fitness setup
  equipment text[] default '{}',  -- ['dumbbells','barbell','pull_up_bar','resistance_bands','none']
  injuries text[] default '{}',   -- ['knee','back','shoulder','wrist']
  health_conditions text[] default '{}',  -- ['diabetes','hypertension','pregnancy']
  fitness_level text check (fitness_level in ('beginner','intermediate','advanced')) default 'beginner',
  -- water & sleep
  sleep_hours_target numeric(3,1) default 7.5,
  water_ml_target integer default 2000,
  -- flags
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- GOALS
-- ============================================================
create table public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_type text check (goal_type in ('lose_fat','lose_weight','gain_muscle','maintain','body_recomp')) not null,
  target_weight_kg numeric(5,1),
  target_body_fat_pct numeric(4,1),
  start_date date not null default current_date,
  end_date date not null,
  start_weight_kg numeric(5,1),
  start_body_fat_pct numeric(4,1),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- EXERCISE LIBRARY (pre-curated, NOT AI-generated IDs)
-- ============================================================
create table public.exercise_library (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  name_zh text,
  category text check (category in ('chest','back','shoulders','arms','core','legs','cardio','flexibility','full_body')) not null,
  equipment_required text[] default '{}',
  difficulty text check (difficulty in ('beginner','intermediate','advanced')) default 'beginner',
  youtube_id text,
  duration_secs integer,
  sets_default integer,
  reps_default integer,
  contraindications text[] default '{}',  -- injuries that should skip this exercise
  instructions text,
  created_at timestamptz default now()
);

-- ============================================================
-- INBODY UPLOADS
-- ============================================================
create table public.inbody_uploads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  parsed_data jsonb,  -- Claude Vision output
  parsing_status text check (parsing_status in ('pending','success','failed')) default 'pending',
  created_at timestamptz default now()
);

-- ============================================================
-- WEEKLY PLANS
-- ============================================================
create table public.weekly_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  week_number integer not null default 1,
  plan_data jsonb not null,   -- full AI-generated plan
  coach_note text,
  generation_status text check (generation_status in ('pending','generating','completed','failed')) default 'completed',
  previous_completion_rate numeric(4,1),  -- diet % last week
  previous_workout_rate numeric(4,1),     -- workout % last week
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- ============================================================
-- DAILY CHECKINS
-- ============================================================
create table public.daily_checkins (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  checkin_date date not null default current_date,
  weekly_plan_id uuid references public.weekly_plans(id) on delete set null,
  -- diet items: array of {meal_id, completed}
  diet_items jsonb default '[]',
  -- workout items: array of {exercise_id, completed, actual_sets, actual_reps, weight_kg}
  workout_items jsonb default '[]',
  water_ml integer default 0,
  sleep_hours numeric(3,1),
  energy_level integer check (energy_level between 1 and 5),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, checkin_date)
);

-- ============================================================
-- BODY MEASUREMENTS (weekly log)
-- ============================================================
create table public.body_measurements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  measured_at date not null default current_date,
  weight_kg numeric(5,1),
  body_fat_pct numeric(4,1),
  muscle_mass_kg numeric(5,1),
  waist_cm numeric(5,1),
  hip_cm numeric(5,1),
  chest_cm numeric(5,1),
  inbody_upload_id uuid references public.inbody_uploads(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================================
-- WEEKLY FEEDBACK
-- ============================================================
create table public.weekly_feedback (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  hardest_part text,          -- free text: what was hardest
  diet_satisfaction integer check (diet_satisfaction between 1 and 5),
  workout_intensity text check (workout_intensity in ('too_easy','just_right','too_hard')),
  had_sick_days boolean default false,
  had_travel boolean default false,
  additional_notes text,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- ============================================================
-- PROGRESS PHOTOS
-- ============================================================
create table public.progress_photos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  photo_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_weekly_plans_user_week on public.weekly_plans(user_id, week_start);
create index idx_daily_checkins_user_date on public.daily_checkins(user_id, checkin_date);
create index idx_body_measurements_user_date on public.body_measurements(user_id, measured_at);
create index idx_exercise_library_category on public.exercise_library(category);
create index idx_goals_user_active on public.goals(user_id, is_active);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_user_profiles_update
  before update on public.user_profiles
  for each row execute function public.handle_updated_at();

create trigger on_daily_checkins_update
  before update on public.daily_checkins
  for each row execute function public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.user_profiles enable row level security;
alter table public.goals enable row level security;
alter table public.inbody_uploads enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.body_measurements enable row level security;
alter table public.weekly_feedback enable row level security;
alter table public.progress_photos enable row level security;
alter table public.exercise_library enable row level security;

-- user_profiles: own row only
create policy "users can view own profile" on public.user_profiles for select using (auth.uid() = id);
create policy "users can insert own profile" on public.user_profiles for insert with check (auth.uid() = id);
create policy "users can update own profile" on public.user_profiles for update using (auth.uid() = id);
create policy "users can delete own profile" on public.user_profiles for delete using (auth.uid() = id);

-- goals
create policy "users can manage own goals" on public.goals for all using (auth.uid() = user_id);

-- inbody_uploads
create policy "users can manage own uploads" on public.inbody_uploads for all using (auth.uid() = user_id);

-- weekly_plans
create policy "users can manage own plans" on public.weekly_plans for all using (auth.uid() = user_id);

-- daily_checkins
create policy "users can manage own checkins" on public.daily_checkins for all using (auth.uid() = user_id);

-- body_measurements
create policy "users can manage own measurements" on public.body_measurements for all using (auth.uid() = user_id);

-- weekly_feedback
create policy "users can manage own feedback" on public.weekly_feedback for all using (auth.uid() = user_id);

-- progress_photos
create policy "users can manage own photos" on public.progress_photos for all using (auth.uid() = user_id);

-- exercise_library: read-only for all authenticated users
create policy "authenticated users can read exercises" on public.exercise_library for select using (auth.role() = 'authenticated');

-- ============================================================
-- EXERCISE LIBRARY SEED DATA (Taiwan-friendly, verified videos)
-- ============================================================
insert into public.exercise_library (name, name_zh, category, equipment_required, difficulty, youtube_id, duration_secs, sets_default, reps_default, contraindications, instructions) values
-- CHEST
('Push-up', '伏地挺身', 'chest', '{}', 'beginner', 'IODxDxX7oi4', null, 3, 15, '{"shoulder"}', '手與肩同寬，身體打直，胸部碰地後推起'),
('Wide Push-up', '寬距伏地挺身', 'chest', '{}', 'beginner', 'K3bJAFx6pUQ', null, 3, 12, '{"shoulder"}', '雙手比肩寬，更多訓練胸大肌外側'),
('Dumbbell Chest Press', '啞鈴臥推', 'chest', '{"dumbbells"}', 'intermediate', 'VmB1G1K7v94', null, 3, 12, '{"shoulder","wrist"}', '仰臥，啞鈴推至胸正上方，慢慢放下'),
('Diamond Push-up', '鑽石伏地挺身', 'chest', '{}', 'intermediate', 'J0DXDxX7oi4', null, 3, 10, '{"shoulder","wrist"}', '雙手拼成菱形，強化三頭與胸內側'),

-- BACK
('Superman', '超人式', 'back', '{}', 'beginner', 'cc3pLyJiGvA', 30, 3, 15, '{}', '俯臥，同時抬起雙手雙腳，保持2秒'),
('Dumbbell Row', '啞鈴划船', 'back', '{"dumbbells"}', 'intermediate', 'roCP_ANDLow', null, 3, 12, '{"back","shoulder"}', '單膝跪凳，拉啞鈴至腰側，感受背肌收縮'),
('Pull-up', '引體向上', 'back', '{"pull_up_bar"}', 'advanced', 'eGo4IYlbE5g', null, 3, 8, '{"shoulder","wrist"}', '正握比肩寬，身體拉至下巴過槓'),
('Resistance Band Row', '彈力帶划船', 'back', '{"resistance_bands"}', 'beginner', 'GZbfZ033f74', null, 3, 15, '{}', '彈力帶固定，雙手拉至腹部，背肌用力'),

-- SHOULDERS
('Dumbbell Shoulder Press', '啞鈴肩推', 'shoulders', '{"dumbbells"}', 'intermediate', 'qEwKCR5JCog', null, 3, 12, '{"shoulder"}', '坐姿，啞鈴從耳側推至頭頂，不鎖死關節'),
('Lateral Raise', '側平舉', 'shoulders', '{"dumbbells"}', 'beginner', 'XPPfXo6xt4Q', null, 3, 15, '{"shoulder"}', '輕啞鈴，雙臂側舉至肩膀高度，感受三角肌中束'),
('Pike Push-up', '倒V伏地挺身', 'shoulders', '{}', 'intermediate', 'x7_I5SUAd00', null, 3, 10, '{"shoulder","wrist"}', '臀部抬高呈倒V，頭往地板方向下壓再推起'),

-- ARMS
('Bicep Curl', '啞鈴彎舉', 'arms', '{"dumbbells"}', 'beginner', 'ykJmrZ5v0Oo', null, 3, 12, '{"wrist"}', '上臂貼身體，彎舉至肩膀，慢慢放下'),
('Tricep Dip', '三頭下壓', 'arms', '{}', 'beginner', '6kALZikXxLc', null, 3, 12, '{"shoulder","wrist"}', '手撐椅面，身體下降至手肘90度再推起'),
('Hammer Curl', '鎚式彎舉', 'arms', '{"dumbbells"}', 'beginner', 'TwD-YGVP4Bk', null, 3, 12, '{"wrist"}', '拇指朝上握啞鈴，彎舉至肩膀高度'),

-- CORE
('Plank', '棒式', 'core', '{}', 'beginner', 'pSHjTRCQxIw', 30, 3, 1, '{"back","wrist"}', '手肘撐地，身體打直，核心收緊，維持30-60秒'),
('Crunch', '捲腹', 'core', '{}', 'beginner', 'Xyd_fa5zoEU', null, 3, 20, '{"back"}', '仰臥屈膝，捲起上背至肩膀離地，不要拉頸部'),
('Bicycle Crunch', '腳踏車捲腹', 'core', '{}', 'intermediate', 'cbKIDZ_XUg4', null, 3, 20, '{"back"}', '交替轉體，左肘碰右膝，訓練腹斜肌'),
('Dead Bug', '死蟲式', 'core', '{}', 'beginner', 'g_BYB0R-4Ws', null, 3, 10, '{"back"}', '仰臥，對側手腳同時延伸，腰背貼地'),
('Russian Twist', '俄羅斯轉體', 'core', '{}', 'intermediate', 'JyUqwkVpsi8', null, 3, 20, '{"back"}', '坐姿腳抬起，上身轉動至兩側，可手持啞鈴'),
('Mountain Climber', '登山者式', 'core', '{}', 'intermediate', 'nmwgirgXLYM', null, 3, 30, '{"wrist","shoulder"}', '棒式姿勢，快速交替膝蓋往胸部帶'),

-- LEGS
('Squat', '深蹲', 'legs', '{}', 'beginner', 'YaXPRqUwItQ', null, 3, 15, '{"knee"}', '腳與肩同寬，臀部往後坐，膝蓋不超過腳尖'),
('Lunge', '弓步蹲', 'legs', '{}', 'beginner', '3XDriUn0udo', null, 3, 12, '{"knee"}', '大步向前，後膝幾乎碰地，保持上身直立'),
('Glute Bridge', '臀橋', 'legs', '{}', 'beginner', 'wPM8icPu6H8', null, 3, 20, '{"back"}', '仰臥屈膝，臀部上推至身體打直，頂端收緊臀肌'),
('Dumbbell Goblet Squat', '酒杯式深蹲', 'legs', '{"dumbbells"}', 'beginner', 'MeIiIdhvXT4', null, 3, 12, '{"knee"}', '雙手捧啞鈴在胸前，深蹲保持胸部朝上'),
('Romanian Deadlift', '羅馬尼亞硬拉', 'legs', '{"dumbbells"}', 'intermediate', 'JCXUYuzwNrM', null, 3, 12, '{"back","knee"}', '啞鈴沿腿前側下滑，感受大腿後側延伸'),
('Step-up', '登階', 'legs', '{}', 'beginner', 'WCFCdxzFBa4', null, 3, 12, '{"knee"}', '單腳踩上椅子或台階，完全站直後換腳'),

-- CARDIO
('Jumping Jack', '開合跳', 'cardio', '{}', 'beginner', 'c4DAnQ6DtF8', 60, 3, 1, '{"knee"}', '雙腳同時跳開同時舉手，再跳回'),
('High Knees', '原地高抬腿', 'cardio', '{}', 'beginner', 'tx5-MTidMHc', 30, 3, 1, '{"knee"}', '原地跑步，膝蓋盡量抬至腰部高度'),
('Burpee', '波比跳', 'cardio', '{}', 'intermediate', 'TU8QYVW0gDU', null, 3, 10, '{"knee","shoulder","wrist","back"}', '深蹲跳出棒式、伏地挺身、跳起，全身爆發力'),
('Jump Rope', '跳繩', 'cardio', '{"jump_rope"}', 'beginner', 'u3zgHI8QnqE', 120, 3, 1, '{"knee"}', '維持輕盈步伐，手腕轉動繩子而非大臂'),
('Walk/Jog', '快走/慢跑', 'cardio', '{}', 'beginner', null, 1800, 1, 1, '{"knee"}', '維持能正常說話的配速，心率約最大心率60-70%'),

-- FLEXIBILITY
('Cat-Cow Stretch', '貓牛式', 'flexibility', '{}', 'beginner', 'kqnua4rHVVA', 60, 1, 10, '{"back"}', '四足跪姿，吸氣拱背，吐氣塌背，緩慢進行'),
('Hip Flexor Stretch', '髖屈肌伸展', 'flexibility', '{}', 'beginner', 'YQmpFpnygng', 30, 2, 1, '{"knee"}', '弓步跪姿，後膝貼地，重心前移感受髖前側伸展'),
('Child Pose', '嬰兒式', 'flexibility', '{}', 'beginner', 'eqZgis-bfB8', 60, 1, 1, '{}', '臀部坐向腳跟，雙手前伸，放鬆背部'),
('Pigeon Pose', '鴿子式', 'flexibility', '{}', 'intermediate', 'sqoBg9rVLGk', 60, 2, 1, '{"knee","hip"}', '一腳屈於前，另腳延伸後方，感受臀部深層伸展'),
('World Greatest Stretch', '世界最強伸展', 'flexibility', '{}', 'intermediate', 'MKiwJhfKR7k', null, 2, 5, '{"wrist"}', '弓步踩腳，同側手肘往地板，轉體向上，全身活動'),

-- FULL BODY
('Dumbbell Complex', '啞鈴複合訓練', 'full_body', '{"dumbbells"}', 'intermediate', 'TLm5-d4JFqI', null, 3, 8, '{"back","knee","shoulder"}', '連續動作：划船-深蹲-肩推，不放下啞鈴'),
('Bear Crawl', '熊爬', 'full_body', '{}', 'intermediate', 'E7HaAqTCZos', 30, 3, 1, '{"wrist","shoulder"}', '四足姿膝蓋離地10cm，向前爬行維持核心穩定'),
('Inchworm', '尺蠖式', 'full_body', '{}', 'beginner', 'VcNW9IQGJ5E', null, 2, 8, '{"back","wrist"}', '站立彎腰手走至棒式，再走回站直');
