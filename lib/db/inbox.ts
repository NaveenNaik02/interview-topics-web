import { supabase } from '@/lib/supabase/client'

export interface InboxItem {
  id: string
  text: string
  createdAt: string
}

// Read-only. Mutations live in '@/lib/actions/inbox' (Server Actions).
export async function fetchInboxItems(userId: string): Promise<InboxItem[]> {
  const { data } = await supabase
    .from('inbox_items')
    .select('id, text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(r => ({ id: r.id, text: r.text, createdAt: r.created_at }))
}
