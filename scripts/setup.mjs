/**
 * FitAI Setup Script
 * Run: node scripts/setup.mjs
 *
 * Requires .env.local to already have:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_AUTH_TOKEN  (OAuth token, expires daily)
 *   -- OR --
 *   ANTHROPIC_API_KEY     (permanent API key from console.anthropic.com)
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse .env.local
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#\s=][^=]*)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
const ANTHROPIC_API_KEY = env['ANTHROPIC_API_KEY']
const ANTHROPIC_AUTH_TOKEN = env['ANTHROPIC_AUTH_TOKEN']

const isPlaceholder = (v) => !v || v.startsWith('your_') || v === ''

// ── Validate ────────────────────────────────────────────────────────────────
const missing = []
if (isPlaceholder(SUPABASE_URL)) missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (isPlaceholder(ANON_KEY)) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
if (isPlaceholder(SERVICE_KEY)) missing.push('SUPABASE_SERVICE_ROLE_KEY')
if (isPlaceholder(ANTHROPIC_API_KEY) && isPlaceholder(ANTHROPIC_AUTH_TOKEN))
  missing.push('ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN')

if (missing.length) {
  console.error('\n❌  Missing values in .env.local:')
  missing.forEach(k => console.error(`     ${k}`))
  console.error('\nFill in the missing values then re-run this script.\n')
  process.exit(1)
}

// ── Test Anthropic ───────────────────────────────────────────────────────────
process.stdout.write('Testing Anthropic API... ')
try {
  const headers = { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' }
  if (ANTHROPIC_API_KEY && !isPlaceholder(ANTHROPIC_API_KEY)) {
    headers['x-api-key'] = ANTHROPIC_API_KEY
  } else {
    headers['Authorization'] = `Bearer ${ANTHROPIC_AUTH_TOKEN}`
    headers['anthropic-beta'] = 'oauth-2025-04-20'
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  })
  if (res.ok) {
    console.log('✅  OK')
  } else {
    const body = await res.json().catch(() => ({}))
    console.log(`❌  ${res.status} ${body.error?.message ?? 'unknown error'}`)
    if (res.status === 401) {
      console.log('    → OAuth token may be expired. Get a permanent key at console.anthropic.com')
    }
  }
} catch (err) {
  console.log(`❌  ${err.message}`)
}

// ── Test Supabase ────────────────────────────────────────────────────────────
process.stdout.write('Testing Supabase connection... ')
try {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  if (res.ok || res.status === 400) {
    console.log('✅  OK')
  } else {
    console.log(`❌  ${res.status} — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY`)
  }
} catch (err) {
  console.log(`❌  ${err.message}`)
}

// ── Create storage buckets ───────────────────────────────────────────────────
const buckets = ['inbody-uploads', 'progress-photos']
for (const name of buckets) {
  process.stdout.write(`Creating bucket "${name}"... `)
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: name, name, public: false }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      console.log('✅  Created')
    } else if (data.error === 'Duplicate' || data.statusCode === '409' || res.status === 409) {
      console.log('ℹ️   Already exists')
    } else {
      console.log(`❌  ${JSON.stringify(data)}`)
    }
  } catch (err) {
    console.log(`❌  ${err.message}`)
  }
}

console.log('\n✅  Setup complete. Run: npm run dev\n')
