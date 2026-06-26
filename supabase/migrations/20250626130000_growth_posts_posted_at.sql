-- Add posted_at (original post time) and is_demo flag for sample data

alter table public.growth_posts
  add column if not exists posted_at timestamptz,
  add column if not exists is_demo boolean not null default false;

create index if not exists idx_growth_posts_posted_at on public.growth_posts(posted_at desc nulls last);
