'use client';

import { createContext, useContext, useMemo } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createDraftSlice } from './draftSlice';
import { createPlacementSlice, derivePlacement } from './placementSlice';
import { createAiSlice } from './aiSlice';
import { createAutoRunSlice } from './autoRunSlice';
import type { AuthoringInit, AuthoringState } from './types';

// One store per open modal, not a module singleton — same reasoning as
// createAppStore, plus two more that matter here: the state dies with the
// modal (so no open can inherit the previous one's draft), and two modals
// could be mounted at once without sharing a title field.
export const createAuthoringStore = (init: AuthoringInit) => {
  return createStore<AuthoringState>()((...a) => ({
    ...createDraftSlice(init)(...a),
    ...createPlacementSlice(init)(...a),
    ...createAiSlice(...a),
    ...createAutoRunSlice(init)(...a),
    heading: init.heading,
    footNote: init.footNote,
    submitLabel: init.submitLabel,
    original: init.original,
    excludeQuestionId: init.excludeQuestionId,
    onSubmit: init.onSubmit,
    onClose: init.onClose,
    onDiscard: init.onDiscard,
  }));
};

export type AuthoringStoreApi = ReturnType<typeof createAuthoringStore>;

export const AuthoringContext = createContext<AuthoringStoreApi | null>(null);

/** Imperative handle — getState/subscribe outside of render. */
export const useAuthoringApi = (): AuthoringStoreApi => {
  const store = useContext(AuthoringContext);
  if (!store)
    throw new Error('useAuthoring must be used within an AuthoringProvider');
  return store;
};

export const useAuthoring = <T>(selector: (s: AuthoringState) => T): T => {
  return useStore(useAuthoringApi(), selector);
};

// The placement view is rebuilt from four raw values rather than stored, so
// it can't drift. Memoised because it returns fresh arrays every call, which
// would otherwise re-render on every unrelated store change.
export const usePlacementView = () => {
  const groups = useAuthoring((s) => s.groups);
  const groupSlug = useAuthoring((s) => s.groupSlug);
  const sectionK = useAuthoring((s) => s.sectionK);
  const pending = useAuthoring((s) => s.pending);
  return useMemo(
    () => derivePlacement(groups, groupSlug, sectionK, pending),
    [groups, groupSlug, sectionK, pending],
  );
};
