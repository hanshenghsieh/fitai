import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/** Per-request cached Supabase client + auth user (dedupes layout + page fetches). */
export const getAppUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
})

export const getAppProfile = cache(async () => {
  const { supabase, user } = await getAppUser()
  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_completed, created_at')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
})
