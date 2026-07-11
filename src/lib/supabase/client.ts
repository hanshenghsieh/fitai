import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const isIosLocalBuild = process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios-local'

export function createClient() {
  // Capacitor WKWebView: use localStorage session storage; skip URL hash session detection.
  if (isIosLocalBuild) {
    return createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
