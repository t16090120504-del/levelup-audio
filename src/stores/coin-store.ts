import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CoinTransaction, CoinTransactionType } from '@/types/coin';
import { CONFIG } from '@/constants/config';

interface CoinState {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: CoinTransaction[];
  lastBonusClaimDate: string | null;

  addCoins: (
    amount: number,
    type: CoinTransactionType,
    description: string,
    referenceId?: string,
  ) => void;
  /** Sync the local balance cache with the authoritative server balance (no transaction recorded). */
  syncBalance: (newBalance: number) => void;
  spendCoins: (amount: number, referenceId: string, description: string) => boolean;
  canClaimDailyBonus: () => boolean;
  claimDailyBonus: () => number;
  reset: () => void;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function isSameDay(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr === getTodayDateString();
}

export const useCoinStore = create<CoinState>()(
  persist(
    (set, get) => ({
      balance: CONFIG.INITIAL_COIN_BALANCE,
      totalEarned: 0,
      totalSpent: 0,
      transactions: [],
      lastBonusClaimDate: null,

      addCoins: (amount, type, description, referenceId) => {
        set((state) => {
          const newBalance = state.balance + amount;
          const transaction: CoinTransaction = {
            id: crypto.randomUUID(),
            type,
            amount,
            balanceAfter: newBalance,
            referenceId,
            description,
            createdAt: new Date().toISOString(),
          };
          return {
            balance: newBalance,
            totalEarned: state.totalEarned + (amount > 0 ? amount : 0),
            transactions: [transaction, ...state.transactions],
          };
        });
      },

      syncBalance: (newBalance) => {
        set({ balance: newBalance });
      },

      spendCoins: (amount, referenceId, description) => {
        if (get().balance < amount) {
          return false;
        }
        set((state) => {
          const newBalance = state.balance - amount;
          const transaction: CoinTransaction = {
            id: crypto.randomUUID(),
            type: 'spend',
            amount: -amount,
            balanceAfter: newBalance,
            referenceId,
            description,
            createdAt: new Date().toISOString(),
          };
          return {
            balance: newBalance,
            totalSpent: state.totalSpent + amount,
            transactions: [transaction, ...state.transactions],
          };
        });
        return true;
      },

      canClaimDailyBonus: () => {
        return !isSameDay(get().lastBonusClaimDate);
      },

      claimDailyBonus: () => {
        if (isSameDay(get().lastBonusClaimDate)) {
          return 0;
        }
        get().addCoins(
          CONFIG.DAILY_BONUS_COINS,
          'bonus',
          'Daily bonus reward',
        );
        set({ lastBonusClaimDate: getTodayDateString() });
        return CONFIG.DAILY_BONUS_COINS;
      },

      reset: () => {
        set({
          balance: CONFIG.INITIAL_COIN_BALANCE,
          totalEarned: 0,
          totalSpent: 0,
          transactions: [],
          lastBonusClaimDate: null,
        });
      },
    }),
    {
      name: 'levelup-coins',
    },
  ),
);
