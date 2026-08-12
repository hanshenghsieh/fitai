import type { SupabaseClient } from '@supabase/supabase-js'
import { getTaipeiDateKey } from '@/lib/timezone'
import { sanitizeAnalyticsProperties, type AnalyticsEventInput } from './events'

export interface TrackServerOptions {
  /** Must be the service-role admin client — analytics_events has no client-writable RLS policy. */
  supabase: SupabaseClient
  userId: string
  platform?: string | null
  occurredAt?: Date
}

/** Canonical server-side event write path — API routes and webhooks call this, never the raw table. */
export async function trackServer(event: AnalyticsEventInput, options: TrackServerOptions): Promise<void> {
  const occurredAt = options.occurredAt ?? new Date()
  const properties = sanitizeAnalyticsProperties(
    event.name,
    event.properties as Record<string, unknown>
  )

  const { error } = await options.supabase.from('analytics_events').insert({
    event_name: event.name,
    user_id: options.userId,
    properties,
    platform: options.platform ?? null,
    occurred_at: occurredAt.toISOString(),
    taipei_date: getTaipeiDateKey(occurredAt),
  })

  if (error) {
    console.error('[analytics] trackServer insert failed', {
      event: event.name,
      message: error.message,
    })
  }
}

/**
 * Records first_meal_logged at most once per user — required by TASK 2
 * ("不要因為重新安裝或重新 render 重複觸發"). Check-then-insert, with
 * idx_analytics_events_first_meal_once (a unique partial index) as the race
 * safety net: if two calls race past the check, the loser's insert violates
 * the unique index (Postgres error 23505) and is swallowed, leaving exactly
 * one row — the "at most once" invariant holds at the data layer regardless
 * of the race outcome.
 */
export async function recordFirstMealLoggedOnce(options: TrackServerOptions): Promise<boolean> {
  const { data: existing } = await options.supabase
    .from('analytics_events')
    .select('id')
    .eq('user_id', options.userId)
    .eq('event_name', 'first_meal_logged')
    .maybeSingle()

  if (existing) return false

  const occurredAt = options.occurredAt ?? new Date()
  const { error } = await options.supabase.from('analytics_events').insert({
    event_name: 'first_meal_logged',
    user_id: options.userId,
    properties: {},
    platform: options.platform ?? null,
    occurred_at: occurredAt.toISOString(),
    taipei_date: getTaipeiDateKey(occurredAt),
  })

  if (!error) return true
  if (error.code === '23505') return false
  console.error('[analytics] recordFirstMealLoggedOnce insert failed', { message: error.message })
  return false
}
