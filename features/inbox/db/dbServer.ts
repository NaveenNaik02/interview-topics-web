import 'server-only';
import { getUser } from '@/lib/supabase/user';
import { fetchSetAsideItems, type SetAsideItem } from '@/lib/db/setAside';
import { fetchInboxItems, type InboxItem } from '@/features/inbox/db/db';

// Server-only: seeds the Inbox page's both lists without touching Supabase
// directly. Split out of db.ts because this one pulls in next/headers (via
// getUser) while db.ts stays client-importable for its types.
export async function fetchInitialInboxPageData(): Promise<{
  inboxItems: InboxItem[];
  setAsideItems: SetAsideItem[];
}> {
  const { supabase: client, user } = await getUser();
  if (!user) return { inboxItems: [], setAsideItems: [] };

  const [inboxItems, setAsideItems] = await Promise.all([
    fetchInboxItems(client, user.id),
    fetchSetAsideItems(client, user.id),
  ]);
  return { inboxItems, setAsideItems };
}
