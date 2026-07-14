import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Sparkles } from 'lucide-react';
import type { CoinPack } from '@/types';
import { COIN_PACKS } from '@/constants/coin-packs';
import { SUBSCRIPTION_PLANS } from '@/constants/subscription';
import { useCoinStore } from '@/stores/coin-store';
import { useToastStore } from '@/stores/toast-store';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { formatCoinAmount } from '@/lib/format';
import { CoinBalanceBadge } from '@/components/coin/CoinBalanceBadge';
import { CoinPackCard } from '@/components/coin/CoinPackCard';
import { CoinPurchaseModal } from '@/components/coin/CoinPurchaseModal';
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { Paywall } from '@/components/subscription/Paywall';
import { Card } from '@/components/ui/Card';

export default function StorePage() {
  const navigate = useNavigate();
  const balance = useCoinStore((s) => s.balance);
  const addToast = useToastStore((s) => s.addToast);

  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const handlePurchaseClick = useCallback((pack: CoinPack) => {
    setSelectedPack(pack);
    setIsPurchaseModalOpen(true);
  }, []);

  const handlePurchaseSuccess = useCallback((pack: CoinPack) => {
    addToast({
      type: 'success',
      title: 'Purchase Successful',
      message: `${formatCoinAmount(pack.coins)} coins have been added to your balance.`,
    });
  }, [addToast]);

  const handlePurchaseError = useCallback((_pack: CoinPack) => {
    addToast({
      type: 'error',
      title: 'Purchase Failed',
      message: 'Something went wrong while processing your payment. Please try again.',
    });
  }, [addToast]);

  const handleSubscribeClick = useCallback(() => {
    setIsPaywallOpen(true);
  }, []);

  const handleSubscribe = useCallback(
    async (_planId: 'monthly' | 'yearly') => {
      // In a real app, this would call apiClient.payment.subscribe(planId)
      // For now we simulate success and show a toast
      setIsPaywallOpen(false);
      addToast({
        type: 'success',
        title: 'Subscription Activated',
        message: 'You now have unlimited access to all premium content!',
        duration: 5000,
      });
    },
    [addToast],
  );

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gold-bright">Store</h1>
        <CoinBalanceBadge onClick={() => navigate(ROUTES.STORE)} />
      </div>

      {/* Coin Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card glow className="relative overflow-hidden border-gold/30 p-6">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-bg-deepest/50">
              <Wallet size={28} className="text-gold-bright" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">
                Your Coin Balance
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-gold-bright">
                {formatCoinAmount(balance)}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Get more coins to unlock premium episodes
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Coin Packs */}
      <section>
        <h2 className="mb-4 font-display text-xl text-gold-bright">Coin Packs</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {COIN_PACKS.map((pack, index) => (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <CoinPackCard pack={pack} onPurchase={handlePurchaseClick} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Subscription Section */}
      <section>
        <h2 className="mb-4 font-display text-xl text-gold-bright">Subscriptions</h2>
        <div className="space-y-4">
          <SubscriptionBanner onSubscribe={handleSubscribeClick} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SUBSCRIPTION_PLANS.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
              >
                <SubscriptionCard plan={plan} onSubscribe={handleSubscribeClick} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Bonus teaser (optional visual polish) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-lg border border-gold/20 bg-gradient-to-r from-gold/5 to-transparent p-4"
      >
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="text-gold-bright" />
          <p className="text-sm text-text-secondary">
            Come back every day to claim your free daily bonus coins!
          </p>
        </div>
      </motion.div>

      {/* Modals */}
      <CoinPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        pack={selectedPack}
        onSuccess={handlePurchaseSuccess}
        onError={handlePurchaseError}
      />

      <Paywall
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onSubscribe={handleSubscribe}
      />
    </div>
  );
}
