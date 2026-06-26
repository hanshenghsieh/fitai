#!/usr/bin/env npx tsx
/**
 * Daily Unknown Food Auto Apply — cron entrypoint.
 * Usage: npm run unknown:auto-apply
 */
import { runDailyUnknownRematchJob } from '@/lib/nutrition/unknown-food-resolution/daily-rematch-job'
import { getFounderAutoApplyDashboard } from '@/lib/nutrition/unknown-food-resolution/founder-dashboard'
import { listUnknownQueue } from '@/lib/nutrition/search-v2/unknown-queue'
import type { FoodLogEntry } from '@/lib/banks/types'

function demoLogsFromQueue(): FoodLogEntry[] {
  return listUnknownQueue('waiting').map((e, i) => ({
    id: `demo-log-${i}-${e.id}`,
    name: e.food_name,
    store: e.restaurant ?? undefined,
    calories: null,
    protein_g: null,
    logged_at: new Date().toISOString(),
    user_declared: true,
    source: 'free_text',
    nutrition_status: 'unknown',
    capture_status: 'photo_only',
  }))
}

function main() {
  const food_logs = demoLogsFromQueue()
  const result = runDailyUnknownRematchJob({ food_logs })

  console.log('=== BetterBit Unknown Food Auto Apply ===')
  console.log(`Scanned: ${result.scanned}`)
  console.log(`Applied: ${result.applied}`)
  console.log(`Pending review: ${result.pending_review}`)
  console.log(`Skipped: ${result.skipped}`)
  console.log(`Audits written: ${result.audits.length}`)

  if (result.updated_logs.length) {
    console.log('\nUpdated logs:')
    for (const log of result.updated_logs) {
      console.log(`- ${log.name} → ${log.calories} kcal (${log.nutrition_status})`)
      if (log.resolution_note) console.log(`  note: ${log.resolution_note}`)
    }
  }

  const dash = getFounderAutoApplyDashboard([...food_logs, ...result.updated_logs])
  console.log('\nFounder dashboard snapshot:')
  console.log(JSON.stringify(dash.auto_apply, null, 2))
}

main()
