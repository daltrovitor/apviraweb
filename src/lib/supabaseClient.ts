import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create the client only on the browser to avoid server-side runtime errors
export const supabase: SupabaseClient | null =
  typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

if (typeof window !== 'undefined' && (process.env.NODE_ENV !== 'production') && (!supabaseUrl || !supabaseAnonKey)) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Check your .env and restart dev server.')
}

// Patch global fetch in the browser to ensure requests to Supabase REST API
// include the anon key and a safe Accept header to avoid PostgREST 406 errors
if (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey) {
  try {
    const originalFetch = window.fetch.bind(window)
    // @ts-ignore
    window.fetch = async (input: RequestInfo, init?: RequestInit) => {
      try {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
        if (url && url.startsWith(supabaseUrl)) {
          const headers = new Headers(init?.headers || {})
          if (!headers.has('apikey')) headers.set('apikey', supabaseAnonKey)
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${supabaseAnonKey}`)
          // Force a generic JSON Accept to avoid PostgREST returning 406
          headers.set('Accept', 'application/json')
          const newInit: RequestInit = { ...(init || {}), headers }
          return originalFetch(input, newInit)
        }
      } catch (e) {
        // ignore and fallback to original fetch
      }
      return originalFetch(input, init)
    }
  } catch (e) {
    // ignore
  }
}
