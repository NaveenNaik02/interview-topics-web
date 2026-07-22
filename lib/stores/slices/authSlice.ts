import type { StateCreator } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { DEV_USER } from '@/lib/devUser'
import type { AppState, AuthSlice } from '../types'

// Equivalent of the old loadedUserIdRef: a useRef persisted for the
// component's lifetime without causing re-renders. A module-level variable
// in this singleton store module gives the same guarantee for the page's
// lifetime — it must never be read via a selector, only checked-and-set here.
let loadedUserId: string | null = null

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  user: null,

  signInWithGitHub: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    })
    if (error) console.error('GitHub sign-in failed:', error.message)
  },

  signOut: async () => {
    await supabase.auth.signOut()
  },

  initAuth: () => {
    // onAuthStateChange fires immediately on subscribe with the current
    // session (event INITIAL_SESSION), so a separate getSession() call would
    // just race it and double every load — this listener alone covers both
    // the initial state and subsequent sign-in/out transitions.
    let bootstrapping = false
    const isDev = process.env.NODE_ENV !== 'production'
    const signInDevUser = () => {
      supabase.auth.signInWithPassword(DEV_USER).then(({ error }) => {
        if (error) supabase.auth.signUp(DEV_USER)
      })
    }

    const loadUserData = (uid: string) => {
      if (loadedUserId === uid) return
      loadedUserId = uid
      get().loadProgress(uid)
      get().loadPriority(uid)
      get().loadSettings(uid)
      get().loadInbox(uid)
      get().loadSetAside(uid)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (isDev && session.user.is_anonymous && !bootstrapping) {
          // A pre-existing anonymous session (e.g. from before dev switched
          // to a seeded user) — swap it for DEV_USER instead of keeping it,
          // so authoring checks behave the same as prod.
          bootstrapping = true
          signInDevUser()
          return
        }
        set({ user: session.user })
        loadUserData(session.user.id)
        if (event === 'SIGNED_IN' && window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      } else if (!bootstrapping) {
        // No session yet on first load. Signing in triggers this same
        // listener again with the new session, which is where
        // user/loadUserData actually run. In dev, sign in as the seeded
        // DEV_USER instead of anonymously so authoring checks (which key off
        // user.is_anonymous) behave the same as prod without any env
        // branching in the actions themselves.
        bootstrapping = true
        if (isDev) {
          signInDevUser()
        } else {
          supabase.auth.signInAnonymously()
        }
      } else {
        loadedUserId = null
        set({ user: null, store: {}, priorityStore: {}, inboxItems: [], setAsideItems: [] })
      }
    })

    return () => subscription.unsubscribe()
  },
})
