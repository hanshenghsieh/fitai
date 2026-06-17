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
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY')
  process.exit(1)
}

// Get the most recent user from auth (or use a hardcoded ID)
// For now we'll just try to insert and let Supabase handle it

// Create a minimal test plan
const testPlan = {
  week_number: 1,
  weekly_targets: {
    avg_daily_calories: 2000,
    avg_daily_protein_g: 150,
    workout_days: 5,
  },
  days: Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    date: new Date(new Date().getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    meals: [
      {
        type: 'breakfast',
        type_zh: '早餐',
        items: [{ id: '1', name: 'Eggs', name_zh: '蛋', calories: 150, protein_g: 12, carbs_g: 1, fat_g: 11, portion: '2 eggs', preparation: 'Scrambled' }],
        total_calories: 150,
      },
      {
        type: 'lunch',
        type_zh: '午餐',
        items: [{ id: '2', name: 'Chicken', name_zh: '雞肉', calories: 300, protein_g: 50, carbs_g: 0, fat_g: 7, portion: '150g', preparation: 'Grilled' }],
        total_calories: 300,
      },
      {
        type: 'dinner',
        type_zh: '晚餐',
        items: [{ id: '3', name: 'Rice', name_zh: '米飯', calories: 200, protein_g: 5, carbs_g: 45, fat_g: 0, portion: '1 bowl', preparation: 'Cooked' }],
        total_calories: 200,
      },
    ],
    workout: {
      type: i % 2 === 0 ? 'strength' : 'cardio',
      type_zh: i % 2 === 0 ? '重訓' : '有氧',
      warmup: [{ exercise_id: '1', exercise_name: 'Warm up', exercise_name_zh: '暖身', youtube_id: null, sets: 1, reps: 10, duration_secs: null, rest_secs: 60, notes: '' }],
      main: [{ exercise_id: '2', exercise_name: 'Push ups', exercise_name_zh: '伏地挺身', youtube_id: null, sets: 3, reps: 15, duration_secs: null, rest_secs: 60, notes: '' }],
      cooldown: [{ exercise_id: '3', exercise_name: 'Stretch', exercise_name_zh: '伸展', youtube_id: null, sets: 1, reps: null, duration_secs: 300, rest_secs: 0, notes: '' }],
      estimated_duration_mins: 45,
      calories_burned_est: 300,
    },
    daily_targets: { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 60, water_ml: 2500 },
  })),
  grocery_list: [
    { category: '蛋白質', items: ['雞肉', '蛋'] },
    { category: '碳水', items: ['米飯', '麵包'] },
  ],
  coach_note: '這是測試計畫。請根據你的身體反應調整。',
}

async function createTestPlan() {
  try {
    // Use the known user ID (the one we created during onboarding)
    const userId = '5556336f-1b58-464f-ae42-310338f7c267'
    console.log(`Using user: ${userId}`)

    // Get or create weekly plan
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    console.log(`Creating test plan for user ${userId}, week starting ${weekStartStr}...`)

    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/weekly_plans`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        week_start: weekStartStr,
        week_number: 1,
        plan_data: testPlan,
        coach_note: testPlan.coach_note,
        generation_status: 'completed',
      }),
    })

    if (upsertRes.ok) {
      console.log('✅ Test plan created successfully!')
      console.log('Go to http://localhost:3000/dashboard and refresh to see the plan.')
    } else {
      const err = await upsertRes.text()
      console.error('❌ Error creating plan:', err)
    }
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

createTestPlan()
