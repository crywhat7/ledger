import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionData } from "@/lib/auth";
import {
  getStoredSession,
  setStoredSession,
  clearStoredSession,
  getStoredUsername,
  setStoredUsername,
} from "@/lib/auth";

interface SessionState {
  session: SessionData | null;
  usernameInput: string | null;
  hydrate: () => void;
  setSession: (session: SessionData | null) => void;
  setUsernameInput: (username: string | null) => void;
  login: (session: SessionData) => void;
  logout: () => void;
  /** Persist username for identity step (before PIN) */
  rememberUsername: (username: string) => void;
  /** Get last username used (for returning users) */
  getLastUsername: () => string | null;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      session: null,
      usernameInput: null,

      hydrate: () => {
        const stored = getStoredSession();
        if (stored) set({ session: stored });
        const lastUser = getStoredUsername();
        if (lastUser) set({ usernameInput: lastUser });
      },

      setSession: (session) => {
        set({ session });
        if (session) setStoredSession(session);
        else clearStoredSession();
      },

      setUsernameInput: (usernameInput) => set({ usernameInput }),

      login: (session) => {
        set({ session });
        setStoredSession(session);
        setStoredUsername(session.username);
      },

      logout: () => {
        set({ session: null });
        clearStoredSession();
      },

      rememberUsername: (username) => {
        setStoredUsername(username);
        set({ usernameInput: username });
      },

      getLastUsername: () => getStoredUsername(),
    }),
    { name: "ledger-session", partialize: (s) => ({ usernameInput: s.usernameInput }) }
  )
);
