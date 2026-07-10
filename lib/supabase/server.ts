import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Server-side client scoped to the caller's own session (via cookies), so
// RLS still applies exactly as it does for the browser client — this is
// NOT the service-role client and cannot bypass row level security.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component render — middleware refreshes
            // the session cookie instead, so this is safe to ignore.
          }
        },
      },
    }
  )
}
