import type { SupabaseClient } from '@supabase/supabase-js';

export interface InboxItem {
  id: string;
  text: string;
  createdAt: string;
}

// Read-only. Mutations live in '@/features/inbox/actions' (Server Actions).
export async function fetchInboxItems(
  client: SupabaseClient,
  userId: string,
): Promise<InboxItem[]> {
  const { data } = await client
    .from('inbox_items')
    .select('id, text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    text: r.text,
    createdAt: r.created_at,
  }));
}
