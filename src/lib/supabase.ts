import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The server connection, when there is one.
 *
 * The app has worked offline since the first commit and must keep working that
 * way: no account, no network, everything in localStorage. So this returns null
 * rather than throwing when the keys are absent, and every caller treats a null
 * client as "stay local". That keeps one build able to run both modes while the
 * backend is half-built, instead of branching the codebase.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

if (url && anonKey) {
  client = createClient(url, anonKey, {
    auth: {
      // The app runs in a WKWebView on iOS, where the default detection of an
      // OAuth redirect in the URL bar does nothing useful.
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

/** The client, or null when this build has no server configured. */
export function supabase(): SupabaseClient | null {
  return client
}

/** True when this build can talk to a server at all. */
export function hasServer(): boolean {
  return client !== null
}
