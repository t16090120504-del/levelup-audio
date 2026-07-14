import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/user';
import { CONFIG } from '@/constants/config';
import { supabase } from '@/services/supabase-client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  preferences: { genres: string[] };
  /** Mock login — creates a fake user without Supabase (used when USE_MOCK=true). */
  login: (email: string) => void;
  /** Mock logout — clears local state only (used when USE_MOCK=true). */
  logout: () => void;
  /** Supabase sign up — registers a new user via email + password. */
  signUp: (email: string, password: string) => Promise<void>;
  /** Supabase sign in — authenticates an existing user via email + password. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Supabase sign out — ends the session and clears local state. */
  signOut: () => Promise<void>;
  completeOnboarding: (genres: string[]) => void;
  setPreferences: (genres: string[]) => void;
  /** Initialize Supabase auth listener. Call once at app startup. */
  initAuthListener: () => () => void;
}

/**
 * Map a Supabase auth user to the app's User type.
 */
function mapAuthUser(authUser: { id: string; email?: string | null }): User {
  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name: authUser.email?.split('@')[0] ?? 'User',
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      preferences: { genres: [] },

      // ---- Mock auth (fallback when USE_MOCK=true) ----

      login: (email) => {
        if (!CONFIG.USE_MOCK) {
          console.warn(
            'login() is a mock method. Use signIn() for Supabase auth.',
          );
          return;
        }
        const user: User = {
          id: crypto.randomUUID(),
          email,
          name: email.split('@')[0],
        };
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        if (!CONFIG.USE_MOCK) {
          console.warn(
            'logout() is a mock method. Use signOut() for Supabase auth.',
          );
          return;
        }
        set({ user: null, isAuthenticated: false });
      },

      // ---- Supabase auth ----

      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // After sign-up, the auth listener will update the store if auto-confirmed
      },

      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // The auth listener will update the store
      },

      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        set({ user: null, isAuthenticated: false });
      },

      // ---- Onboarding & preferences ----

      completeOnboarding: (genres) => {
        set({ hasCompletedOnboarding: true, preferences: { genres } });
      },

      setPreferences: (genres) => {
        set({ preferences: { genres } });
      },

      // ---- Auth state listener ----

      initAuthListener: () => {
        // Sync initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            set({
              user: mapAuthUser(session.user),
              isAuthenticated: true,
            });
          }
        });

        // Listen for auth state changes (sign in, sign out, token refresh)
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            set({
              user: mapAuthUser(session.user),
              isAuthenticated: true,
            });
          } else {
            set({ user: null, isAuthenticated: false });
          }
        });

        // Return unsubscribe function
        return () => subscription.unsubscribe();
      },
    }),
    {
      name: 'levelup-auth',
    },
  ),
);
