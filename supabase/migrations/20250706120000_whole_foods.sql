-- Whole foods reference table for home-cooked / decomposed meal logging.
-- Nutrition values are per 100g or 100ml depending on default_unit.

create table if not exists public.whole_foods (
  id text primary key,
  name_zh text not null,
  name_en text,
  category text not null check (category in ('protein', 'carb', 'veg', 'fat', 'sauce', 'other')),
  aliases text[] not null default '{}',
  calories_per_100 numeric not null,
  protein_g_per_100 numeric not null default 0,
  carbs_g_per_100 numeric not null default 0,
  fat_g_per_100 numeric not null default 0,
  fiber_g_per_100 numeric,
  sodium_mg_per_100 numeric,
  default_unit text not null default 'g' check (default_unit in ('g', 'ml', 'piece')),
  grams_per_piece numeric,
  vegan boolean default false,
  source text default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whole_foods_category on public.whole_foods(category);
create index if not exists idx_whole_foods_name_zh on public.whole_foods(name_zh);

alter table public.whole_foods enable row level security;

create policy "Anyone authenticated can read whole foods"
  on public.whole_foods for select
  to authenticated
  using (true);

create policy "Service role manages whole foods"
  on public.whole_foods for all
  to service_role
  using (true)
  with check (true);

comment on table public.whole_foods is 'Per-100g/ml reference nutrition for home-cooked ingredient portion logging';
