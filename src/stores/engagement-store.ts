import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CONFIG } from '@/constants/config';

/**
 * Lightweight engagement tracking for non-authenticated visitors.
 *
 * Counts episodes played so the app can surface a "sign up to save your
 * progress" prompt at the right moment (after the threshold is reached).
 * Persisted to localStorage so the count survives reloads.
 */
interface EngagementState {
  /** Total episodes started by this (anonymous) visitor. */
  episodesPlayed: number;
  /** Whether the user has dismissed the signup prompt. */
  signupPromptDismissed: boolean;

  /** Increment the episodes-played counter (called on each episode play). */
  incrementEpisodesPlayed: () => void;
  /** Mark the signup prompt as dismissed. */
  dismissSignupPrompt: () => void;
  /** Whether the signup prompt should currently be shown. */
  shouldShowSignupPrompt: (isAuthenticated: boolean) => boolean;
  /** Reset engagement (e.g. after the user signs up). */
  reset: () => void;
}

export const useEngagementStore = create<EngagementState>()(
  persist(
    (set, get) => ({
      episodesPlayed: 0,
      signupPromptDismissed: false,

      incrementEpisodesPlayed: () => {
        set((state) => ({ episodesPlayed: state.episodesPlayed + 1 }));
      },

      dismissSignupPrompt: () => {
        set({ signupPromptDismissed: true });
      },

      shouldShowSignupPrompt: (isAuthenticated) => {
        const { episodesPlayed, signupPromptDismissed } = get();
        if (isAuthenticated) return false;
        if (signupPromptDismissed) return false;
        return episodesPlayed >= CONFIG.SIGNUP_PROMPT_EPISODE_THRESHOLD;
      },

      reset: () => {
        set({ episodesPlayed: 0, signupPromptDismissed: false });
      },
    }),
    {
      name: 'levelup-engagement',
    },
  ),
);
