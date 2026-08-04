import 'server-only';
import { getUser } from '@/lib/supabase/user';
import {
  fetchSetAsideItemsWithClient,
  type SetAsideItem,
} from '@/lib/db/setAside';
import { fetchInboxItemsWithClient, type InboxItem } from '@/features/inbox/db';

// Server-only: seeds the Inbox page's both lists without touching Supabase
// directly. Split out of db.ts because that file is also imported by the
// client-side Zustand store, and this one pulls in next/headers.
export async function fetchInitialInboxPageData(): Promise<{
  inboxItems: InboxItem[];
  setAsideItems: SetAsideItem[];
}> {
  const { supabase: client, user } = await getUser();
  if (!user) return { inboxItems: [], setAsideItems: [] };

  const [inboxItems, setAsideItems] = await Promise.all([
    fetchInboxItemsWithClient(client, user.id),
    fetchSetAsideItemsWithClient(client, user.id),
  ]);
  return { inboxItems, setAsideItems };
}
