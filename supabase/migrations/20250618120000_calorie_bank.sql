-- BetterBit Engine v1 — persistent calorie bank + recovery window

-- Shared trigger helper (may be missing if schema.sql was never applied wholesale)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.calorie_bank (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  daily_target_kcal integer not null,
  internal_target_kcal integer not null,
  actual_kcal integer not null default 0,
  delta_kcal integer not null default 0,
  running_balance_kcal integer not null default 0,
  recovery_balance_kcal integer not null default 0,
  spread_days_remaining integer not null default 0,
  daily_adjust_kcal integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

create index if not exists idx_calorie_bank_user_date on public.calorie_bank(user_id, date);

alter table public.calorie_bank enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calorie_bank'
      and policyname = 'users can manage own calorie bank'
  ) then
    create policy "users can manage own calorie bank"
      on public.calorie_bank
      for all
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_calorie_bank_update'
  ) then
    create trigger on_calorie_bank_update
      before update on public.calorie_bank
      for each row execute function public.handle_updated_at();
  end if;
end $$;
