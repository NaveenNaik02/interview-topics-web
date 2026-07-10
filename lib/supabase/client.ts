import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Support both naming conventions for better compatibility across environments
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
    console.warn('Supabase credentials missing. Check your environment variables.')
  }
}

// Cookie-based browser client (shares the session with server actions/middleware
// via cookies, instead of the old localStorage-only session).
export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)
