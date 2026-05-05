import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // During build time on CI, these might be missing if not passed correctly.
  // We throw a clear error to help debugging.
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
     console.warn('Supabase credentials missing. Data fetching will fail.')
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)
