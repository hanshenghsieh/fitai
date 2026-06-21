-- Weekly reflection feedback (WeekReflection + generate-plan adjustments)
create extension if not exists "uuid-ossp";

create table if not exists public.weekly_feedback (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  hardest_part text,
  diet_satisfaction integer check (diet_satisfaction between 1 and 5),
  workout_intensity text check (workout_intensity in ('too_easy','just_right','too_hard')),
  had_sick_days boolean default false,
  had_travel boolean default false,
  additional_notes text,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

alter table public.weekly_feedback enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'weekly_feedback'
      and policyname = 'users can manage own feedback'
  ) then
    create policy "users can manage own feedback"
      on public.weekly_feedback
      for all
      using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_weekly_feedback_user_week
  on public.weekly_feedback(user_id, week_start);
