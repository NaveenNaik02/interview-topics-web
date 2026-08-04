import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export interface InboxItem {
  id: string;
  text: string;
  createdAt: string;
}

// Read-only. Mutations live in '@/features/inbox/actions' (Server Actions).
export async function fetchInboxItems(userId: string): Promise<InboxItem[]> {
  return fetchInboxItemsWithClient(supabase, userId);
}

// Same read, but callable with a caller-supplied client (e.g. the
// cookie-scoped server client) instead of the browser singleton.
export async function fetchInboxItemsWithClient(
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

// Badge-only read: row count, no text bodies. Used by the global store so
// every page pays for a number instead of every captured item's full text.
export async function fetchInboxCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('inbox_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count ?? 0;
}
