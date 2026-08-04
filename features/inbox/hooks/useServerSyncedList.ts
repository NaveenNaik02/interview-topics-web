import { useState } from 'react';

// Local list state seeded from server props, re-synced to them during
// render (React's "adjust state when a prop changes" pattern) whenever
// they change — used by InboxClient for both its lists, since mutating
// actions call revalidatePath('/inbox') and Next refreshes those props
// after any capture/discard/assign fires from anywhere on the page.
export function useServerSyncedList<T extends { id: string }>(
  serverItems: T[],
) {
  const [items, setItems] = useState(serverItems);
  const [prevServerItems, setPrevServerItems] = useState(serverItems);

  if (serverItems !== prevServerItems) {
    setPrevServerItems(serverItems);
    setItems(serverItems);
  }

  const removeItem = (id: string) =>
    setItems((current) => current.filter((it) => it.id !== id));

  return [items, removeItem] as const;
}
