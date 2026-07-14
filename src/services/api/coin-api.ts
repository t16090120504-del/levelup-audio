import type { CoinTransaction } from '@/types';

/**
 * Coin API interface.
 *
 * Handles the user's virtual coin balance, transaction history,
 * episode unlocking, and daily bonus claims.
 */
export interface CoinApi {
  /** Fetch the current coin balance. */
  getBalance(): Promise<number>;

  /** Fetch the transaction history (most recent first). */
  getTransactions(): Promise<CoinTransaction[]>;

  /** Attempt to unlock an episode by spending coins. */
  unlockEpisode(
    episodeId: string,
    cost: number,
  ): Promise<{ success: boolean; newBalance: number }>;

  /** Claim the daily login bonus. */
  claimDailyBonus(): Promise<{
    success: boolean;
    amount: number;
    newBalance: number;
  }>;
}
