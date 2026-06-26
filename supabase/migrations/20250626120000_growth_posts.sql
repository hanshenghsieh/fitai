-- BetterBit Growth AI — posts for founder outreach workflow
-- Run in Supabase Dashboard → SQL Editor, or: npm run migrate:growth-posts

create extension if not exists "uuid-ossp";

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.growth_posts (
  id uuid default uuid_generate_v4() primary key,
  platform text not null,
  post_url text,
  author text,
  content text not null,
  keyword text,
  created_at timestamptz default now() not null,
  status text not null default 'pending',
  ai_score integer,
  ai_reason text,
  reply_type text,
  generated_replies jsonb,
  reply_content text,
  replied_at timestamptz,
  updated_at timestamptz default now() not null,
  posted_at timestamptz,
  is_demo boolean not null default false
);

create index if not exists idx_growth_posts_status on public.growth_posts(status);
create index if not exists idx_growth_posts_created_at on public.growth_posts(created_at desc);

alter table public.growth_posts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_growth_posts_update'
  ) then
    create trigger on_growth_posts_update
      before update on public.growth_posts
      for each row execute function public.handle_updated_at();
  end if;
end $$;
