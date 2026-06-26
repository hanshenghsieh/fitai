/**
 * Apply growth_posts migration — loads .env.local, .env.vercel.prod
 * Requires SUPABASE_DB_PASSWORD (Supabase Dashboard → Database settings).
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

for (const f of ['.env.local', '.env.vercel.prod', '.env.vercel']) {
  loadEnvFile(resolve(root, f))
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const password =
  process.env.SUPABASE_DB_PASSWORD ||
  process.env.POSTGRES_PASSWORD ||
  process.env.DATABASE_PASSWORD

if (!url) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!ref) {
  console.error('Could not parse project ref from', url)
  process.exit(1)
}

const migrationPath = resolve(root, 'supabase/migrations/20250626120000_growth_posts.sql')
const sql = readFileSync(migrationPath, 'utf8')

const POOLER_HOSTS = [
  `aws-0-ap-southeast-1.pooler.supabase.com`,
  `aws-0-ap-northeast-1.pooler.supabase.com`,
  `aws-0-us-east-1.pooler.supabase.com`,
]

async function verifyWithServiceRole() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) return { ok: false, error: 'no service key' }
  const res = await fetch(`${url}/rest/v1/growth_posts?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (res.ok) return { ok: true, body: await res.text() }
  const body = await res.text()
  return { ok: false, error: body }
}

async function tryConnect(connectionString) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()
  await client.query(sql)
  await client.end()
}

async function runMigration() {
  const pre = await verifyWithServiceRole()
  if (pre.ok) {
    console.log('TABLE_ALREADY_EXISTS')
    return true
  }

  if (!password) {
    console.error('TABLE_MISSING:', pre.error)
    console.error(
      'Set SUPABASE_DB_PASSWORD in .env.local (Supabase → Project Settings → Database → password) and re-run.'
    )
    return false
  }

  const attempts = []
  if (process.env.DATABASE_URL) attempts.push(process.env.DATABASE_URL)
  attempts.push(`postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`)
  for (const host of POOLER_HOSTS) {
    attempts.push(
      `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:6543/postgres`
    )
  }

  for (const cs of attempts) {
    try {
      await tryConnect(cs)
      console.log('MIGRATION_APPLIED')
      return true
    } catch (err) {
      console.error('attempt failed:', err instanceof Error ? err.message : err)
    }
  }
  return false
}

const ok = await runMigration()
const post = await verifyWithServiceRole()
console.log('VERIFY', JSON.stringify(post))
process.exit(ok && post.ok ? 0 : 1)
