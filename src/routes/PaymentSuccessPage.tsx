import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useCoinStore } from '@/stores/coin-store';
import { apiClient } from '@/services/api/client';
import { formatCoinAmount } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/coin/CoinIcon';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

type Status = 'processing' | 'success' | 'timeout';

/** How often to poll the Supabase balance while waiting for the webhook. */
const POLL_INTERVAL_MS = 2500;
/** Give up after this long and ask the user to contact support. */
const TIMEOUT_MS = 30000;

/**
 * Payment success page.
 *
 * SECURITY: This page no longer credits coins from URL parameters — that was
 * trivially exploitable (anyone could visit /payment/success?coins=999999).
 *
 * New flow:
 *   1. The Creem webhook (Cloudflare Worker /webhook or Netlify function)
 *      verifies the payment signature and credits coins server-side.
 *   2. This page polls the user's Supabase coin balance until it increases
 *      (the webhook has processed the payment), with a 30-second timeout.
 *   3. On success it syncs the local cache and shows the new balance.
 *   4. On timeout it shows a "contact support" message (the payment still
 *      went through; the webhook may just be delayed).
 *
 * For subscription purchases (type=subscription) there are no coins to poll,
 * so the page simply shows a success message after a brief delay.
 */
export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const syncBalance = useCoinStore((s) => s.syncBalance);
  const storeBalance = useCoinStore((s) => s.balance);

  const coins = useMemo(() => {
    const raw = searchParams.get('coins');
    return raw ? parseInt(raw, 10) : 0;
  }, [searchParams]);

  const isSubscription = searchParams.get('type') === 'subscription';

  const [status, setStatus] = useState<Status>('processing');
  const [newBalance, setNewBalance] = useState(0);
  const initialBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    // --- Subscription purchase ---------------------------------------
    // No coins change hands; the webhook activates the subscription. Show a
    // brief processing state then success.
    if (isSubscription) {
      const timer = setTimeout(() => setStatus('success'), 2000);
      return () => clearTimeout(timer);
    }

    // --- Coin-pack purchase ------------------------------------------
    // Poll the authoritative Supabase balance until the webhook credits the
    // coins (balance increases) or the timeout elapses.
    let cancelled = false;
    const startTime = Date.now();

    const poll = async () => {
      if (cancelled) return;

      try {
        const balance = await apiClient.coin.getBalance();
        if (cancelled) return;

        // Capture the baseline on the first successful read.
        if (initialBalanceRef.current === null) {
          initialBalanceRef.current = balance;
        }

        // The webhook credited coins once the server balance exceeds the
        // value captured when the page first loaded.
        if (balance > (initialBalanceRef.current ?? 0)) {
          setNewBalance(balance);
          syncBalance(balance);
          setStatus('success');
          return;
        }
      } catch {
        // Transient network/auth errors — keep polling.
      }

      if (Date.now() - startTime >= TIMEOUT_MS) {
        if (!cancelled) setStatus('timeout');
        return;
      }

      if (!cancelled) {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscription]);

  const handleContinue = () => {
    navigate(ROUTES.STORE);
  };

  // ---- Processing state ----
  if (status === 'processing') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div className="flex justify-center">
            <Spinner size="lg" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-gold-bright">
              Processing Payment...
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {isSubscription
                ? 'Activating your subscription. This only takes a moment.'
                : 'Your coins will be added to your account shortly.'}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- Timeout state ----
  if (status === 'timeout') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
              className="relative"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 ring-2 ring-amber-500/30">
                <AlertTriangle size={40} className="text-amber-500" strokeWidth={2.5} />
              </div>
            </motion.div>
          </div>

          <div className="text-center">
            <h1 className="font-display text-2xl text-gold-bright">
              Still Verifying Payment
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Your payment was received but we could not confirm your coin
              balance yet. If your coins do not appear within a few minutes,
              please contact support with your order details.
            </p>
          </div>

          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleContinue}
            rightIcon={<ArrowRight size={18} />}
          >
            Continue to Store
          </Button>
        </motion.div>
      </div>
    );
  }

  // ---- Success state ----
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Success icon */}
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
            className="relative"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-status-free/10 ring-2 ring-status-free/30">
              <Check size={40} className="text-status-free" strokeWidth={2.5} />
            </div>
          </motion.div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="font-display text-2xl text-gold-bright">
            {isSubscription ? 'Subscription Activated!' : 'Payment Successful!'}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {isSubscription
              ? 'Your subscription is now active. Enjoy unlimited access!'
              : 'Your coins have been added to your balance.'}
          </p>
        </div>

        {/* Coin amount card (only for coin purchases) */}
        {!isSubscription && coins > 0 && (
          <Card glow className="border-gold/30 p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <motion.div
                initial={{ y: -30, opacity: 0, scale: 0.3 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.4 }}
              >
                <CoinIcon size={48} spinning />
              </motion.div>

              <div className="mt-2">
                <span className="font-display text-3xl font-bold text-gold-bright">
                  +{formatCoinAmount(coins)}
                </span>
                <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
                  Coins Added
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-bg-hover pt-3">
              <span className="text-[11px] uppercase tracking-wide text-text-muted">
                New Balance
              </span>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <CoinIcon size={16} />
                <span className="font-mono text-xl font-bold text-gold-bright">
                  {formatCoinAmount(newBalance || storeBalance)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Continue button */}
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={handleContinue}
          rightIcon={<ArrowRight size={18} />}
        >
          Continue to Store
        </Button>
      </motion.div>
    </div>
  );
}
