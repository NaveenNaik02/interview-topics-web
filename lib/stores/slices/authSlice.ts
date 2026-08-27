import type { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { AppState, AuthSlice } from '../types';

// Equivalent of the old loadedUserIdRef: a useRef persisted for the
// component's lifetime without causing re-renders. A module-level variable
// in this singleton store module gives the same guarantee for the page's
// lifetime — it must never be read via a selector, only checked-and-set here.
let loadedUserId: string | null = null;

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (
  set,
  get,
) => ({
  user: null,

  signInWithGitHub: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    });
    if (error) console.error('GitHub sign-in failed:', error.message);
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  initAuth: () => {
    // onAuthStateChange fires immediately on subscribe with the current
    // session (event INITIAL_SESSION), so a separate getSession() call would
    // just race it and double every load — this listener alone covers both
    // the initial state and subsequent sign-in/out transitions.
    const loadUserData = (uid: string) => {
      if (loadedUserId === uid) return;
      loadedUserId = uid;
      get().loadProgress(uid);
      get().loadSettings(uid);
      get().loadInboxCount(uid);
      get().loadSetAsideCount(uid);
      get().loadFlagCounts(uid);
      get().loadQuestionOrder(uid);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        set({ user: session.user });
        loadUserData(session.user.id);
        if (event === 'SIGNED_IN' && window.location.hash) {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search,
          );
        }
      } else {
        // No session — a signed-out visitor stays `user: null`, same in dev
        // and prod. The login-gate redirect (lib/supabase/middleware.ts)
        // sends them to /login before any page/store code runs.
        loadedUserId = null;
        set({
          user: null,
          store: {},
          inboxCount: 0,
          setAsideCount: 0,
          flagCounts: { starred: 0, grey_zone: 0 },
        });
      }
    });

    return () => subscription.unsubscribe();
  },
});
