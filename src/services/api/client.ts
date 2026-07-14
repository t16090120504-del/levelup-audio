import type { CoinApi } from './coin-api';
import type { ContentApi } from './content-api';
import type { PaymentApi } from './payment-api';
import type { UserApi } from './user-api';
import type { CoinTransaction, ListeningProgress } from '@/types';
import { CONFIG } from '@/constants/config';
import { mockClient } from '@/services/mock/mock-client';
import { coinPacks } from '@/services/mock/data/coin-packs';
import { mockDelay } from '@/services/mock/mock-delay';
import { supabaseContentApi } from '@/services/supabase/supabase-content-api';
import { supabaseCoinApi } from '@/services/supabase/supabase-coin-api';
import { supabaseUserApi } from '@/services/supabase/supabase-user-api';

// ---------------------------------------------------------------------------
// Mock state (module-level, persists for the app lifetime)
// ---------------------------------------------------------------------------

let coinBalance = CONFIG.INITIAL_COIN_BALANCE;
let transactions: CoinTransaction[] = [
  {
    id: 'tx-bonus-welcome',
    type: 'bonus',
    amount: CONFIG.INITIAL_COIN_BALANCE,
    balanceAfter: CONFIG.INITIAL_COIN_BALANCE,
    description: 'Welcome bonus',
    createdAt: new Date().toISOString(),
  },
];
let dailyBonusClaimed = false;

const favorites = new Set<string>();
const listeningProgress: Record<string, ListeningProgress> = {};
const downloadedEpisodes = new Set<string>();

let subscriptionActive = false;
let subscriptionExpiresAt: string | undefined;

// ---------------------------------------------------------------------------
// Mock Coin API
// ---------------------------------------------------------------------------

const mockCoinApi: CoinApi = {
  async getBalance(): Promise<number> {
    await mockDelay();
    return coinBalance;
  },

  async getTransactions(): Promise<CoinTransaction[]> {
    await mockDelay();
    return [...transactions].reverse();
  },

  async unlockEpisode(
    episodeId: string,
    cost: number,
  ): Promise<{ success: boolean; newBalance: number }> {
    await mockDelay();
    if (coinBalance >= cost) {
      coinBalance -= cost;
      const tx: CoinTransaction = {
        id: `tx-spend-${Date.now()}`,
        type: 'spend',
        amount: -cost,
        balanceAfter: coinBalance,
        referenceId: episodeId,
        description: `Unlocked episode ${episodeId}`,
        createdAt: new Date().toISOString(),
      };
      transactions.push(tx);
      return { success: true, newBalance: coinBalance };
    }
    return { success: false, newBalance: coinBalance };
  },

  async claimDailyBonus(): Promise<{
    success: boolean;
    amount: number;
    newBalance: number;
  }> {
    await mockDelay();
    if (dailyBonusClaimed) {
      return { success: false, amount: 0, newBalance: coinBalance };
    }
    const bonus = CONFIG.DAILY_BONUS_COINS;
    coinBalance += bonus;
    dailyBonusClaimed = true;
    const tx: CoinTransaction = {
      id: `tx-bonus-daily-${Date.now()}`,
      type: 'bonus',
      amount: bonus,
      balanceAfter: coinBalance,
      description: 'Daily login bonus',
      createdAt: new Date().toISOString(),
    };
    transactions.push(tx);
    return { success: true, amount: bonus, newBalance: coinBalance };
  },
};

// ---------------------------------------------------------------------------
// Mock User API
// ---------------------------------------------------------------------------

const mockUserApi: UserApi = {
  async getFavorites(): Promise<string[]> {
    await mockDelay();
    return [...favorites];
  },

  async toggleFavorite(seriesId: string): Promise<boolean> {
    await mockDelay();
    if (favorites.has(seriesId)) {
      favorites.delete(seriesId);
      return false;
    }
    favorites.add(seriesId);
    return true;
  },

  async getListeningProgress(): Promise<Record<string, ListeningProgress>> {
    await mockDelay();
    return { ...listeningProgress };
  },

  async saveProgress(
    episodeId: string,
    position: number,
    completed: boolean,
  ): Promise<void> {
    await mockDelay();
    listeningProgress[episodeId] = {
      episodeId,
      positionSeconds: position,
      completed,
      lastPlayedAt: new Date().toISOString(),
    };
  },

  async getDownloadedEpisodes(): Promise<string[]> {
    await mockDelay();
    return [...downloadedEpisodes];
  },
};

// ---------------------------------------------------------------------------
// Mock Payment API
// ---------------------------------------------------------------------------

const mockPaymentApi: PaymentApi = {
  async purchaseCoinPack(packId: string): Promise<{
    success: boolean;
    coinsAdded: number;
    newBalance: number;
  }> {
    await mockDelay();
    const pack = coinPacks.find((p) => p.id === packId);
    if (!pack) {
      return { success: false, coinsAdded: 0, newBalance: coinBalance };
    }
    coinBalance += pack.coins;
    const tx: CoinTransaction = {
      id: `tx-purchase-${Date.now()}`,
      type: 'purchase',
      amount: pack.coins,
      balanceAfter: coinBalance,
      referenceId: packId,
      description: `Purchased ${pack.name}`,
      createdAt: new Date().toISOString(),
    };
    transactions.push(tx);
    return { success: true, coinsAdded: pack.coins, newBalance: coinBalance };
  },

  async subscribe(
    planId: 'monthly' | 'yearly',
  ): Promise<{ success: boolean; expiresAt: string }> {
    await mockDelay();
    const days = planId === 'monthly' ? 30 : 365;
    const expiresAt = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000,
    ).toISOString();
    subscriptionActive = true;
    subscriptionExpiresAt = expiresAt;
    return { success: true, expiresAt };
  },

  async getSubscriptionStatus(): Promise<{
    isActive: boolean;
    expiresAt?: string;
  }> {
    await mockDelay();
    return { isActive: subscriptionActive, expiresAt: subscriptionExpiresAt };
  },
};

// ---------------------------------------------------------------------------
// Unified API client
// ---------------------------------------------------------------------------

/**
 * Shape of the unified API client consumed by the rest of the app.
 */
export interface ApiClient {
  content: ContentApi;
  coin: CoinApi;
  user: UserApi;
  payment: PaymentApi;
}

/**
 * Creates the appropriate API client based on `CONFIG.USE_MOCK`.
 *
 * When `USE_MOCK` is `true` (the current default), all modules delegate to
 * mock implementations. To switch to a real backend, set `USE_MOCK` to
 * `false` and replace the mock branches below with real API clients.
 */
function createApiClient(): ApiClient {
  if (CONFIG.USE_MOCK) {
    return {
      content: mockClient as ContentApi,
      coin: mockCoinApi,
      user: mockUserApi,
      payment: mockPaymentApi,
    };
  }

  // --- Real API implementations (Supabase) ---
  // Payment API still uses mock implementation (no Supabase payment tables yet).
  return {
    content: supabaseContentApi,
    coin: supabaseCoinApi,
    user: supabaseUserApi,
    payment: mockPaymentApi,
  };
}

/**
 * Unified API client.
 *
 * Usage:
 * ```ts
 * import { apiClient } from '@/services/api/client';
 *
 * const genres = await apiClient.content.getGenres();
 * const balance = await apiClient.coin.getBalance();
 * ```
 */
export const apiClient: ApiClient = createApiClient();
