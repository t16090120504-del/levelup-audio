import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useCoinStore } from '@/stores/coin-store';
import { formatCoinAmount } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/coin/CoinIcon';
import { Card } from '@/components/ui/Card';

/**
 * Payment success page.
 *
 * Displayed when the user returns from the Creem checkout after a successful
 * payment. Reads productId and coins from query params and credits the
 * coin store balance accordingly.
 */
export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addCoins = useCoinStore((s) => s.addCoins);
  const balance = useCoinStore((s) => s.balance);

  const coins = useMemo(() => {
    const raw = searchParams.get('coins');
    return raw ? parseInt(raw, 10) : 0;
  }, [searchParams]);

  const productId = searchParams.get('productId') ?? '';

  useEffect(() => {
    if (coins > 0) {
      addCoins(coins, 'purchase', `Purchased coin pack (${productId})`, productId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = () => {
    navigate(ROUTES.STORE);
  };

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
            Payment Successful!
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Your coins have been added to your balance.
          </p>
        </div>

        {/* Coin amount card */}
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
                {formatCoinAmount(balance)}
              </span>
            </div>
          </div>
        </Card>

        {/* Continue button */}
        <Button variant="primary" fullWidth size="lg" onClick={handleContinue} rightIcon={<ArrowRight size={18} />}>
          Continue to Store
        </Button>
      </motion.div>
    </div>
  );
}
