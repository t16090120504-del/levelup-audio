export interface CoinBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

export type CoinTransactionType = 'purchase' | 'spend' | 'bonus' | 'refund';

export interface CoinTransaction {
  id: string;
  type: CoinTransactionType;
  amount: number;
  balanceAfter: number;
  referenceId?: string;
  description: string;
  createdAt: string;
}

export interface CoinPack {
  id: string;
  name: string;
  price: number;
  coins: number;
  pricePerCoin: number;
  label?: string;
  popular?: boolean;
  bestValue?: boolean;
  /** Creem product ID for checkout integration */
  creemProductId?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: string[];
  trialDays: number;
  /** Creem product ID for checkout integration */
  creemProductId?: string;
}
