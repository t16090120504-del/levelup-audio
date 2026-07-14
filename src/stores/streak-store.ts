import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CONFIG } from '@/constants/config';
import { supabase } from '@/services/supabase-client';
import { useCoinStore } from '@/stores/coin-store';
import { useToastStore } from '@/stores/toast-store';

/**
 * Milestone day thresholds that award bonus coins. Keeping this as data
 * (rather than switch/case) makes it easy to extend.
 */
const STREAK_MILESTONES: ReadonlyArray<{ day: number; coins: number; label: string }> = [
  { day: 7, coins: CONFIG.STREAK_BONUS_7_DAY, label: '7-Day Streak' },
  { day: 30, coins: CONFIG.STREAK_BONUS_30_DAY, label: '30-Day Streak' },
];

interface StreakState {
  /** Current consecutive-day streak. */
  loginStreak: number;
  /** Highest streak ever reached (for display/bragging rights). */
  bestStreak: number;
  /** UTC date string (YYYY-MM-DD) of the last day the streak was updated. */
  lastActiveDate: string | null;
  /** Days for which a milestone bonus has already been paid (prevents double-pay). */
  awardedMilestones: number[];
  /** Coins awarded by the most recent milestone (for celebratory UI), if any. */
  lastMilestoneBonus: { day: number; coins: number } | null;

  /** Sync streak from the server (if authenticated) then update for today. */
  initStreak: () => Promise<void>;
  /** Compute and persist today's streak. Safe to call multiple times per day. */
  updateStreak: () => void;
  reset: () => void;
}

/** Today's UTC date as YYYY-MM-DD (matches the coin store's day boundary). */
function getTodayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

/** Yesterday's UTC date as YYYY-MM-DD. */
function getYesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Fetch the current authenticated user's id (mirrors the pattern used by
 * the other Supabase API modules). Returns null when not logged in.
 */
async function getUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Pull the server-side streak into local state when the user is
 * authenticated. Returns the authoritative values to use.
 */
async function syncFromServer(): Promise<{ streak: number; lastActive: string | null } | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('login_streak, last_active_date')
      .eq('id', userId)
      .single();

    if (error) return null;
    return {
      streak: (data?.login_streak as number) ?? 0,
      lastActive: (data?.last_active_date as string) ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Push the computed streak back to the profiles table. Fire-and-forget;
 * failures do not affect the local streak.
 */
async function syncToServer(streak: number, lastActive: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  try {
    await supabase
      .from('profiles')
      .update({ login_streak: streak, last_active_date: lastActive })
      .eq('id', userId);
  } catch {
    // Ignore — local state is already updated.
  }
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      loginStreak: 0,
      bestStreak: 0,
      lastActiveDate: null,
      awardedMilestones: [],
      lastMilestoneBonus: null,

      initStreak: async () => {
        // Prefer server values when authenticated so the streak is
        // consistent across devices/browsers.
        const server = await syncFromServer();
        if (server) {
          set({
            loginStreak: server.streak,
            lastActiveDate: server.lastActive,
            bestStreak: Math.max(get().bestStreak, server.streak),
          });
        }
        get().updateStreak();
      },

      updateStreak: () => {
        const today = getTodayUtc();
        const yesterday = getYesterdayUtc();
        const { lastActiveDate, loginStreak, bestStreak, awardedMilestones } = get();

        // Already counted today — nothing to do.
        if (lastActiveDate === today) return;

        let newStreak: number;
        if (lastActiveDate === yesterday) {
          newStreak = loginStreak + 1;
        } else {
          // Streak broken (or first ever visit).
          newStreak = 1;
        }

        const newBest = Math.max(bestStreak, newStreak);
        const newAwarded = [...awardedMilestones];

        // Check for milestone bonuses.
        for (const milestone of STREAK_MILESTONES) {
          if (newStreak === milestone.day && !awardedMilestones.includes(milestone.day)) {
            useCoinStore.getState().addCoins(
              milestone.coins,
              'bonus',
              `${milestone.label} reward`,
            );
            newAwarded.push(milestone.day);
            set({ lastMilestoneBonus: { day: milestone.day, coins: milestone.coins } });
            // Celebrate with a toast.
            useToastStore.getState().addToast({
              type: 'success',
              title: `${milestone.label}!`,
              message: `You earned +${milestone.coins} bonus coins. Keep it up!`,
              duration: 5000,
            });
          }
        }

        set({
          loginStreak: newStreak,
          bestStreak: newBest,
          lastActiveDate: today,
          awardedMilestones: newAwarded,
        });

        // Persist to the server (non-blocking).
        void syncToServer(newStreak, today);
      },

      reset: () => {
        set({
          loginStreak: 0,
          bestStreak: 0,
          lastActiveDate: null,
          awardedMilestones: [],
          lastMilestoneBonus: null,
        });
      },
    }),
    {
      name: 'levelup-streak',
    },
  ),
);
