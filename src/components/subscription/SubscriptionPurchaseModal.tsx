import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, ExternalLink, XCircle } from 'lucide-react';
import type { SubscriptionPlan } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/lib/format';
import { createCreemCheckout, buildSubscriptionSuccessUrl } from '@/services/creem-api';
import { useAuthStore } from '@/stores/auth-store';

export interface SubscriptionPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
  onSuccess?: (plan: SubscriptionPlan) => void;
  onError?: (plan: SubscriptionPlan) => void;
}

type Phase = 'confirm' | 'processing' | 'error';

/**
 * Subscription purchase flow with Creem integration:
 *
 * 1. **confirm**   - plan summary with "Start Free Trial" / "Cancel".
 * 2. **processing** - spinner while creating the Creem checkout session.
 * 3. **error**      - error message with retry / close options.
 *
 * On confirm, the modal calls the checkout proxy to create a Creem checkout
 * session and opens the checkout URL in a new browser tab. Subscription status
 * is updated when the user returns via the success page.
 */
export function SubscriptionPurchaseModal({
  isOpen,
  onClose,
  plan,
  onSuccess,
  onError,
}: SubscriptionPurchaseModalProps) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [errorMsg, setErrorMsg] = useState('');
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isOpen) {
      setPhase('confirm');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!plan?.creemProductId) {
      onError?.(plan!);
      setErrorMsg('This plan does not have a payment link configured.');
      setPhase('error');
      return;
    }

    setPhase('processing');
    setErrorMsg('');

    try {
      const successUrl = buildSubscriptionSuccessUrl(
        window.location.origin,
        plan.creemProductId,
        plan.id,
      );

      // Pass user_id in metadata so the webhook can activate the
      // subscription for the correct user server-side.
      const { checkoutUrl } = await createCreemCheckout({
        productId: plan.creemProductId,
        successUrl,
        metadata: {
          user_id: user?.id ?? '',
          type: 'subscription',
          plan_id: plan.id,
          period: plan.period,
          product_id: plan.creemProductId,
        },
      });

      // Open the Creem checkout in a new tab
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');

      // Close the modal - subscription will be activated on success page
      onSuccess?.(plan);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout session';
      setErrorMsg(message);
      onError?.(plan!);
      setPhase('error');
    }
  };

  const handleDone = () => {
    onClose();
  };

  const handleRetry = () => {
    handleConfirm();
  };

  const closeOnOverlay = phase === 'confirm' || phase === 'error';

  const periodLabel = plan?.period === 'monthly' ? '/mo' : '/yr';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" closeOnOverlay={closeOnOverlay}>
      {plan && (
        <AnimatePresence mode="wait">
          {/* Confirm */}
          {phase === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="text-center">
                <h2 className="font-display text-lg text-gold-bright">Confirm Subscription</h2>
                <p className="mt-1 text-xs text-text-secondary">
                  Start your free trial. Cancel anytime.
                </p>
              </div>

              <div className="flex flex-col items-center rounded-lg border border-bg-hover bg-bg-elevated p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/40 bg-bg-deepest/50">
                  <Crown size={24} className="text-gold-bright" />
                </div>
                <span className="mt-2 font-display text-lg font-bold text-gold-bright">
                  {plan.name}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-text-muted">
                  Subscription
                </span>
                <span className="mt-2 font-display text-2xl text-text-primary">
                  {formatPrice(plan.price)}
                  <span className="ml-0.5 text-xs text-text-muted">{periodLabel}</span>
                </span>
                <span className="mt-1 text-[11px] text-status-free font-medium">
                  {plan.trialDays}-day free trial
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" fullWidth onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleConfirm}
                  rightIcon={<ExternalLink size={16} />}
                >
                  Start Free Trial
                </Button>
              </div>
            </motion.div>
          )}

          {/* Processing */}
          {phase === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-8"
            >
              <Spinner size="lg" />
              <p className="font-display text-sm text-gold-bright">Creating checkout...</p>
              <p className="text-xs text-text-muted">Opening subscription page</p>
            </motion.div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-3 py-6"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <XCircle size={32} className="text-red-500" />
              </div>
              <h2 className="font-display text-lg text-gold-bright">Checkout Failed</h2>
              <p className="max-w-[220px] text-center text-xs text-text-secondary">
                {errorMsg || 'Something went wrong while creating the checkout. Please try again.'}
              </p>
              <div className="flex w-full gap-2">
                <Button variant="secondary" fullWidth onClick={handleDone}>
                  Close
                </Button>
                <Button variant="primary" fullWidth onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Modal>
  );
}

export default SubscriptionPurchaseModal;
