/**
 * Payment API interface.
 *
 * Handles in-app purchases (coin packs) and subscription management.
 */
export interface PaymentApi {
  /** Purchase a coin pack. Returns the result of the transaction. */
  purchaseCoinPack(packId: string): Promise<{
    success: boolean;
    coinsAdded: number;
    newBalance: number;
  }>;

  /** Subscribe to a monthly or yearly plan. */
  subscribe(
    planId: 'monthly' | 'yearly',
  ): Promise<{ success: boolean; expiresAt: string }>;

  /** Check the current subscription status. */
  getSubscriptionStatus(): Promise<{
    isActive: boolean;
    expiresAt?: string;
  }>;
}
