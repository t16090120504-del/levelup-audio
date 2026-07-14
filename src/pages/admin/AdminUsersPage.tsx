import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Users as UsersIcon,
  Coins,
  Plus,
  Minus,
  CalendarDays,
} from 'lucide-react';
import { adminSupabase } from '@/services/supabase/admin-client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField, TextArea, FieldWrapper } from '@/components/admin/AdminInputs';
import { formatCoinAmount, formatDate } from '@/lib/format';

interface ProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface CoinBalanceRow {
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface AdminUser extends ProfileRow {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

/**
 * Admin users management page. Lists all user profiles (joined with their coin
 * balance) and supports manual coin adjustments (add / remove) which update the
 * `coin_balances` table and record a `coin_transactions` entry.
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Coin adjustment modal state
  const [adjustUser, setAdjustUser] = useState<AdminUser | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch profiles and coin balances in parallel, then merge by user_id.
      const [profilesRes, balancesRes] = await Promise.all([
        adminSupabase
          .from('profiles')
          .select('id, email, name, avatar_url, created_at')
          .order('created_at', { ascending: false }),
        adminSupabase
          .from('coin_balances')
          .select('user_id, balance, total_earned, total_spent'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (balancesRes.error) throw balancesRes.error;

      const balanceMap = new Map<string, CoinBalanceRow>();
      for (const row of (balancesRes.data ?? []) as CoinBalanceRow[]) {
        balanceMap.set(row.user_id, row);
      }

      const merged: AdminUser[] = ((profilesRes.data ?? []) as ProfileRow[]).map(
        (profile) => {
          const bal = balanceMap.get(profile.id);
          return {
            ...profile,
            balance: bal?.balance ?? 0,
            totalEarned: bal?.total_earned ?? 0,
            totalSpent: bal?.total_spent ?? 0,
          };
        },
      );

      setUsers(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openAdjustModal = (user: AdminUser, mode: 'add' | 'remove') => {
    setAdjustUser(user);
    setAdjustMode(mode);
    setAdjustAmount('');
    setAdjustReason('');
    setAdjustError(null);
  };

  const handleAdjustSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjustUser) return;
    setAdjustError(null);

    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setAdjustError('Please enter a positive amount.');
      return;
    }
    if (!Number.isInteger(amount)) {
      setAdjustError('Amount must be a whole number.');
      return;
    }

    setAdjusting(true);
    try {
      const currentBalance = adjustUser.balance;
      const isAdd = adjustMode === 'add';
      const newBalance = isAdd
        ? currentBalance + amount
        : Math.max(0, currentBalance - amount);
      const actualDelta = newBalance - currentBalance; // could be clamped

      // 1. Upsert the coin_balances row.
      const { data: existingBal } = await adminSupabase
        .from('coin_balances')
        .select('user_id')
        .eq('user_id', adjustUser.id)
        .maybeSingle();

      if (existingBal) {
        const { error: updateError } = await adminSupabase
          .from('coin_balances')
          .update({
            balance: newBalance,
            total_earned: isAdd
              ? (adjustUser.totalEarned ?? 0) + amount
              : adjustUser.totalEarned,
            total_spent: !isAdd
              ? (adjustUser.totalSpent ?? 0) + Math.abs(actualDelta)
              : adjustUser.totalSpent,
          })
          .eq('user_id', adjustUser.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await adminSupabase
          .from('coin_balances')
          .insert({
            user_id: adjustUser.id,
            balance: newBalance,
            total_earned: isAdd ? amount : 0,
            total_spent: !isAdd ? Math.abs(actualDelta) : 0,
          });
        if (insertError) throw insertError;
      }

      // 2. Record the transaction.
      const { error: txError } = await adminSupabase
        .from('coin_transactions')
        .insert({
          user_id: adjustUser.id,
          type: isAdd ? 'bonus' : 'spend',
          amount: isAdd ? amount : -Math.abs(actualDelta),
          balance_after: newBalance,
          description:
            adjustReason.trim() ||
            `Admin ${isAdd ? 'granted' : 'deducted'} ${amount} coins`,
        });
      if (txError) throw txError;

      setAdjustUser(null);
      await loadUsers();
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : 'Failed to adjust coins.');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-gold-bright">Users</h1>
        <p className="mt-1 text-sm text-text-muted">
          View all users and manually adjust coin balances.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-sm text-status-warning">
          {error}
        </div>
      )}

      {/* Users table */}
      <div className="card-jrpg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-bg-hover text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 text-center font-semibold">Coin Balance</th>
                <th className="px-4 py-3 text-center font-semibold">Subscription</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-bg-hover/50">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton variant="text" className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-text-muted">
                      <UsersIcon size={32} className="opacity-50" />
                      <p>No users found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-bg-hover/50 transition-colors hover:bg-bg-elevated/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bg-hover bg-bg-elevated text-xs font-semibold text-gold-bright">
                          {(user.name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-text-primary">
                          {user.name ?? 'Unnamed'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {user.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-gold-bright">
                        <Coins size={14} />
                        {formatCoinAmount(user.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="default">Free</Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-text-muted" />
                        {formatDate(user.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Plus size={14} />}
                          onClick={() => openAdjustModal(user, 'add')}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Minus size={14} />}
                          onClick={() => openAdjustModal(user, 'remove')}
                          disabled={user.balance <= 0}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coin adjustment modal */}
      <Modal
        isOpen={adjustUser !== null}
        onClose={() => !adjusting && setAdjustUser(null)}
        title={adjustMode === 'add' ? 'Add Coins' : 'Remove Coins'}
        size="sm"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="rounded-lg border border-bg-hover bg-bg-elevated px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">
              User
            </p>
            <p className="mt-0.5 text-sm font-medium text-text-primary">
              {adjustUser?.name ?? 'Unnamed'}
            </p>
            <p className="text-xs text-text-secondary">{adjustUser?.email ?? '—'}</p>
            <div className="mt-2 flex items-center gap-1 border-t border-bg-hover pt-2 font-mono text-sm text-gold-bright">
              <Coins size={14} />
              Current balance: {formatCoinAmount(adjustUser?.balance ?? 0)}
            </div>
          </div>

          <TextField
            id="adjust-amount"
            label={`Amount to ${adjustMode === 'add' ? 'add' : 'remove'}`}
            type="number"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            placeholder="e.g. 50"
            min={1}
            step={1}
            required
            autoFocus
          />

          <TextArea
            id="adjust-reason"
            label="Reason (optional)"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="e.g. Customer support compensation"
          />

          {adjustMode === 'remove' && adjustUser && (
            <FieldWrapper label="Preview">
              <div className="rounded-lg border border-bg-hover bg-bg-elevated px-3 py-2 text-sm">
                <span className="text-text-secondary">New balance: </span>
                <span className="font-mono font-semibold text-gold-bright">
                  {formatCoinAmount(
                    Math.max(0, adjustUser.balance - (Number(adjustAmount) || 0)),
                  )}
                </span>
              </div>
            </FieldWrapper>
          )}
          {adjustMode === 'add' && adjustUser && (
            <FieldWrapper label="Preview">
              <div className="rounded-lg border border-bg-hover bg-bg-elevated px-3 py-2 text-sm">
                <span className="text-text-secondary">New balance: </span>
                <span className="font-mono font-semibold text-gold-bright">
                  {formatCoinAmount(adjustUser.balance + (Number(adjustAmount) || 0))}
                </span>
              </div>
            </FieldWrapper>
          )}

          {adjustError && (
            <p className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-sm text-status-warning">
              {adjustError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAdjustUser(null)}
              disabled={adjusting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={adjustMode === 'remove' ? 'danger' : 'primary'}
              loading={adjusting}
            >
              {adjustMode === 'add' ? 'Add Coins' : 'Remove Coins'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
