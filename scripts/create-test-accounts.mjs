/**
 * 建立 10 組測試帳號並完成 onboarding + 計畫生成
 * 用法: node scripts/create-test-accounts.mjs
 * 需要 .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 可選: QA_BASE_URL (預設 production), CRON_SECRET (加速 generate-plan)
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { format, addMonths } from 'date-fns'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#\s=][^=]*)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BASE = env.QA_BASE_URL || 'https://fitai-taupe-sigma.vercel.app'
const CRON_SECRET = env.CRON_SECRET
const PASSWORD = 'BetterBit2026!'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY in .env.local')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${SERVICE_KEY}`,
  apikey: SERVICE_KEY,
  'Content-Type': 'application/json',
}

const PERSONAS = [
  { email: 'test01@betterbit.test', name: '上班族小明', gender: 'male', age: 32, height: 175, weight: 78, bf: 22, goal: 'lose_fat', target: 72, activity: 'moderate', fitness: 'beginner', schedule: 'standard' },
  { email: 'test02@betterbit.test', name: '夜班護理師', gender: 'female', age: 28, height: 162, weight: 58, bf: 28, goal: 'lose_fat', target: 54, activity: 'active', fitness: 'intermediate', schedule: 'night_shift' },
  { email: 'test03@betterbit.test', name: '二寶媽媽', gender: 'female', age: 35, height: 158, weight: 62, bf: 30, goal: 'lose_fat', target: 56, activity: 'light', fitness: 'beginner', schedule: 'standard' },
  { email: 'test04@betterbit.test', name: '女大生', gender: 'female', age: 20, height: 165, weight: 55, bf: 25, goal: 'lose_fat', target: 50, activity: 'moderate', fitness: 'beginner', schedule: 'standard' },
  { email: 'test05@betterbit.test', name: '工程師阿哲', gender: 'male', age: 29, height: 172, weight: 82, bf: 24, goal: 'lose_fat', target: 75, activity: 'sedentary', fitness: 'beginner', schedule: 'standard' },
  { email: 'test06@betterbit.test', name: '業務老王', gender: 'male', age: 40, height: 178, weight: 85, bf: 26, goal: 'lose_fat', target: 78, activity: 'very_active', fitness: 'intermediate', schedule: 'standard' },
  { email: 'test07@betterbit.test', name: '產後媽咪', gender: 'female', age: 31, height: 160, weight: 65, bf: 32, goal: 'lose_fat', target: 58, activity: 'light', fitness: 'beginner', schedule: 'standard' },
  { email: 'test08@betterbit.test', name: '模糊目標族', gender: 'male', age: 45, height: 170, weight: 75, bf: null, goal: 'maintain', target: 75, activity: 'moderate', fitness: 'beginner', schedule: 'standard' },
  { email: 'test09@betterbit.test', name: '輪班護士', gender: 'female', age: 26, height: 163, weight: 56, bf: 27, goal: 'lose_fat', target: 52, activity: 'active', fitness: 'intermediate', schedule: 'alternating' },
  { email: 'test10@betterbit.test', name: '試用到期測', gender: 'male', age: 33, height: 176, weight: 80, bf: 23, goal: 'lose_fat', target: 74, activity: 'moderate', fitness: 'beginner', schedule: 'standard' },
]

async function createOrGetUser(email, displayName) {
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  })
  const listData = await listRes.json()
  if (listData.users?.length) {
    return { id: listData.users[0].id, created: false }
  }

  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    }),
  })
  const userData = await signupRes.json()
  if (!userData.id) throw new Error(`Create user failed ${email}: ${JSON.stringify(userData)}`)
  return { id: userData.id, created: true }
}

async function upsertProfile(userId, p) {
  const body = {
    id: userId,
    display_name: p.name,
    gender: p.gender,
    age: p.age,
    height_cm: p.height,
    weight_kg: p.weight,
    body_fat_pct: p.bf,
    activity_level: p.activity,
    fitness_level: p.fitness,
    is_vegetarian: false,
    is_vegan: false,
    allergens: [],
    disliked_foods: [],
    food_budget: 'medium',
    injuries: [],
    equipment: ['none'],
    onboarding_completed: true,
    water_ml_target: Math.round(p.weight * 35),
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
    if (!patchRes.ok) throw new Error(`Profile failed ${p.email}: ${await patchRes.text()}`)
  }
}

async function insertGoal(userId, p) {
  await fetch(`${SUPABASE_URL}/rest/v1/goals?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers,
  })
  const res = await fetch(`${SUPABASE_URL}/rest/v1/goals`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_id: userId,
      goal_type: p.goal,
      target_weight_kg: p.target,
      target_body_fat_pct: p.bf ? p.bf - 5 : null,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      start_weight_kg: p.weight,
      start_body_fat_pct: p.bf,
      is_active: true,
    }),
  })
  if (!res.ok) throw new Error(`Goal failed ${p.email}: ${await res.text()}`)
}

async function generatePlan(userId) {
  if (CRON_SECRET) {
    const res = await fetch(`${BASE}/api/generate-plan`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        'x-user-id': userId,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) return { ok: true, via: 'cron' }
    console.warn(`  cron generate-plan failed, trying password auth: ${data.error || res.status}`)
  }

  if (!ANON_KEY) throw new Error('Need ANON_KEY for password auth generate-plan')

  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PERSONAS.find(x => x.email)?.email, password: PASSWORD }),
  })
  // sign in per user below
  return { ok: false, via: 'pending' }
}

async function generatePlanForUser(email, userId) {
  if (CRON_SECRET) {
    const res = await fetch(`${BASE}/api/generate-plan`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        'x-user-id': userId,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    if (res.ok) return 'cron'
  }

  if (!ANON_KEY) throw new Error('Need ANON_KEY')

  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error(`Login failed ${email}: ${JSON.stringify(tokenData)}`)

  const res = await fetch(`${BASE}/api/generate-plan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`generate-plan ${email}: ${data.error || res.status}`)
  return 'session'
}

async function seedCheckin(userId, schedule) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/daily_checkins`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      checkin_date: today,
      diet_items: [
        { meal_id: 'breakfast', completed: false },
        { meal_id: 'lunch', completed: false },
        { meal_id: 'dinner', completed: false },
      ],
      workout_items: [],
      water_ml: 0,
      notes: JSON.stringify({
        user_memory: { work_schedule: schedule },
      }),
    }),
  })
  if (!res.ok) {
    await fetch(`${SUPABASE_URL}/rest/v1/daily_checkins?user_id=eq.${userId}&checkin_date=eq.${today}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        notes: JSON.stringify({ user_memory: { work_schedule: schedule } }),
      }),
    })
  }
}

async function main() {
  const results = []
  console.log(`Creating ${PERSONAS.length} test accounts → ${BASE}\n`)

  for (const p of PERSONAS) {
    try {
      const { id, created } = await createOrGetUser(p.email, p.name)
      await upsertProfile(id, p)
      await insertGoal(id, p)
      const via = await generatePlanForUser(p.email, id)
      await seedCheckin(id, p.schedule)
      results.push({ email: p.email, password: PASSWORD, userId: id, schedule: p.schedule, created, planVia: via, status: 'OK' })
      console.log(`✅ ${p.email} (${created ? 'new' : 'exists'}) plan via ${via}`)
    } catch (err) {
      results.push({ email: p.email, password: PASSWORD, status: 'FAIL', error: err.message })
      console.error(`❌ ${p.email}: ${err.message}`)
    }
  }

  const outPath = join(__dirname, 'test-accounts.json')
  writeFileSync(outPath, JSON.stringify({ password: PASSWORD, baseUrl: BASE, accounts: results }, null, 2))
  console.log(`\nSaved ${outPath}`)
  const ok = results.filter(r => r.status === 'OK').length
  console.log(`Done: ${ok}/${PERSONAS.length} OK`)
  process.exit(ok === PERSONAS.length ? 0 : 1)
}

main()
