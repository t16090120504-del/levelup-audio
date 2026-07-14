import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  selectedGenres: string[];
  step: number;

  setStep: (step: number) => void;
  setSelectedGenres: (genres: string[]) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      selectedGenres: [],
      step: 0,

      setStep: (step) => {
        set({ step });
      },

      setSelectedGenres: (genres) => {
        set({ selectedGenres: genres });
      },

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
      },

      reset: () => {
        set({
          hasCompletedOnboarding: false,
          selectedGenres: [],
          step: 0,
        });
      },
    }),
    {
      name: 'levelup-onboarding',
    },
  ),
);
