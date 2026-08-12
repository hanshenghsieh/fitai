-- PROPOSAL — NOT YET APPLIED TO PRODUCTION.
-- This migration is a design artifact for review. Do not run against production
-- until the plan in the accompanying analysis report has been confirmed.
--
-- Purpose: give the existing offline food-kb pipeline (scripts/food-kb/*,
-- data/food-kb/graph.json) a queryable, RLS-protected home for (a) a flattened
-- reporting view of food items and (b) a real human-review workflow. The JSON
-- graph file remains the pipeline's source of truth; these tables are a
-- read-optimized mirror + a proper multi-editor review/audit trail that a
-- JSON file on disk cannot safely provide.

create table if not exists public.food_kb_items (
  id text primary key,                          -- mirrors KbFoodItem.id from graph.json
  cluster_id text,
  brand_slug text not null,
  store_name text not null,
  name_zh text not null,
  name_normalized text not null,
  category text,
  role text,

  -- nutrition (per reported serving)
  serving_size text,
  serving_weight_g numeric,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  sugar_g numeric,
  fiber_g numeric,
  sodium_mg numeric,

  -- data quality / provenance
  source text not null check (source in ('official', 'restaurant', 'crawler', 'ai_generated', 'user')),
  source_type text,                             -- fine-grained food-kb SourceType (e.g. tfda_open_data, ubereats, menu_ocr)
  confidence_score integer not null check (confidence_score between 0 and 100),
  source_count integer not null default 1,
  review_status text not null default 'auto_approved'
    check (review_status in ('pending', 'auto_approved', 'approved', 'rejected')),

  price_twd numeric,
  image_urls text[] not null default '{}',
  tags text[] not null default '{}',
  is_available boolean not null default true,

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  synced_at timestamptz not null default now()    -- last time this row was refreshed from graph.json
);

create index if not exists idx_food_kb_items_brand on public.food_kb_items(brand_slug);
create index if not exists idx_food_kb_items_confidence on public.food_kb_items(confidence_score);
create index if not exists idx_food_kb_items_review_status on public.food_kb_items(review_status);
create index if not exists idx_food_kb_items_name_zh on public.food_kb_items(name_zh);

alter table public.food_kb_items enable row level security;

create policy "Anyone authenticated can read food_kb_items"
  on public.food_kb_items for select
  to authenticated
  using (true);

create policy "Service role manages food_kb_items"
  on public.food_kb_items for all
  to service_role
  using (true)
  with check (true);


-- Human review queue for low-confidence / conflicting / duplicate-candidate items.
-- Mirrors the data model already coded in src/lib/data-governance/review-queue.ts
-- (currently backed by a JSON manifest file, not a real table).
create table if not exists public.food_kb_review_queue (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.food_kb_items(id) on delete cascade,
  reason text not null
    check (reason in ('low_confidence', 'source_conflict', 'duplicate_candidate', 'missing_nutrition', 'user_reported')),
  detail jsonb not null default '{}',            -- e.g. conflicting source values, candidate duplicate item ids
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'merged')),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

create index if not exists idx_review_queue_status on public.food_kb_review_queue(status);
create index if not exists idx_review_queue_item on public.food_kb_review_queue(item_id);

alter table public.food_kb_review_queue enable row level security;

create policy "Service role manages review queue"
  on public.food_kb_review_queue for all
  to service_role
  using (true)
  with check (true);


-- Append-only governance action trail (promote / reject / merge / manual edit / rollback).
-- Mirrors src/lib/data-governance/audit-log.ts and src/lib/data-governance/promotion.ts.
create table if not exists public.food_kb_audit_log (
  id uuid primary key default gen_random_uuid(),
  item_id text,
  action text not null
    check (action in ('promote', 'reject', 'merge', 'manual_edit', 'rollback')),
  actor uuid references auth.users(id),
  before jsonb,
  after jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_item on public.food_kb_audit_log(item_id);
create index if not exists idx_audit_log_created on public.food_kb_audit_log(created_at desc);

alter table public.food_kb_audit_log enable row level security;

create policy "Service role manages audit log"
  on public.food_kb_audit_log for all
  to service_role
  using (true)
  with check (true);

comment on table public.food_kb_items is 'Queryable Supabase mirror of data/food-kb/graph.json, synced by an export step — the JSON graph remains authoritative, this table is a read-optimized reporting copy for the admin review UI and future server-side queries.';
comment on table public.food_kb_review_queue is 'Human review queue for low-confidence / conflicting / duplicate-candidate food-kb items, feeding the proposed admin review UI.';
comment on table public.food_kb_audit_log is 'Append-only governance action log for food-kb data changes (promote/reject/merge/edit/rollback).';
