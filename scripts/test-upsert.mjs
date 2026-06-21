import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { syncCalorieBankRow } from '../src/lib/engines/calorie-bank-engine.ts'
import { upsertCalorieBankRow } from '../src/lib/banks/calorie-bank-store.ts'

const env = readFileSync('.env.local', 'utf8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()
const sb = createClient(url, key)

const row = syncCalorieBankRow({
  userId: '00000000-0000-4000-8000-000000000001',
  date: '2099-01-01',
  normalTargetKcal: 1700,
  calorieFloor: 1500,
  actualKcal: 3200,
  previousRow: null,
  existingToday: null,
})

const result = await upsertCalorieBankRow(sb, row)
console.log(
  JSON.stringify({
    persisted: result.persisted,
    recovery: result.recovery_balance_kcal,
    spread: result.spread_days_remaining,
    internal: result.internal_target_kcal,
  })
)

const check = await fetch(`${url}/rest/v1/calorie_bank?select=id&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
console.log('TABLE_CHECK', check.status, await check.text())
