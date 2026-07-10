import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// True when pointed at the local `supabase start` Docker stack rather than
// the hosted project — lets local-only dev conveniences (e.g. skipping
// GitHub sign-in to add a question) stay off in production.
export function isLocalSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.includes('127.0.0.1') || url.includes('localhost')
}
