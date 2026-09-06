'use client';

import { useEffect, useState } from 'react';
import { createAppStore, StoreContext, type StoreInit } from './appStore';

export default function StoreProvider({
  children,
  ...init
}: StoreInit & { children: React.ReactNode }) {
  const { groups } = init;

  // useState's lazy initializer, not useRef: constructed exactly once per
  // tree, and readable during render without tripping react-hooks/refs.
  const [store] = useState(() => createAppStore(init));

  // `totals`, the badge counts and `settingsRow` are deliberately NOT synced
  // after construction — setSectionTotal(), the slices' bump/append/remove
  // actions and the settings setters refine them as the user works, and
  // re-seeding from the server value would wipe those refinements. `groups` is: it's a fresh server value
  // on every router.refresh(), which is how a newly added topic/subtopic
  // reaches the tree.
  useEffect(() => {
    store.getState().setGroups(groups);
  }, [store, groups]);

  // Browser-only wiring: these are effects because they read localStorage and
  // register subscriptions, not because of hydration timing.
  useEffect(() => {
    store.getState().hydrateSettings();
  }, [store]);

  useEffect(() => store.getState().initOfflineState(), [store]);

  useEffect(() => store.getState().initAuth(), [store]);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}
