'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { AuthoringContext, createAuthoringStore } from './authoringStore';
import type { AuthoringInit } from './types';

type Props = Omit<AuthoringInit, 'groups' | 'defaultPriority'> & {
  children: ReactNode;
};

export const AuthoringProvider = ({ children, ...init }: Props) => {
  const defaultPriority = useAppStore((s) => s.defaultPriority);
  // A freshly-added topic with no subtopics yet has nowhere to attach a
  // question — exclude it from the picker until it has at least one section.
  const groups = useAppStore((s) => s.groups).filter(
    (g) => g.sections.length > 0,
  );

  // useState's lazy initializer, not useRef: constructed exactly once per
  // modal, with the draft already seeded, so the first render is correct.
  const [store] = useState(() => {
    return createAuthoringStore({ ...init, groups, defaultPriority });
  });

  // `groups` is a fresh server value after any router.refresh() — that's how
  // a topic added from inside this modal reaches the pickers.
  useEffect(() => {
    store.getState().setGroups(groups);
  }, [store, groups]);

  return (
    <AuthoringContext.Provider value={store}>
      {children}
    </AuthoringContext.Provider>
  );
};
