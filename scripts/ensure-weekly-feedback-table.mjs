import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1).trim()]
    })
)

const MIGRATION_SQL = `
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
`

async function tableExists() {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const { error } = await sb.from('weekly_feedback').select('id').limit(1)
  if (!error) return true
  return !/could not find the table|schema cache/i.test(error.message)
}

async function runManagementApi() {
  const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]
  if (!ref) throw new Error('Invalid SUPABASE_URL')

  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) return { ok: false, reason: 'no SUPABASE_ACCESS_TOKEN' }

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: MIGRATION_SQL }),
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, body: text.slice(0, 800) }
}

async function runPg() {
  const password = process.env.SUPABASE_DB_PASSWORD
  if (!password) return { ok: false, reason: 'no SUPABASE_DB_PASSWORD' }

  const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]
  const pg = await import('pg')
  const client = new pg.Client({
    connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  await client.query(MIGRATION_SQL)
  await client.end()
  return { ok: true }
}

async function main() {
  if (await tableExists()) {
    console.log('weekly_feedback table already exists')
    return
  }

  console.log('weekly_feedback table missing — attempting migration…')

  for (const [name, fn] of [
    ['management-api', runManagementApi],
    ['postgres', runPg],
  ]) {
    try {
      const result = await fn()
      if (result.ok) {
        console.log(`Migration applied via ${name}`)
        return
      }
      console.log(`${name}: ${result.reason ?? result.body ?? 'failed'}`)
    } catch (err) {
      console.log(`${name} error:`, err instanceof Error ? err.message : err)
    }
  }

  console.log('\nManual fix: Supabase Dashboard → SQL Editor → run supabase/migrations/20250618000000_weekly_feedback.sql')
  process.exit(1)
}

main()
