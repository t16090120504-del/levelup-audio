/**
 * Global application configuration constants.
 */
export const CONFIG = {
  /** When true, the app uses mock data instead of a real backend. */
  USE_MOCK: false,
  /** Default page size for paginated API requests. */
  PAGE_SIZE: 20,
  /** Coin cost to unlock a single non-free episode. */
  EPISODE_UNLOCK_COST: 10,
  /** Starting coin balance for new users. */
  INITIAL_COIN_BALANCE: 100,
  /** Coins awarded for the daily login bonus. */
  DAILY_BONUS_COINS: 20,
  /** Supabase project URL (from environment variables). */
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  /** Supabase anon public key (from environment variables). */
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const;
