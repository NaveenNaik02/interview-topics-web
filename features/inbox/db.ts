import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@/lib/supabase/server';
import {
  fetchSetAsideItemsWithClient,
  type SetAsideItem,
} from '@/lib/db/setAside';

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

// Server-only: resolves the caller's own cookie-scoped client + user, so
// the Inbox page can seed both its lists without touching Supabase directly.
export async function fetchInitialInboxPageData(): Promise<{
  inboxItems: InboxItem[];
  setAsideItems: SetAsideItem[];
}> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { inboxItems: [], setAsideItems: [] };

  const [inboxItems, setAsideItems] = await Promise.all([
    fetchInboxItemsWithClient(client, user.id),
    fetchSetAsideItemsWithClient(client, user.id),
  ]);
  return { inboxItems, setAsideItems };
}
