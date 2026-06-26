import { createAdminClient } from '@/lib/supabase/server'

export function getGrowthSupabase() {
  return createAdminClient()
}
