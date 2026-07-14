import type { CoinApi } from '@/services/api/coin-api';
import type { CoinTransaction } from '@/types';
import { supabase } from '@/services/supabase-client';
import { mapRows } from '@/services/supabase/utils';

/**
 * Helper: get the current authenticated user's ID.
 * Returns `null` if no session is active.
 */
async function getUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Supabase-backed implementation of the CoinApi interface.
 *
 * All coin operations require an authenticated user (enforced by RLS).
 * When the user is not logged in, methods return default/error values.
 */
export const supabaseCoinApi: CoinApi = {
  async getBalance(): Promise<number> {
    const userId = await getUserId();
    if (!userId) return 0;

    const { data, error } = await supabase
      .from('coin_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no row exists yet, return 0
      if (error.code === 'PGRST116') return 0;
      throw error;
    }
    return data.balance ?? 0;
  },

  async getTransactions(): Promise<CoinTransaction[]> {
    const userId = await getUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return mapRows<CoinTransaction>(data ?? []);
  },

  async unlockEpisode(
    episodeId: string,
    cost: number,
  ): Promise<{ success: boolean; newBalance: number }> {
    const userId = await getUserId();
    if (!userId) return { success: false, newBalance: 0 };

    // Step 1: Check current balance
    const { data: balanceRow, error: balanceError } = await supabase
      .from('coin_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (balanceError) throw balanceError;
    const currentBalance = balanceRow?.balance ?? 0;

    if (currentBalance < cost) {
      return { success: false, newBalance: currentBalance };
    }

    const newBalance = currentBalance - cost;

    // Step 2: Deduct balance
    const { error: updateError } = await supabase
      .from('coin_balances')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Step 3: Record the unlock
    const { error: unlockError } = await supabase.from('unlocked_episodes').insert({
      user_id: userId,
      episode_id: episodeId,
    });

    if (unlockError) {
      // Rollback: restore balance
      await supabase
        .from('coin_balances')
        .update({ balance: currentBalance })
        .eq('user_id', userId);
      throw unlockError;
    }

    // Step 4: Record transaction
    const { error: txError } = await supabase.from('coin_transactions').insert({
      user_id: userId,
      type: 'spend',
      amount: -cost,
      balance_after: newBalance,
      reference_id: episodeId,
      description: `Unlocked episode ${episodeId}`,
    });

    if (txError) throw txError;

    return { success: true, newBalance };
  },

  async claimDailyBonus(): Promise<{
    success: boolean;
    amount: number;
    newBalance: number;
  }> {
    const userId = await getUserId();
    if (!userId) return { success: false, amount: 0, newBalance: 0 };

    // Check if already claimed today
    const today = new Date().toISOString().slice(0, 10);
    const { data: existingTx, error: checkError } = await supabase
      .from('coin_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'bonus')
      .gte('created_at', today)
      .limit(1);

    if (checkError) throw checkError;
    if (existingTx && existingTx.length > 0) {
      // Already claimed today
      const { data: bal } = await supabase
        .from('coin_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();
      return { success: false, amount: 0, newBalance: bal?.balance ?? 0 };
    }

    const bonusAmount = 20;

    // Upsert balance (create if not exists)
    const { data: currentBal, error: balError } = await supabase
      .from('coin_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (balError && balError.code !== 'PGRST116') throw balError;
    const currentBalance = currentBal?.balance ?? 0;
    const newBalance = currentBalance + bonusAmount;

    if (currentBal) {
      const { error: updateError } = await supabase
        .from('coin_balances')
        .update({ balance: newBalance })
        .eq('user_id', userId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('coin_balances')
        .insert({ user_id: userId, balance: newBalance });
      if (insertError) throw insertError;
    }

    // Record transaction
    const { error: txError } = await supabase.from('coin_transactions').insert({
      user_id: userId,
      type: 'bonus',
      amount: bonusAmount,
      balance_after: newBalance,
      description: 'Daily login bonus',
    });

    if (txError) throw txError;

    return { success: true, amount: bonusAmount, newBalance };
  },
};
