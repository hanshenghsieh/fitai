/**
 * Grant permanent premium (manual_grant) to every auth user.
 * Usage: node scripts/grant-all-permanent-premium.mjs
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#\s=][^=]*)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const PERIOD_END = '2099-12-31T23:59:59.000Z'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  'Content-Type': 'application/json',
}

async function listAllAuthUsers() {
  const users = []
  let page = 1
  while (page <= 100) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    })
    if (!res.ok) throw new Error(`List users failed: ${await res.text()}`)
    const data = await res.json()
    const batch = data.users ?? []
    users.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return users
}

async function grantUser(user) {
  const userId = user.id
  const email = user.email ?? '(no email)'
  const syntheticId = `manual_grant_${userId}`
  const now = new Date().toISOString()

  const fullBody = {
    user_id: userId,
    stripe_subscription_id: syntheticId,
    stripe_customer_id: syntheticId,
    status: 'active',
    subscription_source: 'manual_grant',
    plan: 'premium',
    current_period_start: now,
    current_period_end: PERIOD_END,
    cancel_at_period_end: false,
  }

  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&stripe_subscription_id=eq.${encodeURIComponent(syntheticId)}&select=id`,
    { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } }
  )
  const existing = await existingRes.json()

  if (Array.isArray(existing) && existing.length > 0) {
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&stripe_subscription_id=eq.${encodeURIComponent(syntheticId)}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: 'active',
          subscription_source: 'manual_grant',
          plan: 'premium',
          current_period_end: PERIOD_END,
          cancel_at_period_end: false,
        }),
      }
    )
    if (!patchRes.ok) {
      const legacyPatch = await fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&stripe_subscription_id=eq.${encodeURIComponent(syntheticId)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'active',
            current_period_end: PERIOD_END,
            cancel_at_period_end: false,
          }),
        }
      )
      if (!legacyPatch.ok) {
        return { email, ok: false, error: await legacyPatch.text() }
      }
    }
    return { email, ok: true, action: 'updated' }
  }

  let postRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(fullBody),
  })

  if (!postRes.ok) {
    const legacyBody = {
      user_id: userId,
      stripe_subscription_id: syntheticId,
      stripe_customer_id: syntheticId,
      status: 'active',
      current_period_start: now,
      current_period_end: PERIOD_END,
      cancel_at_period_end: false,
    }
    postRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(legacyBody),
    })
    if (!postRes.ok) {
      return { email, ok: false, error: await postRes.text() }
    }
    return { email, ok: true, action: 'created_legacy' }
  }

  return { email, ok: true, action: 'created' }
}

async function main() {
  console.log('Fetching all auth users…')
  const users = await listAllAuthUsers()
  console.log(`Found ${users.length} user(s). Granting permanent premium until ${PERIOD_END}…\n`)

  let ok = 0
  let failed = 0
  for (const user of users) {
    const result = await grantUser(user)
    if (result.ok) {
      ok++
      console.log(`✓ ${result.email} (${result.action})`)
    } else {
      failed++
      console.error(`✗ ${result.email}: ${result.error}`)
    }
  }

  console.log(`\nDone: ${ok} granted, ${failed} failed, ${users.length} total`)
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
