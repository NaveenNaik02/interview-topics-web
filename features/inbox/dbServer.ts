import 'server-only';
import { createClient } from '@/lib/supabase/server';
import {
  fetchSetAsideItemsWithClient,
  type SetAsideItem,
} from '@/lib/db/setAside';
import { fetchInboxItemsWithClient, type InboxItem } from '@/features/inbox/db';

// Server-only: resolves the caller's own cookie-scoped client + user, so
// the Inbox page can seed both its lists without touching Supabase directly.
// Split out of db.ts because that file is also imported by the client-side
// Zustand store, and this one pulls in next/headers.
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
