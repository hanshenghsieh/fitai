/**
 * Apple App Review demo account — full premium access without Stripe.
 * Usage: node scripts/create-apple-review-account.mjs
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { format, addYears } from 'date-fns'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#\s=][^=]*)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = 'apple-review@betterbit.tw'
const PASSWORD = 'BetterBit2026!'
const DISPLAY_NAME = 'Apple Review'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  'Content-Type': 'application/json',
}

async function findUserByEmail(email) {
  let page = 1
  while (page <= 20) {
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    })
    const listData = await listRes.json()
    const users = listData.users ?? []
    const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (users.length < 100) break
    page++
  }
  return null
}

async function createOrGetUser() {
  const existing = await findUserByEmail(EMAIL)
  if (existing) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
    })
    if (!res.ok) throw new Error(`Password reset failed: ${await res.text()}`)
    return existing.id
  }

  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: DISPLAY_NAME },
    }),
  })
  const userData = await signupRes.json()
  if (!userData.id) throw new Error(`Create user failed: ${JSON.stringify(userData)}`)
  return userData.id
}

async function upsertProfile(userId) {
  const body = {
    id: userId,
    display_name: DISPLAY_NAME,
    gender: 'female',
    age: 30,
    height_cm: 165,
    weight_kg: 60,
    body_fat_pct: 28,
    activity_level: 'moderate',
    fitness_level: 'beginner',
    is_vegetarian: false,
    is_vegan: false,
    allergens: [],
    disliked_foods: [],
    food_budget: 'medium',
    injuries: [],
    equipment: ['none'],
    onboarding_completed: true,
    water_ml_target: 2100,
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })
    if (!patchRes.ok) throw new Error(`Profile failed: ${await patchRes.text()}`)
  }
}

async function upsertReviewSubscription(userId) {
  await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers,
  })

  const now = new Date()
  const periodEnd = addYears(now, 10)
  const syntheticId = `apple_review_demo_${userId}`

  const fullBody = {
    user_id: userId,
    stripe_subscription_id: syntheticId,
    stripe_customer_id: syntheticId,
    status: 'active',
    subscription_source: 'apple_review_demo',
    plan: 'review_demo',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
  }

  let res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(fullBody),
  })

  if (!res.ok) {
    const legacyBody = {
      user_id: userId,
      stripe_subscription_id: syntheticId,
      stripe_customer_id: syntheticId,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
    }
    res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(legacyBody),
    })
    if (!res.ok) {
      console.warn(`⚠ Subscription row not inserted: ${await res.text()}`)
      console.warn('  Premium still works via email bypass in app code.')
      return 'email_only'
    }
    return 'legacy'
  }
  return 'full'
}

async function main() {
  console.log(`Setting up Apple Review account: ${EMAIL}`)
  const userId = await createOrGetUser()
  await upsertProfile(userId)
  const subMode = await upsertReviewSubscription(userId)
  console.log('✅ Done')
  console.log(`   Email: ${EMAIL}`)
  console.log(`   Password: ${PASSWORD}`)
  console.log(`   User ID: ${userId}`)
  console.log(`   Subscription mode: ${subMode}`)
  if (subMode === 'email_only') {
    console.log('   Premium: enabled via apple-review email bypass (run DB migration for persistent row)')
  } else {
    console.log(`   plan: review_demo`)
    console.log(`   subscription_source: apple_review_demo`)
    console.log(`   status: active`)
  }
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
