import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { SUBSCRIPTION_PLANS } from '@/constants/subscription';
import type { SubscriptionPlan } from '@/types';

export interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe?: (planId: 'monthly' | 'yearly') => void;
}

// Monthly first, then yearly — matches the typical paywall layout.
const ORDERED_PLANS = [...SUBSCRIPTION_PLANS].sort((a, b) =>
  a.period === 'monthly' ? -1 : b.period === 'monthly' ? 1 : 0,
);

/**
 * Full-screen paywall modal presenting the monthly and yearly subscription
 * plans side by side, plus a "Restore Purchases" link at the bottom.
 */
export function Paywall({ isOpen, onClose, onSubscribe }: PaywallProps) {
  const handleSubscribe = (plan: SubscriptionPlan) => {
    onSubscribe?.(plan.period);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/40 bg-bg-elevated"
          >
            <Crown size={26} className="text-gold-bright" />
          </motion.div>
          <h2 className="mt-3 font-display text-xl font-bold text-gold-bright">
            Unlock Unlimited Listening
          </h2>
          <p className="mt-1 max-w-md text-xs text-text-secondary">
            Subscribe to unlock every episode, enjoy ad-free listening, and never spend coins again.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ORDERED_PLANS.map((plan) => (
            <SubscriptionCard key={plan.id} plan={plan} onSubscribe={handleSubscribe} />
          ))}
        </div>

        {/* Restore purchases */}
        <div className="pt-1 text-center">
          <button
            type="button"
            className="text-xs text-text-muted underline-offset-2 transition-colors hover:text-gold-bright hover:underline"
          >
            Restore Purchases
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default Paywall;
