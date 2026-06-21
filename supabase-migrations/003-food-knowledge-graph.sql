-- ============================================================
-- Taiwan Food Knowledge Graph (incremental, multi-source)
-- Run after schema.sql — never full-rebuild; append observations
-- ============================================================

create extension if not exists pg_trgm;

-- ── Taxonomy ────────────────────────────────────────────────

create table public.kb_brands (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  name_zh text not null,
  name_en text,
  brand_type text check (brand_type in (
    'convenience','fast_food','chain_restaurant','breakfast','buffet',
    'bento','hot_pot','bubble_tea','coffee','night_market','supermarket',
    'home_ingredient','snack','dessert','delivery_platform','other'
  )) not null default 'other',
  parent_brand_id uuid references public.kb_brands(id),
  website_url text,
  region text default 'TW',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.kb_categories (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  name_zh text not null,
  parent_id uuid references public.kb_categories(id),
  meal_slot text check (meal_slot in ('breakfast','lunch','dinner','snack','drink','any')),
  sort_order int default 0
);

-- ── Canonical food cluster (synonym hub) ────────────────────

create table public.kb_food_clusters (
  id uuid default uuid_generate_v4() primary key,
  cluster_key text unique not null,
  canonical_name_zh text not null,
  canonical_name_en text,
  category_id uuid references public.kb_categories(id),
  brand_id uuid references public.kb_brands(id),
  serving_size text,
  serving_weight_g numeric(8,1),
  is_discontinued boolean default false,
  is_seasonal boolean default false,
  season_note text,
  -- merged best-estimate nutrition (confidence-weighted)
  calories numeric(8,1),
  protein_g numeric(8,2),
  fat_g numeric(8,2),
  carbs_g numeric(8,2),
  sugar_g numeric(8,2),
  fiber_g numeric(8,2),
  sodium_mg numeric(10,1),
  confidence numeric(4,3) check (confidence between 0 and 1),
  source_count int default 0,
  last_validated_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.kb_food_aliases (
  id uuid default uuid_generate_v4() primary key,
  cluster_id uuid references public.kb_food_clusters(id) on delete cascade not null,
  alias text not null,
  alias_normalized text not null,
  alias_type text check (alias_type in (
    'synonym','abbreviation','size_variant','regional','ocr_typo','legacy_id'
  )) default 'synonym',
  locale text default 'zh-TW',
  unique (cluster_id, alias_normalized)
);

create index idx_kb_aliases_norm on public.kb_food_aliases using gin (alias_normalized gin_trgm_ops);

-- ── Store-specific SKU (menu line item) ─────────────────────

create table public.kb_food_items (
  id uuid default uuid_generate_v4() primary key,
  cluster_id uuid references public.kb_food_clusters(id) on delete set null,
  legacy_id text unique,
  brand_id uuid references public.kb_brands(id),
  store_name text not null,
  item_name_zh text not null,
  item_name_normalized text not null,
  category text,
  role text,
  price_twd int,
  calories numeric(8,1),
  protein_g numeric(8,2),
  fat_g numeric(8,2),
  carbs_g numeric(8,2),
  sugar_g numeric(8,2),
  fiber_g numeric(8,2),
  serving_size text,
  serving_weight_g numeric(8,1),
  image_urls text[] default '{}',
  ingredients text,
  tags text[] default '{}',
  portionable boolean default false,
  region text default 'TW',
  is_available boolean default true,
  confidence numeric(4,3),
  metadata jsonb default '{}',
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_kb_items_store on public.kb_food_items (store_name);
create index idx_kb_items_norm on public.kb_food_items using gin (item_name_normalized gin_trgm_ops);
create index idx_kb_items_cluster on public.kb_food_items (cluster_id);

-- ── Provenance: every observation from every crawler ────────

create table public.kb_sources (
  id uuid default uuid_generate_v4() primary key,
  source_type text check (source_type in (
    'official_website','official_pdf','tfda_open_data','open_food_facts',
    'google_maps','google_reviews','ubereats','foodpanda','openrice','ifoodie',
    'dcard','ptt','reddit','blog','instagram','facebook','news',
    'menu_ocr','user_photo','community','legacy_import','estimated','other'
  )) not null,
  source_name text not null,
  source_url text,
  trust_weight numeric(4,3) default 0.5,
  is_active boolean default true,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table public.kb_observations (
  id uuid default uuid_generate_v4() primary key,
  source_id uuid references public.kb_sources(id) not null,
  item_id uuid references public.kb_food_items(id) on delete set null,
  cluster_id uuid references public.kb_food_clusters(id) on delete set null,
  raw_name text not null,
  raw_store text,
  raw_brand text,
  raw_json jsonb default '{}',
  calories numeric(8,1),
  protein_g numeric(8,2),
  fat_g numeric(8,2),
  carbs_g numeric(8,2),
  sugar_g numeric(8,2),
  fiber_g numeric(8,2),
  price_twd int,
  image_url text,
  serving_size text,
  ingredients text,
  observed_at timestamptz default now(),
  content_hash text not null,
  unique (source_id, content_hash)
);

-- ── Ingredients graph ───────────────────────────────────────

create table public.kb_ingredients (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  name_zh text not null,
  calories_per_100g numeric(8,2),
  protein_per_100g numeric(8,2),
  fat_per_100g numeric(8,2),
  carbs_per_100g numeric(8,2),
  allergens text[] default '{}',
  metadata jsonb default '{}'
);

create table public.kb_food_ingredients (
  food_item_id uuid references public.kb_food_items(id) on delete cascade,
  ingredient_id uuid references public.kb_ingredients(id) on delete cascade,
  amount_g numeric(8,2),
  is_estimated boolean default false,
  primary key (food_item_id, ingredient_id)
);

-- ── Pipeline & QA ───────────────────────────────────────────

create table public.kb_sync_runs (
  id uuid default uuid_generate_v4() primary key,
  run_type text check (run_type in ('full_crawl','incremental','import','ocr_batch','qa')) not null,
  adapter text not null,
  status text check (status in ('running','completed','failed','partial')) default 'running',
  items_fetched int default 0,
  items_new int default 0,
  items_updated int default 0,
  items_merged int default 0,
  errors jsonb default '[]',
  started_at timestamptz default now(),
  finished_at timestamptz
);

create table public.kb_coverage_gaps (
  id uuid default uuid_generate_v4() primary key,
  gap_type text check (gap_type in (
    'missing_brand','missing_category','missing_nutrition','low_confidence',
    'stale_menu','user_requested','competitor_has'
  )) not null,
  brand_slug text,
  category_slug text,
  description text not null,
  priority int default 5 check (priority between 1 and 10),
  resolved boolean default false,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- ── RLS: food KB is public read, service write ──────────────

alter table public.kb_brands enable row level security;
alter table public.kb_categories enable row level security;
alter table public.kb_food_clusters enable row level security;
alter table public.kb_food_aliases enable row level security;
alter table public.kb_food_items enable row level security;
alter table public.kb_sources enable row level security;
alter table public.kb_observations enable row level security;
alter table public.kb_ingredients enable row level security;
alter table public.kb_food_ingredients enable row level security;
alter table public.kb_sync_runs enable row level security;
alter table public.kb_coverage_gaps enable row level security;

create policy "kb_public_read" on public.kb_brands for select using (true);
create policy "kb_public_read" on public.kb_categories for select using (true);
create policy "kb_public_read" on public.kb_food_clusters for select using (true);
create policy "kb_public_read" on public.kb_food_aliases for select using (true);
create policy "kb_public_read" on public.kb_food_items for select using (true);
create policy "kb_public_read" on public.kb_sources for select using (true);
create policy "kb_public_read" on public.kb_observations for select using (true);
create policy "kb_public_read" on public.kb_ingredients for select using (true);
create policy "kb_public_read" on public.kb_food_ingredients for select using (true);

-- Service role writes via API/cron (no user insert policies)

create index idx_kb_clusters_confidence on public.kb_food_clusters (confidence desc nulls last);
create index idx_kb_gaps_open on public.kb_coverage_gaps (priority desc) where not resolved;
