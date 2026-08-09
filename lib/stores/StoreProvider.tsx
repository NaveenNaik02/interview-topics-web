'use client';

import { useEffect, useState } from 'react';
import { createAppStore, StoreContext, type StoreInit } from './appStore';

export default function StoreProvider({
  groups,
  totals,
  children,
}: StoreInit & { children: React.ReactNode }) {
  // useState's lazy initializer, not useRef: constructed exactly once per
  // tree, and readable during render without tripping react-hooks/refs.
  const [store] = useState(() => createAppStore({ groups, totals }));

  // `totals` is deliberately NOT synced after construction — setSectionTotal()
  // refines it as sections mount, and re-seeding from the server value would
  // wipe those refinements. `groups` is: it's a fresh server value on every
  // router.refresh(), which is how a newly added topic/subtopic reaches the
  // tree.
  useEffect(() => {
    store.getState().setGroups(groups);
  }, [store, groups]);

  // Browser-only wiring: these are effects because they read localStorage and
  // register subscriptions, not because of hydration timing.
  useEffect(() => {
    store.getState().initSettingsFromLocalStorage();
  }, [store]);

  useEffect(() => store.getState().initOfflineState(), [store]);

  useEffect(() => store.getState().initAuth(), [store]);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}
